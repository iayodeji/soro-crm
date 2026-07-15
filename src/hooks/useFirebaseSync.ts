"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import {
  onAuthStateChanged,
  signInWithCustomToken,
  signOut,
  type User as FirebaseUser,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { firebaseAuth, firebaseDb } from "@/lib/firebase-client";

const FIREBASE_TOKEN_ENDPOINT = "/api/auth/firebase";
const SYNC_TEAM_ENDPOINT = "/api/sync/team";
const SYNC_MEMBERS_ENDPOINT = "/api/sync/members";

export interface FirebaseSyncState {
  firebaseUser: FirebaseUser | null;
  isSyncing: boolean;
  isFirebaseReady: boolean;
  /** True once we've confirmed whether a `users/{uid}` doc already exists. */
  hasProfile: boolean;
  error: Error | null;
  retry: () => void;
}

export function useFirebaseSync(): FirebaseSyncState {
  const { isLoaded, isSignedIn, userId, orgId } = useAuth();

  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(
    firebaseAuth.currentUser,
  );
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasProfile, setHasProfile] = useState(false);

  const syncingForUserRef = useRef<string | null>(null);
  const cancelledRef = useRef(false);
  const attemptRef = useRef(0);
  const lastOrgIdRef = useRef<string | null>(null);
  const [, setAttempt] = useState(0);

  // Mirror Firebase's own auth state into React state.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
      setFirebaseUser(user);
    });
    return unsubscribe;
  }, []);

  const syncWorkspace = useCallback(async () => {
    if (!orgId) return;
    try {
      const [teamRes, membersRes] = await Promise.all([
        fetch(SYNC_TEAM_ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json" } }),
        fetch(SYNC_MEMBERS_ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json" } }),
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

    if (!orgChanged && firebaseAuth.currentUser?.uid === userId) {
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
      const res = await fetch(FIREBASE_TOKEN_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        throw new Error(
          `Firebase token exchange failed (${res.status}). Confirm the Clerk session and server route.`,
        );
      }
      const { token } = (await res.json()) as { token: string };
      if (!token) throw new Error("No token returned from /api/auth/firebase.");

      if (cancelledRef.current || syncingForUserRef.current !== userId) {
        return;
      }

      await signInWithCustomToken(firebaseAuth, token);
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

    // Clerk is signed out — clean up Firebase
    syncingForUserRef.current = null;
    cancelledRef.current = true; // Cancel any active in-flight requests
    if (firebaseAuth.currentUser) {
      void signOut(firebaseAuth).catch(() => {
        /* best-effort teardown */
      });
    }
  }, [isLoaded, isSignedIn, userId, orgId, syncWithClerk]);

  const isFirebaseReady =
    isLoaded && !!isSignedIn && !!userId && firebaseUser?.uid === userId;

  // Once Firebase is authenticated as the current user, check whether their
  // profile doc already exists so returning users skip the save step.
  useEffect(() => {
    if (!isFirebaseReady || !userId) return;

    let active = true;
    getDoc(doc(firebaseDb, "users", userId))
      .then((snap) => {
        if (active) setHasProfile(snap.exists());
      })
      .catch(() => {
        if (active) setHasProfile(false);
      });

    return () => {
      active = false;
    };
  }, [isFirebaseReady, userId]);

  const retry = useCallback(() => {
    attemptRef.current += 1;
    setAttempt(attemptRef.current);
    syncingForUserRef.current = null;
    setError(null);
    void syncWithClerk();
  }, [syncWithClerk]);

  return { firebaseUser, isSyncing, isFirebaseReady, hasProfile, error, retry };
}