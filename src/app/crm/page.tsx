"use client";

import { useEffect, useState } from "react";
import { FileSpreadsheet } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useWorkspace } from "@/providers/WorkspaceProvider";
import { KanbanBoard } from "@/features/leads/components/KanbanBoard";
import { DeleteLeadModal } from "@/features/leads/components/DeleteLeadModal";
import { DashboardHeader } from "@/features/dashboard/components/DashboardHeader";
import { NotificationEngineControls } from "@/features/dashboard/components/NotificationEngineControls";
import { StatsCards } from "@/features/dashboard/components/StatsCards";
import { ActivityLedger } from "@/features/activity-feed/components/ActivityLedger";
import { getLeadStats } from "@/features/leads/utils/leadStats";
import { AgentCommandBar } from "@/features/agent/components/AgentCommandBar";
import { CsvImportExportModal, type CsvField } from "@/features/crm-import-export/components/CsvImportExportModal";

const peopleFields: CsvField[] = [
  { key: "name", label: "Full name", required: true }, { key: "company_name", label: "Company", required: true },
  { key: "email", label: "Email" }, { key: "phone", label: "Phone" }, { key: "notes", label: "Notes" }, { key: "phase", label: "Stage" },
  { key: "linkedinUrl", label: "LinkedIn URL" }, { key: "companyWebsite", label: "Company website" },
];

export default function CrmPage() {
  const router = useRouter();
  const { isLoaded, orgId } = useAuth();
  const {
    leads, isParsing, updateLead, deleteLead, addNewLead, parseLead, exportCsv, importLeads,
    fcmEnabled, toggleFcm, soundEnabled, toggleSound, dispatchTestPush,
    activityLogs, logActivity,
  } = useWorkspace();

  const [leadIdToConfirmDelete, setLeadIdToConfirmDelete] = useState<string | null>(null);
  const [csvOpen, setCsvOpen] = useState(false);

  useEffect(() => {
    if (isLoaded && !orgId) {
      router.replace("/crm/organizations");
    }
  }, [isLoaded, orgId, router]);

  if (!isLoaded || !orgId) return null;
  const stats = getLeadStats(leads);
  const leadToDelete = leads.find((l) => l.id === leadIdToConfirmDelete) || null;

  return (
    <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-20">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><DashboardHeader stats={stats} /><button onClick={() => setCsvOpen(true)} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-[#1F1612]/15 bg-white px-4 text-xs font-mono font-bold uppercase tracking-wider text-[#1F1612]/70 hover:bg-[#1F1612]/5"><FileSpreadsheet className="h-4 w-4" />CSV tools</button></div>

      <AgentCommandBar
        leads={leads}
        onUpdateLead={updateLead}
        onParse={async (text, options) => { await parseLead(text, options); }}
        isParsing={isParsing}
        logActivity={logActivity}
      />

      <KanbanBoard
        leads={leads}
        onUpdateLead={updateLead}
        onDeleteLead={async (id: string) => { setLeadIdToConfirmDelete(id); }}
        onSelectLead={(lead: { id: string }) => router.push(`/crm/leads/${lead.id}`)}
        onAddNewLead={addNewLead}
      />

      <NotificationEngineControls
        onExportCsv={exportCsv}
        fcmEnabled={fcmEnabled}
        onToggleFcm={toggleFcm}
        soundEnabled={soundEnabled}
        onToggleSound={toggleSound}
        onTestPush={dispatchTestPush}
      />

      <StatsCards stats={stats} />

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
      {csvOpen && <CsvImportExportModal entityLabel="People" fields={peopleFields} records={leads as unknown as Record<string, unknown>[]} onImport={importLeads} onClose={() => setCsvOpen(false)} />}
    </main>
  );
}
