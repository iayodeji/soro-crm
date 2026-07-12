"use client";
import { useCallback, useState } from "react";
import { playSuccessPop } from "@/utils/audio";
import { useActivityLog } from "./useActivityLog";
import { useFcmPush } from "./useFcmPush";
import type { ActivityEventType, LogActivityInput } from "@/types/activity";

const PUSH_COPY: Partial<Record<ActivityEventType, (leadName: string) => { title: string; body: string }>> = {
  tasks_synced: (leadName) => ({
    title: "🚨 Upcoming Discovery Call Action",
    body: `Google Task added: "Follow up interview with ${leadName || "lead"}". Tap to view.`,
  }),
  sheets_synced: (leadName) => ({
    title: "📊 Google Sheets Synced",
    body: `Success: Discovery logs of ${leadName || "lead"} pushed to Soro-Discovery-Pipeline sheet.`,
  }),
  gmail_sent: (leadName) => ({
    title: "✉️ Discovery Outbox Dispatch",
    body: `Mom Test Interview request drafted and sent${leadName ? ` to ${leadName}` : ""} successfully.`,
  }),
  ai_parse_completed: (leadName) => ({
    title: "🧠 Soro Proactive Coach",
    body: `AI analyzed bios of ${leadName || "new lead"}. Generated custom non-leading discovery query.`,
  }),
};

// Legacy bridge for components not yet migrated to structured logActivity
// (LeadDetailView / TeamManagementModal currently call onLogActivity(action, details, type)).
// Mirrors the ORIGINAL .includes() matching so those call sites keep working unchanged
// until you paste those files and I migrate their call sites too.
function inferLegacyEventType(action: string): ActivityEventType {
  if (action.includes("Tasks Synced") || action.includes("Google Tasks")) return "tasks_synced";
  if (action.includes("Sheets Sync") || action.includes("Exported")) return "sheets_synced";
  if (action.includes("Gmail")) return "gmail_sent";
  if (action.includes("AI Parsing Completed")) return "ai_parse_completed";
  return "generic";
}

export function useActivityFeed() {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const { activityLogs, toasts, logActivity: writeLog, dismissToast } = useActivityLog(soundEnabled);
  const fcmPush = useFcmPush(soundEnabled);

  const logActivity = useCallback(
    (input: LogActivityInput) => {
      writeLog(input);
      if (!fcmPush.fcmEnabled) return;
      const copyFn = PUSH_COPY[input.eventType];
      if (!copyFn) return;
      const leadName = input.leadOverride?.name || "";
      const { title, body } = copyFn(leadName);
      fcmPush.trigger(title, body, leadName || "Pipeline reminder");
    },
    [writeLog, fcmPush]
  );

  const legacyLogActivity = useCallback(
    (action: string, details: string, type: "success" | "info" | "warning") => {
      logActivity({ eventType: inferLegacyEventType(action), action, details, level: type });
    },
    [logActivity]
  );

  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev;
      if (next) playSuccessPop();
      logActivity({
        eventType: "generic",
        action: `Tactile Audio ${next ? "Unmuted" : "Muted"}`,
        details: next ? "Soro micro-sound synthesizers active." : "Chimes muted.",
        level: "info",
      });
      return next;
    });
  }, [logActivity]);

  const toggleFcm = useCallback(async () => {
    const next = !fcmPush.fcmEnabled;
    if (next) {
      const permission = await fcmPush.requestPermission();
      if (permission === "granted") {
        logActivity({
          eventType: "generic", action: "Notifications Active",
          details: "Standard native push notifications are now active. You will receive live system alerts!",
          level: "success",
        });
      } else {
        logActivity({
          eventType: "generic", action: "Notifications Blocked",
          details: "Standard native push permissions were denied. Soro will use in-app alerts.",
          level: "warning",
        });
      }
    }
    fcmPush.setFcmEnabled(next);
    logActivity({
      eventType: "generic",
      action: `FCM Push Alerts ${next ? "Enabled" : "Disabled"}`,
      details: next
        ? "FCM service channel is listening for live pipeline activity and task deadlines."
        : "FCM channel muted.",
      level: next ? "success" : "info",
    });
  }, [fcmPush, logActivity]);

  const dispatchTestPush = useCallback(() => {
    fcmPush.trigger(
      "📅 Discovery Follow-up",
      "Tomorrow's interview with Marcus Thorne (NextFlow) is scheduled for 10:00 AM.",
      "Marcus Thorne"
    );
    logActivity({ eventType: "generic", action: "Alert Dispatched", details: "Dispatched discovery timeline notification.", level: "info" });
  }, [fcmPush, logActivity]);

  return {
    activityLogs,
    toasts,
    dismissToast,
    logActivity,
    legacyLogActivity,
    soundEnabled,
    toggleSound,
    fcmEnabled: fcmPush.fcmEnabled,
    simulatedNotifications: fcmPush.simulatedNotifications,
    dismissPush: fcmPush.dismissPush,
    toggleFcm,
    dispatchTestPush,
  };
}
