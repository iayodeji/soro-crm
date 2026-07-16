"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import type { Session, User as SupabaseUser } from "@supabase/supabase-js";
import { supabaseBrowser } from "@/lib/supabase/client";

const SUPABASE_TOKEN_ENDPOINT = "/api/auth/supabase";
const SYNC_TEAM_ENDPOINT = "/api/sync/team";
const SYNC_MEMBERS_ENDPOINT = "/api/sync/members";

export interface SupabaseSyncState {
  supabaseUser: SupabaseUser | null;
  session: Session | null;
  isSyncing: boolean;
  isSupabaseReady: boolean;
  /** True once we've confirmed whether a `users` row already exists. */
  hasProfile: boolean;
  error: Error | null;
  retry: () => void;
}

export function useSupabaseSync(): SupabaseSyncState {
  const { isLoaded, isSignedIn, userId, orgId } = useAuth();

  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasProfile, setHasProfile] = useState(false);

  const syncingForUserRef = useRef<string | null>(null);
  const cancelledRef = useRef(false);
  const attemptRef = useRef(0);
  const lastOrgIdRef = useRef<string | null>(null);
  const [, setAttempt] = useState(0);

  // Mirror Supabase's own auth state into React state.
  useEffect(() => {
    const { data: sub } = supabaseBrowser.auth.onAuthStateChange(
      (_event, sess) => {
        setSession(sess);
        setSupabaseUser(sess?.user ?? null);
      },
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  const syncWorkspace = useCallback(async () => {
    if (!orgId) return;
    try {
      const [teamRes, membersRes] = await Promise.all([
        fetch(SYNC_TEAM_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }),
        fetch(SYNC_MEMBERS_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }),
      ]);
      if (!teamRes.ok || !membersRes.ok) {
        throw new Error("Workspace sync failed.");
      }
    } catch (err) {
      console.error("Workspace sync error:", err);
    }
  }, [orgId]);

  const syncWithClerk = useCallback(async () => {
    if (!isSignedIn || !userId) return;

    const orgChanged = lastOrgIdRef.current !== orgId;

    const { data: current } = await supabaseBrowser.auth.getUser();
    if (!orgChanged && current.user?.id === userId) {
      syncingForUserRef.current = userId;
      setError(null);
      return;
    }

    if (!orgChanged && syncingForUserRef.current === userId) return;

    syncingForUserRef.current = userId;
    cancelledRef.current = false;
    setIsSyncing(true);
    setError(null);

    try {
      const res = await fetch(SUPABASE_TOKEN_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        throw new Error(
          `Supabase token exchange failed (${res.status}). Confirm the Clerk session and server route.`,
        );
      }
      const { session: newSession } = (await res.json()) as {
        session: Session;
      };
      if (!newSession)
        throw new Error("No session returned from /api/auth/supabase.");

      if (cancelledRef.current || syncingForUserRef.current !== userId) {
        return;
      }

      const { error: setErr } =
        await supabaseBrowser.auth.setSession(newSession);
      if (setErr) throw setErr;

      lastOrgIdRef.current = orgId;
      attemptRef.current = 0;

      if (orgChanged && orgId) {
        void syncWorkspace();
      }
    } catch (err) {
      syncingForUserRef.current = null;
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsSyncing(false);
    }
  }, [isSignedIn, userId, orgId, syncWorkspace]);

  // Drive the exchange from Clerk auth state changes.
  useEffect(() => {
    if (!isLoaded) return;

    if (isSignedIn && userId) {
      void syncWithClerk();
      return;
    }

    // Clerk is signed out — clean up Supabase
    syncingForUserRef.current = null;
    cancelledRef.current = true; // Cancel any active in-flight requests
    supabaseBrowser.auth.getUser().then(({ data }) => {
      if (data.user) {
        supabaseBrowser.auth.signOut().catch(() => {
          /* best-effort teardown */
        });
      }
    });
  }, [isLoaded, isSignedIn, userId, orgId, syncWithClerk]);

  const isSupabaseReady =
    isLoaded && !!isSignedIn && !!userId && supabaseUser?.id === userId;

  // Once Supabase is authenticated as the current user, check whether their
  // profile row already exists so returning users skip the save step.
  useEffect(() => {
    if (!isSupabaseReady || !userId) return;

    let active = true;
    (async () => {
      try {
        const { data } = await supabaseBrowser
          .from("users")
          .select("clerkUserId")
          .eq("clerkUserId", userId)
          .maybeSingle();
        if (active) setHasProfile(Boolean(data));
      } catch {
        if (active) setHasProfile(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [isSupabaseReady, userId]);

  const retry = useCallback(() => {
    attemptRef.current += 1;
    setAttempt(attemptRef.current);
    syncingForUserRef.current = null;
    setError(null);
    void syncWithClerk();
  }, [syncWithClerk]);

  return {
    supabaseUser,
    session,
    isSyncing,
    isSupabaseReady,
    hasProfile,
    error,
    retry,
  };
}
