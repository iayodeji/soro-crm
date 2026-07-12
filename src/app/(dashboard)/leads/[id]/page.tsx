"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWorkspace } from "@/providers/WorkspaceProvider";
import { LeadDetailView } from "@/features/leads/components/LeadDetailView";

export default function LeadDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { leads, leadsLoaded, accessToken, user, updateLead, legacyLogActivity, isViewer } = useWorkspace();
  const lead = leads.find((l) => l.id === params.id);

  // Leads load async on team switch/refresh. Only bounce back once we're
  // confident the team's leads have loaded and this id genuinely doesn't exist —
  // otherwise a hard refresh on this route would incorrectly redirect away.
  useEffect(() => {
    if (leadsLoaded && !lead) router.replace("/");
  }, [leadsLoaded, lead, router]);

  if (!lead) return null;

  return (
    <LeadDetailView
      lead={lead}
      onClose={() => router.push("/")}
      onUpdateLead={updateLead}
      accessToken={accessToken}
      user={user}
      onLogActivity={legacyLogActivity}
      isViewer={isViewer}
    />
  );
}
