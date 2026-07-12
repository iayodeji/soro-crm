"use client";
import { createContext, useContext, useMemo } from "react";
import { usePathname } from "next/navigation";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useActivityFeed } from "@/features/activity-feed/hooks/useActivityFeed";
import { useTeamWorkspace } from "@/features/teams/hooks/useTeamWorkspace";
import { useTeamPresence } from "@/features/teams/hooks/useTeamPresence";
import { useLeads } from "@/features/leads/hooks/useLeads";
import { getUserId } from "@/lib/getUserId";
import { isFirebaseConfigured } from "@/lib/firebase";

type WorkspaceContextValue = ReturnType<typeof useWorkspaceState>;

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

function useWorkspaceState() {
  const networkStatus = useNetworkStatus();
  const pathname = usePathname();
  const isEditing = pathname?.startsWith("/leads/") ?? false;

  const activityFeed = useActivityFeed();
  const { user, accessToken, signIn, signOut } = useAuth((currentUser) => {
    activityFeed.logActivity({
      eventType: "auth_success",
      action: "Authenticated Session",
      details: `User ${currentUser.displayName || currentUser.email} authenticated.`,
      level: "success",
    });
  });

  const { myTeams, currentTeam, switchTeam, addCreatedTeam, removeDeletedTeam } = useTeamWorkspace(
    user,
    activityFeed.logActivity
  );
  const { teamMembers } = useTeamPresence(currentTeam, user, isEditing);
  const { leads, leadsLoaded, isParsing, updateLead, deleteLead, addNewLead, parseLead, exportCsv } = useLeads(
    currentTeam,
    activityFeed.logActivity
  );

  const isViewer = useMemo(() => {
    const member = teamMembers.find((m) => m.id === getUserId(user));
    return member?.role === "viewer";
  }, [teamMembers, user]);

  const handleSignOut = async () => {
    await signOut();
    activityFeed.logActivity({ eventType: "signout", action: "Session Terminated", details: "Signed out of discovery console.", level: "info" });
  };

  return {
    networkStatus,
    user,
    accessToken,
    signIn,
    signOut: handleSignOut,
    isFirebaseSynced: isFirebaseConfigured() && !!user,
    ...activityFeed,
    myTeams,
    currentTeam,
    teamMembers,
    switchTeam,
    addCreatedTeam,
    removeDeletedTeam,
    isViewer,
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
