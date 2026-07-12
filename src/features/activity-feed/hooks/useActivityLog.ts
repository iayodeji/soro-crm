"use client";
import { useCallback, useState } from "react";
import { playSuccessPop, playInfoTap, playWarningChime } from "@/utils/audio";
import type { ActivityLog } from "@/types";
import type { LogActivityInput, ToastMessage } from "@/types/activity";

const MAX_LOGS = 30;
const TOAST_DURATION_MS = 4500;

export function useActivityLog(soundEnabled: boolean) {
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const logActivity = useCallback(
    (input: LogActivityInput) => {
      const { action, details, level, leadOverride } = input;
      const newLog: ActivityLog = {
        id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toLocaleTimeString(),
        leadId: leadOverride?.id || "global",
        leadName: leadOverride?.name || "System",
        action,
        details,
        type: level,
      };
      setActivityLogs((prev) => [newLog, ...prev].slice(0, MAX_LOGS));

      const toastId = `toast-${Date.now()}-${Math.random()}`;
      setToasts((prev) => [...prev, { id: toastId, title: action, desc: details, type: level }]);

      if (soundEnabled) {
        if (level === "success") playSuccessPop();
        else if (level === "warning") playWarningChime();
        else playInfoTap();
      }

      setTimeout(() => dismissToast(toastId), TOAST_DURATION_MS);
    },
    [soundEnabled, dismissToast]
  );

  return { activityLogs, toasts, logActivity, dismissToast };
}
