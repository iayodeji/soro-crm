export type ActivityEventType =
  | "tasks_synced" | "sheets_synced" | "gmail_sent"
  | "ai_parse_completed" | "ai_parse_fallback" | "ai_parse_failed"
  | "lead_added" | "lead_deleted"
  | "csv_exported" | "csv_export_failed"
  | "generic";

export interface ToastMessage {
  id: string;
  title: string;
  desc: string;
  type: "success" | "info" | "warning";
}

export interface FcmNotification {
  id: string;
  title: string;
  body: string;
  leadName: string;
  timestamp: string;
}

export interface LogActivityInput {
  eventType: ActivityEventType;
  action: string;
  details: string;
  level: "success" | "info" | "warning";
  leadOverride?: { id: string; name: string } | null;
}
