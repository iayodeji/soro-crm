"use client";
import { useCallback, useEffect, useState } from "react";
import { createTeam, fetchUserTeams, joinTeamViaInvitation } from "@/lib/teamService";
import { getUserId } from "@/lib/getUserId";
import type { Team } from "@/types";
import type { LogActivityInput } from "@/types/activity";

export function useTeamWorkspace(user: any, logActivity: (input: LogActivityInput) => void) {
  const [myTeams, setMyTeams] = useState<Team[]>([]);
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null);

  useEffect(() => {
    if (!user) {
      setMyTeams([]);
      setCurrentTeam(null);
      return;
    }

    const loadWorkspaces = async () => {
      try {
        const userId = getUserId(user);
        console.info("[useTeamWorkspace] loadWorkspaces: pulling workspaces for user", userId);
        let teams = await fetchUserTeams(userId);

        if (teams.length === 0) {
          const defaultTeamName = user?.displayName ? `${user.displayName}'s Pipeline` : "Soro Team";
          const ownerDetails = {
            name: user?.displayName || "Demo Founder",
            email: user?.email || "founder@sorocrm.co",
            avatarUrl: user?.photoURL || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80",
          };
          console.info("[useTeamWorkspace] loadWorkspaces: no workspaces found — provisioning default workspace.");
          teams = [await createTeam(defaultTeamName, userId, ownerDetails)];
        } else {
          console.info(`[useTeamWorkspace] loadWorkspaces: pulled ${teams.length} workspace(s) from Firestore.`, teams.map((t) => ({ id: t.id, name: t.name })));
        }
        setMyTeams(teams);

        const inviteToken = new URLSearchParams(window.location.search).get("inviteToken");
        if (inviteToken) {
          const userDetails = {
            name: user?.displayName || "Workspace Teammate",
            email: user?.email || "teammate@sorocrm.co",
            avatarUrl: user?.photoURL || "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=100&q=80",
          };
          try {
            const joined = await joinTeamViaInvitation(inviteToken, userId, userDetails);
            if (joined) {
              logActivity({
                eventType: "invite_joined", action: "Joined Team",
                details: `Successfully accepted invite to join team "${joined.name}".`, level: "success",
              });
              teams = await fetchUserTeams(userId);
              setMyTeams(teams);
              setCurrentTeam(teams.find((t) => t.id === joined.id) || joined);
            } else {
              logActivity({
                eventType: "invite_expired", action: "Invite Expired",
                details: "The team invitation token is invalid or has expired.", level: "warning",
              });
              setCurrentTeam(teams[0]);
            }
          } catch (e) {
            console.error("Invite processing error", e);
            logActivity({
              eventType: "invite_error", action: "Invite Error",
              details: "Something went wrong while processing the team invitation.", level: "warning",
            });
            setCurrentTeam(teams[0]);
          } finally {
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        } else {
          setCurrentTeam(teams[0]);
        }
      } catch (e) {
        console.error("[useTeamWorkspace] loadWorkspaces: failed to load workspaces from Firestore.", e);
      }
    };

    loadWorkspaces();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const switchTeam = useCallback((team: Team) => {
    setCurrentTeam(team);
    logActivity({
      eventType: "workspace_switched", action: "Workspace Switched",
      details: `Switched active customer discovery board to "${team.name}".`, level: "info",
    });
  }, [logActivity]);

  const addCreatedTeam = useCallback((team: Team) => {
    setMyTeams((prev) => [...prev, team]);
    setCurrentTeam(team);
    logActivity({
      eventType: "workspace_created", action: "Workspace Created",
      details: `Successfully deployed a secure workspace pipeline "${team.name}".`, level: "success",
    });
  }, [logActivity]);

  const removeDeletedTeam = useCallback((deletedTeamId: string) => {
    setMyTeams((prev) => {
      const updated = prev.filter((t) => t.id !== deletedTeamId);
      setCurrentTeam((current) => (current?.id === deletedTeamId ? updated[0] || null : current));
      return updated;
    });
    logActivity({
      eventType: "workspace_deleted", action: "Workspace Deleted",
      details: "The workspace and its associated customer data have been deleted.", level: "warning",
    });
  }, [logActivity]);

  return { myTeams, currentTeam, switchTeam, addCreatedTeam, removeDeletedTeam };
}
