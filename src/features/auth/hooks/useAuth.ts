"use client";
import { useCallback, useEffect, useState } from "react";
import { initAuth, googleSignIn, logout } from "@/lib/firebase";

export function useAuth(onAuthSuccess?: (user: any) => void) {
  const [user, setUser] = useState<any>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        setAccessToken(token);
        onAuthSuccess?.(currentUser);
      },
      () => {
        setUser(null);
        setAccessToken(null);
      }
    );
    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signIn = useCallback(async () => {
    const result = await googleSignIn();
    if (result) {
      setUser(result.user);
      setAccessToken(result.accessToken);
    }
    return result;
  }, []);

  const signOut = useCallback(async () => {
    await logout();
    setUser(null);
    setAccessToken(null);
  }, []);

  return { user, accessToken, signIn, signOut };
}
