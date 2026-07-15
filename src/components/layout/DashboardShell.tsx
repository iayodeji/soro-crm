"use client";
import { useWorkspace } from "@/providers/WorkspaceProvider";
import { TopBar } from "@/components/layout/TopBar";
import { ToastStack } from "@/features/activity-feed/components/ToastStack";
import { FcmPushStack } from "@/features/activity-feed/components/FcmPushStack";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const {
    networkStatus,
    toasts,
    dismissToast,
    simulatedNotifications,
    dismissPush,
    soundEnabled,
  } = useWorkspace();

  return (
    <div className="min-h-screen bg-[#FDFBF2] text-[#1F1612] flex flex-col font-sans select-none antialiased">
      <TopBar networkStatus={networkStatus} />

      {children}

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
      <FcmPushStack notifications={simulatedNotifications} onDismiss={dismissPush} soundEnabled={soundEnabled} />
    </div>
  );
}
