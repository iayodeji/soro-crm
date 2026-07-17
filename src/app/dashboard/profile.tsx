"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useClerkSync } from "@/hooks/useClerkSync";

type SaveState = "idle" | "saving" | "saved" | "error";

export function Profile({ onSaved }: { onSaved?: () => void }) {
  const { user } = useUser();
  const { isReady, isSyncing, error: syncError, retry } = useClerkSync();

  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

  const canWrite = isReady && !!user;

  async function handleSaveProfile() {
    if (!canWrite || !user) return;

    setSaveState("saving");
    setSaveError(null);

    try {
      const res = await fetch("/api/dashboard/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.primaryEmailAddress?.emailAddress ?? null,
          firstName: user.firstName ?? null,
          lastName: user.lastName ?? null,
          imageUrl: user.imageUrl ?? null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save profile.");
      }

      setSaveState("saved");
      onSaved?.();
    } catch (err) {
      setSaveState("error");
      setSaveError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <section className="rounded-2xl border border-[#1F1612]/15 bg-white/50 p-6 space-y-4">
      <div>
        <h2 className="font-serif font-bold italic text-xl text-[#1F1612]">
          Profile
        </h2>
        <p className="text-sm text-[#1F1612]/60 mt-1">
          Your profile is mirrored so it can be read by other
          Clerk-protected services.
        </p>
      </div>

      {/* Live connection status */}
      <div className="flex items-center gap-2 text-[11px] font-mono font-semibold uppercase tracking-wider">
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            isReady
              ? "bg-[#7A8452]"
              : isSyncing
                ? "bg-[#CFA331] animate-pulse"
                : "bg-[#B74A26]"
          }`}
        />
        <span className="text-[#1F1612]/70">
          {isReady
            ? "Connected"
            : isSyncing
              ? "Connecting..."
              : "Not connected"}
        </span>
      </div>

      {syncError && (
        <div className="space-y-2">
          <p className="text-xs font-mono text-[#B74A26]">
            Sync error: {syncError.message}
          </p>
          <button
            onClick={retry}
            className="text-xs font-mono font-semibold tracking-wider uppercase text-[#1F1612]/70 underline hover:text-[#1F1612]"
          >
            Retry
          </button>
        </div>
      )}

      <button
        onClick={handleSaveProfile}
        disabled={!canWrite || saveState === "saving"}
        className="text-xs font-mono font-semibold tracking-wider text-white uppercase px-4 py-2 rounded-full bg-[#B74A26] hover:bg-[#a03f20] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {saveState === "saving" ? "Saving..." : "Save profile"}
      </button>

      {saveState === "saved" && (
        <p className="text-xs font-mono text-[#7A8452]">
          Profile synced.
        </p>
      )}
      {saveState === "error" && saveError && (
        <p className="text-xs font-mono text-[#B74A26]">Save failed: {saveError}</p>
      )}
    </section>
  );
}
