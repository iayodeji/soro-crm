"use client";
import { createContext, useContext } from "react";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useActivityFeed } from "@/features/activity-feed/hooks/useActivityFeed";
import { useLeads } from "@/features/leads/hooks/useLeads";

type WorkspaceContextValue = ReturnType<typeof useWorkspaceState>;

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

function useWorkspaceState() {
  const networkStatus = useNetworkStatus();
  const activityFeed = useActivityFeed();
  const { leads, leadsLoaded, isParsing, updateLead, deleteLead, addNewLead, parseLead, exportCsv } =
    useLeads(activityFeed.logActivity);

  return {
    networkStatus,
    ...activityFeed,
    leads,
    leadsLoaded,
    isParsing,
    updateLead,
    deleteLead,
    addNewLead,
    parseLead,
    exportCsv,
  };
}

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const value = useWorkspaceState();
  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return ctx;
}
