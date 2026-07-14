export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getGeminiClient } from "@/features/leads/server/geminiClient";
import { callGroq } from "@/features/leads/server/groqClient";
import { resolveModel } from "@/features/leads/server/modelSelection";
import {
  AGENT_RESPONSE_SCHEMA,
  AGENT_SYSTEM_INSTRUCTION,
  AGENT_SYSTEM_INSTRUCTION_FOR_GROQ,
} from "@/features/agent/server/agentSchema";
import type { AgentLeadContext, AgentPlan } from "@/features/agent/types";
import { getOrCreateSession, addMessageToSession, getTeamKnowledge } from "@/features/agent/server/sessionService";
import { WORKSPACE_ID } from "@/lib/workspace";

function extractJson(text: string): AgentPlan {
  try {
    return JSON.parse(text.trim());
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Model returned an invalid agent plan.");
    return JSON.parse(match[0]);
  }
}

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

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.prompt !== "string" || !Array.isArray(body.leads)) {
    return NextResponse.json({ error: "A prompt and lead context are required." }, { status: 400 });
  }

  const leads = body.leads as AgentLeadContext[];
  const threadId = body.threadId as string | undefined;

  let session;
  let teamKnowledge;
  try {
    const sessionResult = await getOrCreateSession({ teamId: WORKSPACE_ID, userId: WORKSPACE_ID, threadId });
    session = sessionResult.session;
    teamKnowledge = await getTeamKnowledge(WORKSPACE_ID);
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
    `\n\nCurrent time: ${new Date().toISOString()}\n\nCRM leads:\n${JSON.stringify(leads)}\n\nFounder request:\n${body.prompt}`,
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

    const plan = extractJson(response.text);

    await addMessageToSession(session.id, userMessage);
    await addMessageToSession(session.id, { role: "assistant", content: plan.response, timestamp: new Date().toISOString() });

    return NextResponse.json({ ...plan, threadId: session.threadId, sessionId: session.id });
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

      const plan = extractJson(text);

      await addMessageToSession(session.id, userMessage);
      await addMessageToSession(session.id, { role: "assistant", content: plan.response, timestamp: new Date().toISOString() });

      return NextResponse.json({ ...plan, threadId: session.threadId, sessionId: session.id });
    } catch (groqError: any) {
      console.error("Agent planning failed on both providers:", groqError?.message || groqError);
      return NextResponse.json(
        { error: geminiError?.message || "Unable to plan that CRM request." },
        { status: 500 }
      );
    }
  }
}
