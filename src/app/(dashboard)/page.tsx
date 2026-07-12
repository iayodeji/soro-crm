"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useWorkspace } from "@/providers/WorkspaceProvider";
import { OmniInput } from "@/features/leads/components/OmniInput";
import { KanbanBoard } from "@/features/leads/components/KanbanBoard";
import { DeleteLeadModal } from "@/features/leads/components/DeleteLeadModal";
import { DashboardHeader } from "@/features/dashboard/components/DashboardHeader";
import { NotificationEngineControls } from "@/features/dashboard/components/NotificationEngineControls";
import { StatsCards } from "@/features/dashboard/components/StatsCards";
import { ActivityLedger } from "@/features/activity-feed/components/ActivityLedger";
import { getLeadStats } from "@/features/leads/utils/leadStats";

export default function DashboardPage() {
  const router = useRouter();
  const {
    leads, isParsing, updateLead, deleteLead, addNewLead, parseLead, exportCsv,
    fcmEnabled, toggleFcm, soundEnabled, toggleSound, dispatchTestPush,
    activityLogs, isViewer,
  } = useWorkspace();

  const [leadIdToConfirmDelete, setLeadIdToConfirmDelete] = useState<string | null>(null);
  const stats = getLeadStats(leads);
  const leadToDelete = leads.find((l) => l.id === leadIdToConfirmDelete) || null;

  return (
    <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-20">
      <DashboardHeader stats={stats} />

      <NotificationEngineControls
        onExportCsv={exportCsv}
        fcmEnabled={fcmEnabled}
        onToggleFcm={toggleFcm}
        soundEnabled={soundEnabled}
        onToggleSound={toggleSound}
        onTestPush={dispatchTestPush}
      />

      <StatsCards stats={stats} />

      <OmniInput onParse={async (t, o) => { await parseLead(t, o); }} isParsing={isParsing} />

      <KanbanBoard
        leads={leads}
        onUpdateLead={updateLead}
        onDeleteLead={async (id: string) => { setLeadIdToConfirmDelete(id); }}
        onSelectLead={(lead: { id: string }) => router.push(`/leads/${lead.id}`)}
        onAddNewLead={addNewLead}
        isViewer={isViewer}
      />

      <ActivityLedger logs={activityLogs} />

      {leadToDelete && (
        <DeleteLeadModal
          lead={leadToDelete}
          onCancel={() => setLeadIdToConfirmDelete(null)}
          onConfirm={async () => {
            setLeadIdToConfirmDelete(null);
            await deleteLead(leadToDelete.id);
          }}
        />
      )}
    </main>
  );
}
