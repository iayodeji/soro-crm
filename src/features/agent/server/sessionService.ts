import { callGroq } from "@/features/leads/server/groqClient";
import { resolveModel } from "@/features/leads/server/modelSelection";
import type { Session, SessionMessage, TeamKnowledge } from "@/types";
import { getSupabaseAdmin } from "@/lib/supabase/server";

const SESSIONS_TABLE = "sessions";
const TEAM_KNOWLEDGE_TABLE = "team_knowledge";

function generateThreadId(): string {
  return `thread-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function generateSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function createSession({
  teamId,
  userId,
  threadId,
  firstMessage,
}: {
  teamId: string;
  userId: string;
  threadId?: string;
  firstMessage?: { role: "user" | "assistant"; content: string; timestamp: string };
}): Promise<Session> {
  const sessionId = generateSessionId();
  const resolvedThreadId = threadId || generateThreadId();
  const now = new Date().toISOString();

  const session: Session = {
    id: sessionId,
    teamId,
    userId,
    threadId: resolvedThreadId,
    messages: firstMessage ? [firstMessage] : [],
    lastActivity: now,
    createdAt: now,
    summary: "",
    title: firstMessage?.content?.slice(0, 60) || "New conversation",
  };

  const { error } = await getSupabaseAdmin()
    .from(SESSIONS_TABLE)
    .insert(session);

  if (error) {
    throw new Error(`Failed to create session: ${error.message}`);
  }

  return session;
}

export async function getSession(sessionId: string): Promise<Session | null> {
  const { data, error } = await getSupabaseAdmin()
    .from(SESSIONS_TABLE)
    .select("*")
    .eq("id", sessionId)
    .single();

  if (error || !data) return null;
  return data as Session;
}

export async function getSessionsByTeam(teamId: string, limitCount = 20): Promise<Session[]> {
  const { data, error } = await getSupabaseAdmin()
    .from(SESSIONS_TABLE)
    .select("*")
    .eq("teamId", teamId)
    .order("lastActivity", { ascending: false })
    .limit(limitCount);

  if (error) {
    throw new Error(`Failed to fetch sessions: ${error.message}`);
  }

  return (data ?? []) as Session[];
}

export async function getSessionsByThread(teamId: string, threadId: string): Promise<Session[]> {
  const { data, error } = await getSupabaseAdmin()
    .from(SESSIONS_TABLE)
    .select("*")
    .eq("teamId", teamId)
    .eq("threadId", threadId)
    .order("lastActivity", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch sessions by thread: ${error.message}`);
  }

  return (data ?? []) as Session[];
}

export async function addMessageToSession(sessionId: string, message: SessionMessage): Promise<Session> {
  const session = await getSession(sessionId);
  if (!session) throw new Error("Session not found.");

  const updatedMessages = [...session.messages, message];
  const now = new Date().toISOString();
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

  const oldMessages = updatedMessages.filter((m) => new Date(m.timestamp).getTime() < thirtyDaysAgo);
  const recentMessages = updatedMessages.filter((m) => new Date(m.timestamp).getTime() >= thirtyDaysAgo);

  let summary = session.summary ?? "";
  if (oldMessages.length > 0) {
    summary = await summarizeMessages(oldMessages, summary);
  }

  const updatedSession: Session = {
    ...session,
    messages: recentMessages,
    summary,
    lastActivity: now,
  };

  const { error } = await getSupabaseAdmin()
    .from(SESSIONS_TABLE)
    .update(updatedSession)
    .eq("id", sessionId);

  if (error) {
    throw new Error(`Failed to update session: ${error.message}`);
  }

  return updatedSession;
}

async function summarizeMessages(messages: SessionMessage[], existingSummary?: string): Promise<string> {
  if (messages.length === 0) return existingSummary || "";

  const conversationText = messages
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n");

  const prompt = existingSummary
    ? `Previous summary of this conversation:\n${existingSummary}\n\nNew messages to add to the summary:\n${conversationText}\n\nUpdate the summary to include the key points from both the previous summary and the new messages. Keep it under 300 words.`
    : `Summarize the following conversation concisely. Focus on key decisions, important context, user intent, and any CRM actions taken. Keep it under 300 words.\n\n${conversationText}`;

  try {
    const model = resolveModel("low-latency", "groq");
    const summaryText = await callGroq({
      systemInstruction:
        "You are a conversation summarizer. Produce a concise, factual summary. Do not add opinions or interpretations.",
      userPrompt: prompt,
      model,
      responseFormat: "text",
      temperature: 0.1,
    });
    return summaryText.trim();
  } catch (error) {
    console.error("Summarization failed, keeping existing summary:", error);
    return existingSummary || conversationText.slice(0, 500);
  }
}

export async function getOrCreateSession({
  teamId,
  userId,
  threadId,
}: {
  teamId: string;
  userId: string;
  threadId?: string;
}): Promise<{ session: Session; isNew: boolean }> {
  if (threadId) {
    const existing = await getSessionsByThread(teamId, threadId);
    const sorted = existing.sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime());
    if (sorted.length > 0) {
      const latest = sorted[0];
      return { session: latest, isNew: false };
    }
  }
  const session = await createSession({ teamId, userId, threadId });
  return { session, isNew: true };
}

export async function getTeamKnowledge(teamId: string): Promise<TeamKnowledge | null> {
  const { data, error } = await getSupabaseAdmin()
    .from(TEAM_KNOWLEDGE_TABLE)
    .select("*")
    .eq("teamId", teamId)
    .single();

  if (error || !data) return null;
  return { teamId, ...data } as TeamKnowledge;
}

export async function saveTeamKnowledge(knowledge: TeamKnowledge): Promise<void> {
  const { error } = await getSupabaseAdmin()
    .from(TEAM_KNOWLEDGE_TABLE)
    .upsert({
      ...knowledge,
      teamId: knowledge.teamId,
      updatedAt: new Date().toISOString(),
    });

  if (error) {
    throw new Error(`Failed to save team knowledge: ${error.message}`);
  }
}
