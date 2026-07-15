"use client";
import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWorkspace } from "@/providers/WorkspaceProvider";
import { LeadDetailView } from "@/features/leads/components/LeadDetailView";

export default function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { leads, leadsLoaded, updateLead, legacyLogActivity } = useWorkspace();
  const { id } = use(params);
  const lead = leads.find((l) => l.id === id);

  // Leads load async on refresh. Only bounce back once we're confident the
  // leads have loaded and this id genuinely doesn't exist.
  useEffect(() => {
    if (leadsLoaded && !lead) router.replace("/crm");
  }, [leadsLoaded, lead, router]);

  if (!lead) return null;

  return (
    <LeadDetailView
      lead={lead}
      onClose={() => router.push("/crm")}
      onUpdateLead={updateLead}
      onLogActivity={legacyLogActivity}
    />
  );
}
