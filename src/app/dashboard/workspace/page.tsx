"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useClerkSync } from "@/hooks/useClerkSync";

export default function WorkspacePage() {
  const { orgId } = useAuth();
  const { isReady } = useClerkSync();
  const [projectName, setProjectName] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeOrgId = orgId || null;

  const handleCreateProject = async () => {
    if (!isReady || !activeOrgId) return;

    setStatus(null);
    setError(null);

    const trimmed = projectName.trim();
    if (!trimmed) {
      setError("Project name is required.");
      return;
    }

    try {
      const res = await fetch("/api/dashboard/workspace/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed, workspaceId: activeOrgId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create project.");
      }

      setStatus(`Project "${trimmed}" created.`);
      setProjectName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project.");
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF2] text-[#1F1612] font-sans antialiased flex flex-col">
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-8">
        <section className="space-y-2">
          <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#1F1612]/50">
            Workspace
          </p>
          <h1 className="font-serif font-bold italic text-3xl sm:text-4xl tracking-tight">
            Team Workspace
          </h1>
          <p className="text-sm text-[#1F1612]/60">
            {activeOrgId
              ? `Active organization: ${activeOrgId}`
              : "No active Clerk organization selected."}
          </p>
        </section>

        <section className="space-y-4 rounded-lg border border-[#1F1612]/10 bg-white p-6 shadow-sm">
          <h2 className="font-serif font-bold text-xl">Create Project</h2>

          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="Project name"
            className="w-full rounded-md border border-[#1F1612]/10 bg-[#FDFBF2] px-3 py-2 text-sm outline-none focus:border-[#1F1612]/30"
          />

          <button
            type="button"
            onClick={handleCreateProject}
            disabled={!isReady || !activeOrgId}
            className="rounded-md bg-[#1F1612] px-4 py-2 text-sm font-semibold text-[#FDFBF2] disabled:opacity-40"
          >
            Create Project
          </button>

          {status && <p className="text-sm text-green-700">{status}</p>}
          {error && <p className="text-sm text-red-700">{error}</p>}
        </section>
      </main>
    </div>
  );
}
