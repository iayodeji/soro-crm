import type { Lead, Phase } from "@/types";

export type AgentActionType = "create_lead" | "update_lead" | "move_lead" | "draft_email" | "send_email" | "schedule_meeting" | "log_activity";

export interface AgentAction {
  type: AgentActionType;
  leadId?: string;
  name?: string;
  companyName?: string;
  email?: string | null;
  phone?: string | null;
  notes?: string;
  phase?: Phase;
  subject?: string;
  body?: string;
  title?: string;
  startAt?: string;
  endAt?: string;
  description?: string;
  companyId?: string;
  activityType?: "call" | "email" | "linkedin" | "meeting" | "note" | "stage_change" | "task" | "custom";
  outcome?: "sent" | "replied" | "no_answer" | "completed" | "scheduled" | "no_show" | "bounced" | "left_voicemail" | "other";
  summary?: string;
  occurredAt?: string;
  nextStep?: string;
  followUpAt?: string;
}

export interface AgentPlan {
  response: string;
  actions: AgentAction[];
}

export type AgentLeadContext = Pick<Lead, "id" | "name" | "company_name" | "email" | "phone" | "notes" | "phase" | "marketFitThesis" | "momTestQuestions" | "linkedinUrl" | "companyWebsite">;
