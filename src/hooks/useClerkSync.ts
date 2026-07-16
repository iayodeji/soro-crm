"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";

const SYNC_TEAM_ENDPOINT = "/api/sync/team";
const SYNC_MEMBERS_ENDPOINT = "/api/sync/members";

export interface ClerkSyncState {
  isSyncing: boolean;
  isReady: boolean;
  hasProfile: boolean;
  error: Error | null;
  retry: () => void;
}

export function useClerkSync(): ClerkSyncState {
  const { isLoaded, isSignedIn, userId, orgId } = useAuth();

  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasProfile, setHasProfile] = useState(false);

  const syncingForUserRef = useRef<string | null>(null);
  const cancelledRef = useRef(false);
  const attemptRef = useRef(0);
  const lastOrgIdRef = useRef<string | null>(null);
  const [, setAttempt] = useState(0);

  const syncWorkspace = useCallback(async () => {
    if (!orgId) return;
    try {
      const [teamRes, membersRes] = await Promise.all([
        fetch(SYNC_TEAM_ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json" } }),
        fetch(SYNC_MEMBERS_ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json" } }),
      ]);
      if (!teamRes.ok || !membersRes.ok) {
        const failed = !teamRes.ok ? teamRes : membersRes;
        const detail = await failed
          .json()
          .then((body) => (body?.detail as string | undefined) ?? (body?.error as string | undefined))
          .catch(() => undefined);
        throw new Error(
          `Workspace sync failed (${failed.url.replace(location.origin, "")}: ${failed.status})${
            detail ? ` - ${detail}` : ""
          }`
        );
      }
    } catch (err) {
      console.error("Workspace sync error:", err);
      throw err instanceof Error ? err : new Error(String(err));
    }
  }, [orgId]);

  const syncWithClerk = useCallback(async () => {
    if (!isSignedIn || !userId) return;

    const orgChanged = lastOrgIdRef.current !== orgId;

    if (!orgChanged && syncingForUserRef.current === userId) return;

    syncingForUserRef.current = userId;
    cancelledRef.current = false;
    setIsSyncing(true);
    setError(null);

    try {
      await syncWorkspace();
      lastOrgIdRef.current = orgId;
      attemptRef.current = 0;
    } catch (err) {
      syncingForUserRef.current = null;
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsSyncing(false);
    }
  }, [isSignedIn, userId, orgId, syncWorkspace]);

  useEffect(() => {
    if (!isLoaded) return;

    if (isSignedIn && userId) {
      void syncWithClerk();
      return;
    }

    syncingForUserRef.current = null;
    cancelledRef.current = true;
  }, [isLoaded, isSignedIn, userId, orgId, syncWithClerk]);

  const isReady = isLoaded && !!isSignedIn && !!userId;

  useEffect(() => {
    if (!isReady || !userId) return;

    let active = true;
    fetch(`/api/dashboard/profile?clerkUserId=${encodeURIComponent(userId)}`)
      .then((r) => (r.ok ? r.json() : { exists: false }))
      .then((data) => {
        if (active) setHasProfile(Boolean(data.exists));
      })
      .catch(() => {
        if (active) setHasProfile(false);
      });

    return () => {
      active = false;
    };
  }, [isReady, userId]);

  const retry = useCallback(() => {
    attemptRef.current += 1;
    setAttempt(attemptRef.current);
    syncingForUserRef.current = null;
    setError(null);
    void syncWithClerk();
  }, [syncWithClerk]);

  return { isSyncing, isReady, hasProfile, error, retry };
}
