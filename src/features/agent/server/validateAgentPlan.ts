import type { AgentAction, AgentActionType, AgentPlan } from "../types";

const ACTION_TYPES = new Set<AgentActionType>([
  "create_lead", "update_lead", "move_lead", "draft_email", "send_email", "schedule_meeting", "log_activity",
]);
const PHASES = new Set(["lead_found", "prospect_engaged", "client_closed"]);
const ACTIVITY_TYPES = new Set(["call", "email", "linkedin", "meeting", "note", "stage_change", "task", "custom"]);
const OUTCOMES = new Set(["sent", "replied", "no_answer", "completed", "scheduled", "no_show", "bounced", "left_voicemail", "other"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringField(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function optionalDate(value: unknown, field: string): string | undefined {
  const date = stringField(value);
  if (date && Number.isNaN(Date.parse(date))) throw new Error(`Invalid ${field} in agent plan.`);
  return date;
}

function parseAction(value: unknown, leadIds: Set<string>, companyIds: Set<string>): AgentAction {
  if (!isRecord(value) || !ACTION_TYPES.has(value.type as AgentActionType)) throw new Error("Unsupported action in agent plan.");
  const type = value.type as AgentActionType;
  const action: AgentAction = { type };
  const fields = ["leadId", "name", "companyName", "email", "phone", "notes", "subject", "body", "title", "description", "companyId", "summary", "nextStep"] as const;
  for (const field of fields) {
    const parsed = stringField(value[field]);
    if (parsed) action[field] = parsed as never;
  }
  action.startAt = optionalDate(value.startAt, "meeting start time");
  action.endAt = optionalDate(value.endAt, "meeting end time");
  action.occurredAt = optionalDate(value.occurredAt, "activity time");
  action.followUpAt = optionalDate(value.followUpAt, "follow-up time");

  if (typeof value.phase === "string" && PHASES.has(value.phase)) action.phase = value.phase as AgentAction["phase"];
  if (typeof value.activityType === "string" && ACTIVITY_TYPES.has(value.activityType)) action.activityType = value.activityType as AgentAction["activityType"];
  if (typeof value.outcome === "string" && OUTCOMES.has(value.outcome)) action.outcome = value.outcome as AgentAction["outcome"];

  if (type === "create_lead") {
    if (!action.name || !action.companyName) throw new Error("A new lead needs a name and company.");
    return action;
  }
  if ((type === "log_activity" && !action.leadId && !action.companyId) || (type !== "log_activity" && !action.leadId)) {
    throw new Error("Agent action is missing its CRM record.");
  }
  if (action.leadId && !leadIds.has(action.leadId)) throw new Error("Agent action referenced an unknown lead.");
  if (action.companyId && !companyIds.has(action.companyId)) throw new Error("Agent action referenced an unknown company.");
  if (["draft_email", "send_email"].includes(type) && (!action.subject || !action.body)) throw new Error("An email action needs a subject and body.");
  if (type === "schedule_meeting" && (!action.title || !action.startAt || !action.endAt || Date.parse(action.endAt) <= Date.parse(action.startAt))) throw new Error("A meeting action needs a valid title and time range.");
  if (type === "log_activity" && (!action.activityType || !action.summary || !action.occurredAt)) throw new Error("An activity action is incomplete.");
  return action;
}

export function parseAgentPlan(text: string, leadIds: Iterable<string>, companyIds: Iterable<string>): AgentPlan {
  let raw: unknown;
  try {
    raw = JSON.parse(text.trim());
  } catch {
    throw new Error("The AI returned an unreadable plan.");
  }
  if (!isRecord(raw) || !stringField(raw.response) || !Array.isArray(raw.actions) || raw.actions.length > 20) {
    throw new Error("The AI returned an incomplete plan.");
  }
  const knownLeadIds = new Set(leadIds);
  const knownCompanyIds = new Set(companyIds);
  return {
    response: stringField(raw.response)!,
    actions: raw.actions.map((action) => parseAction(action, knownLeadIds, knownCompanyIds)),
  };
}
