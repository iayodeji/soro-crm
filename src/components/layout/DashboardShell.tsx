"use client";
import { useState } from "react";
import { useWorkspace } from "@/providers/WorkspaceProvider";
import { TopBar } from "@/components/layout/TopBar";
import { ToastStack } from "@/features/activity-feed/components/ToastStack";
import { FcmPushStack } from "@/features/activity-feed/components/FcmPushStack";
import { TeamManagementModal } from "@/features/teams/components/TeamManagementModal";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const {
    user, accessToken, signIn, signOut, isFirebaseSynced, networkStatus,
    teamMembers, currentTeam, myTeams, switchTeam, addCreatedTeam, removeDeletedTeam,
    toasts, dismissToast, simulatedNotifications, dismissPush, soundEnabled, legacyLogActivity,
  } = useWorkspace();

  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#FDFBF2] text-[#1F1612] flex flex-col font-sans select-none antialiased">
      <TopBar
        user={user}
        accessToken={accessToken}
        onSignIn={signIn}
        onSignOut={signOut}
        isFirebaseSynced={isFirebaseSynced}
        networkStatus={networkStatus}
        teamMembers={teamMembers}
        onManageTeam={() => setIsTeamModalOpen(true)}
        currentTeamName={currentTeam?.name}
      />

      {children}

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
      <FcmPushStack notifications={simulatedNotifications} onDismiss={dismissPush} soundEnabled={soundEnabled} />

      <TeamManagementModal
        isOpen={isTeamModalOpen}
        onClose={() => setIsTeamModalOpen(false)}
        currentUser={user}
        currentTeam={currentTeam}
        myTeams={myTeams}
        teamMembers={teamMembers}
        onTeamSelected={switchTeam}
        onTeamCreated={addCreatedTeam}
        onTeamDeleted={removeDeletedTeam}
        onLogActivity={legacyLogActivity}
      />
    </div>
  );
}
