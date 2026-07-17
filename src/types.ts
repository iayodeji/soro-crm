export type Phase = "lead_found" | "prospect_engaged" | "client_closed";

export interface CreateLeadInput {
  id: string;
  name: string;
  company_name: string;
  email: string | null;
  phone: string | null;
  notes: string;
  phase: Phase;
  createdAt: string;
  updatedAt: string;
  marketFitThesis?: string;
  momTestQuestions?: string[];
  linkedinUrl?: string | null;
  companyWebsite?: string | null;
  gmailSent?: boolean;
  calendarScheduled?: boolean;
  sheetsSynced?: boolean;
  tasksCreated?: boolean;
}

export interface Lead extends CreateLeadInput {
  teamId: string;
}

export interface CreateCompanyInput {
  id: string;
  name: string;
  website: string | null;
  industry: string | null;
  notes: string;
  phase: Phase;
  createdAt: string;
  updatedAt: string;
}

export interface Company extends CreateCompanyInput {
  teamId: string;
}

export const ACTIVITY_TYPES = ["call", "email", "linkedin", "meeting", "note", "stage_change", "task", "custom"] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];
export type ActivityOutcome = "sent" | "replied" | "no_answer" | "completed" | "scheduled" | "no_show" | "bounced" | "left_voicemail" | "other";

export interface CreateCrmActivityInput {
  leadId?: string | null;
  companyId?: string | null;
  type: ActivityType;
  outcome?: ActivityOutcome | null;
  summary: string;
  notes?: string | null;
  occurredAt?: string;
  nextStep?: string | null;
  followUpAt?: string | null;
}

export interface CrmActivity extends CreateCrmActivityInput {
  id: string;
  teamId: string;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  deletedBy?: string | null;
  actorName?: string;
  editorName?: string;
  leadName?: string | null;
  companyName?: string | null;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  leadId: string;
  leadName: string;
  action: string;
  details: string;
  type: "success" | "info" | "warning";
}

export interface SessionMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
}

export interface Session {
  id: string;
  teamId: string;
  userId: string;
  threadId: string;
  messages: SessionMessage[];
  summary?: string;
  title?: string;
  lastActivity: string;
  createdAt: string;
}

export interface TeamKnowledge {
  teamId: string;
  salesProcess?: string;
  leadScoringCriteria?: string;
  commonObjections?: string;
  pastDecisions?: Array<{ topic: string; decision: string; decidedAt: string; decidedBy: string }>;
  customInstructions?: string;
  updatedAt: string;
}

export interface GeminiParseResponse {
  parsed_lead: {
    name: string | null;
    company_name: string | null;
    email: string | null;
    phone: string | null;
  };
  market_fit_thesis: string;
  mom_test_questions: string[];
}
