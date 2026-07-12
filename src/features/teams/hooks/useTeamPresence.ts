"use client";
import { useEffect, useState } from "react";
import { subscribeToTeamMemberships, updatePresence } from "@/lib/teamService";
import { getUserId } from "@/lib/getUserId";
import type { Team, TeamMember } from "@/types";

const IDLE_TIMEOUT_MS = 120000;

export function useTeamPresence(currentTeam: Team | null, user: any, isEditing: boolean) {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  useEffect(() => {
    if (!currentTeam) return;
    const unsubscribe = subscribeToTeamMemberships(currentTeam.id, setTeamMembers);
    return () => unsubscribe();
  }, [currentTeam]);

  useEffect(() => {
    if (!currentTeam) return;
    const userId = getUserId(user);
    const activity = isEditing ? "editing" : "viewing";

    updatePresence(currentTeam.id, userId, "active", activity);
    const handleBeforeUnload = () => updatePresence(currentTeam.id, userId, "offline", "idle");
    window.addEventListener("beforeunload", handleBeforeUnload);

    let idleTimer: ReturnType<typeof setTimeout>;
    const resetIdleTimer = () => {
      updatePresence(currentTeam.id, userId, "active", activity);
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => updatePresence(currentTeam.id, userId, "away", "idle"), IDLE_TIMEOUT_MS);
    };
    window.addEventListener("mousemove", resetIdleTimer);
    window.addEventListener("keypress", resetIdleTimer);
    resetIdleTimer();

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("mousemove", resetIdleTimer);
      window.removeEventListener("keypress", resetIdleTimer);
      clearTimeout(idleTimer);
    };
  }, [currentTeam, user, isEditing]);

  return { teamMembers };
}
