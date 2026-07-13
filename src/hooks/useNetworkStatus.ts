"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export type NetworkStatus = "online" | "offline" | "checking";

const HEALTH_ENDPOINT = "/api/health";
const POLL_INTERVAL_MS = 30_000;
const PROBE_TIMEOUT_MS = 5_000;

/**
 * Reports the user's *real* connectivity, not just the browser's notion of it.
 *
 * The browser `online`/`offline` events and `navigator.onLine` only describe the
 * local network interface (e.g. is Wi-Fi "connected"). They cannot tell whether
 * the actual backend is reachable — a captive portal, a dead router upstream, or
 * a downed server all still report "online". So we combine two signals:
 *
 *   1. The browser `offline` event is trusted immediately (link is down → offline).
 *   2. A real HTTP probe to /api/health confirms reachability, run on mount, on
 *      `online` events, on a heartbeat, and when the tab regains focus.
 */
export function useNetworkStatus(): NetworkStatus {
  // Start from a deterministic default so server and client render identically.
  // The real status is resolved after mount via the initial probe below.
  const [status, setStatus] = useState<NetworkStatus>("offline");

  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const checkConnection = useCallback(async () => {
    // Trust the browser when it says the link is down — no point probing.
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      setStatus("offline");
      return;
    }

    // Supersede any probe already in flight before starting a new one.
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const timeout = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
    timerRef.current = timeout;

    // Only flip to "checking" if we were previously believed online, so the UI
    // doesn't flicker to "Connecting" on the very first probe.
    setStatus((prev) => (prev === "online" ? "checking" : prev));

    try {
      const res = await fetch(HEALTH_ENDPOINT, {
        method: "GET",
        cache: "no-store",
        headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!mountedRef.current || controller.signal.aborted) return;
      // A successful response means we can actually reach the server.
      setStatus(res.ok ? "online" : "offline");
    } catch {
      clearTimeout(timeout);
      if (!mountedRef.current || controller.signal.aborted) return;
      // Network error / timeout → from the user's perspective they're offline.
      setStatus("offline");
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    const handleOnline = () => {
      setStatus("checking");
      void checkConnection();
    };
    const handleOffline = () => setStatus("offline");
    const handleVisible = () => {
      if (document.visibilityState === "visible") void checkConnection();
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    document.addEventListener("visibilitychange", handleVisible);

    void checkConnection();
    const interval = setInterval(() => void checkConnection(), POLL_INTERVAL_MS);

    return () => {
      mountedRef.current = false;
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      document.removeEventListener("visibilitychange", handleVisible);
      clearInterval(interval);
      if (timerRef.current) clearTimeout(timerRef.current);
      abortRef.current?.abort();
    };
  }, [checkConnection]);

  return status;
}
