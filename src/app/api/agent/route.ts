export const dynamic = "force-dynamic";
import { NextResponse, type NextRequest } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { getGeminiClient } from "@/features/leads/server/geminiClient";
import { callGroq } from "@/features/leads/server/groqClient";
import { resolveModel } from "@/features/leads/server/modelSelection";
import {
  AGENT_RESPONSE_SCHEMA,
  AGENT_SYSTEM_INSTRUCTION,
  AGENT_SYSTEM_INSTRUCTION_FOR_GROQ,
} from "@/features/agent/server/agentSchema";
import type { AgentLeadContext } from "@/features/agent/types";
import { parseAgentPlan } from "@/features/agent/server/validateAgentPlan";
import { getOrCreateSession, addMessageToSession, getTeamKnowledge } from "@/features/agent/server/sessionService";
import { getWorkspaceId } from "@/lib/workspace.server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

function buildDynamicSystemInstruction(baseInstruction: string, teamKnowledge?: string, sessionSummary?: string): string {
  const parts = [baseInstruction];
  if (teamKnowledge) {
    parts.push(`\n\nTEAM KNOWLEDGE:\n${teamKnowledge}`);
  }
  if (sessionSummary) {
    parts.push(`\n\nPREVIOUS CONVERSATION SUMMARY:\n${sessionSummary}`);
  }
  return parts.join("\n");
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.prompt !== "string" || !body.prompt.trim()) {
    return NextResponse.json({ error: "A prompt is required." }, { status: 400 });
  }
  if (body.prompt.length > 12_000 || (body.threadId !== undefined && typeof body.threadId !== "string")) {
    return NextResponse.json({ error: "Please provide a valid request under 12,000 characters." }, { status: 400 });
  }

  const threadId = body.threadId as string | undefined;
  const teamId = getWorkspaceId(request);
  const { userId } = getAuth(request);
  if (!teamId || !userId) {
    return NextResponse.json({ error: "An active organization is required." }, { status: 400 });
  }

  const { data: leadRows, error: leadsError } = await getSupabaseAdmin()
    .from("leads")
    .select("id, name, company_name, email, phone, notes, phase, marketFitThesis, momTestQuestions, linkedinUrl, companyWebsite")
    .eq("teamId", teamId);
  if (leadsError) {
    console.error("Failed to load agent lead context:", leadsError);
    return NextResponse.json({ error: "Failed to load workspace leads." }, { status: 500 });
  }
  const leads = (leadRows ?? []) as AgentLeadContext[];
  const [{ data: companyRows }, { data: activityRows }] = await Promise.all([
    getSupabaseAdmin().from("companies").select("id,name,industry,notes,phase").eq("teamId", teamId),
    getSupabaseAdmin().from("crm_activities").select("leadId,companyId,type,outcome,summary,occurredAt,nextStep,followUpAt").eq("teamId", teamId).is("deletedAt", null).order("occurredAt", { ascending: false }).limit(100),
  ]);

  let session;
  let teamKnowledge;
  try {
    const sessionResult = await getOrCreateSession({ teamId, userId, threadId });
    session = sessionResult.session;
    teamKnowledge = await getTeamKnowledge(teamId);
  } catch (sessionError: any) {
    console.error("Session setup failed:", sessionError?.message || sessionError);
    return NextResponse.json({ error: "Failed to initialize conversation session." }, { status: 500 });
  }

  const userMessage = { role: "user" as const, content: body.prompt, timestamp: new Date().toISOString() };
  const sessionHistory = session.messages.slice(-10);
  const sessionSummary = session.summary;

  const knowledgeBlock = teamKnowledge
    ? [
        teamKnowledge.salesProcess ? `- Sales process: ${teamKnowledge.salesProcess}` : null,
        teamKnowledge.leadScoringCriteria ? `- Lead scoring: ${teamKnowledge.leadScoringCriteria}` : null,
        teamKnowledge.commonObjections ? `- Common objections: ${teamKnowledge.commonObjections}` : null,
        teamKnowledge.customInstructions ? `- Custom instructions: ${teamKnowledge.customInstructions}` : null,
        teamKnowledge.pastDecisions && teamKnowledge.pastDecisions.length > 0
          ? `- Past decisions:\n${teamKnowledge.pastDecisions.map((d) => `  - ${d.topic}: ${d.decision}`).join("\n")}`
          : null,
      ]
      .filter(Boolean)
      .join("\n")
    : "";

  const contextPrompt = [
    knowledgeBlock ? `TEAM KNOWLEDGE:\n${knowledgeBlock}` : "",
    sessionSummary ? `\n\nPREVIOUS CONVERSATION SUMMARY:\n${sessionSummary}` : "",
    sessionHistory.length > 0
      ? `\n\nRECENT CONVERSATION:\n${sessionHistory.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join("\n")}`
      : "",
    `\n\nCurrent time: ${new Date().toISOString()}\n\nCRM people:\n${JSON.stringify(leads)}\n\nCRM companies:\n${JSON.stringify(companyRows ?? [])}\n\nRecent CRM activities:\n${JSON.stringify(activityRows ?? [])}\n\nFounder request:\n${body.prompt}`,
  ]
    .filter(Boolean)
    .join("\n");

  const model = resolveModel("high-quality");

  try {
    const ai = getGeminiClient();
    const dynamicSystemInstruction = buildDynamicSystemInstruction(AGENT_SYSTEM_INSTRUCTION, knowledgeBlock, sessionSummary);

    const response = await ai.models.generateContent({
      model,
      contents: contextPrompt,
      config: {
        systemInstruction: dynamicSystemInstruction,
        responseMimeType: "application/json",
        responseSchema: AGENT_RESPONSE_SCHEMA,
      },
    });
    if (!response.text) throw new Error("Gemini returned no agent plan.");

    const plan = parseAgentPlan(response.text, leads.map((lead) => lead.id), (companyRows ?? []).map((company) => company.id));

    await addMessageToSession(session.id, userMessage);
    await addMessageToSession(session.id, { role: "assistant", content: plan.response, timestamp: new Date().toISOString() });

    return NextResponse.json({ ...plan, threadId: session.threadId, sessionId: session.id, session });
  } catch (geminiError: any) {
    console.warn("Gemini agent failed, falling back to Groq:", geminiError?.message || geminiError);
    try {
      const groqModel = resolveModel("high-quality", "groq");
      const dynamicSystemInstructionGroq = buildDynamicSystemInstruction(
        AGENT_SYSTEM_INSTRUCTION_FOR_GROQ,
        knowledgeBlock,
        sessionSummary
      );
      const text = await callGroq({
        systemInstruction: dynamicSystemInstructionGroq,
        userPrompt: contextPrompt,
        model: groqModel,
        responseFormat: "json_object",
      });

      const plan = parseAgentPlan(text, leads.map((lead) => lead.id), (companyRows ?? []).map((company) => company.id));

      await addMessageToSession(session.id, userMessage);
      await addMessageToSession(session.id, { role: "assistant", content: plan.response, timestamp: new Date().toISOString() });

      return NextResponse.json({ ...plan, threadId: session.threadId, sessionId: session.id, session });
    } catch (groqError: any) {
      console.error("Agent planning failed on both providers:", groqError?.message || groqError);
      return NextResponse.json(
        { error: "Soro is temporarily unavailable. Please try again in a moment." },
        { status: 503 }
      );
    }
  }
}
