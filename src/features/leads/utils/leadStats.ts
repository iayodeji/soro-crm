import type { Lead } from "@/types";

export interface LeadStats {
  total: number;
  leadCount: number;
  prospectCount: number;
  clientCount: number;
  syncedCount: number;
  tasksSyncedCount: number;
}

export function getLeadStats(leads: Lead[]): LeadStats {
  return {
    total: leads.length,
    leadCount: leads.filter((l) => l.phase === "lead_found").length,
    prospectCount: leads.filter((l) => l.phase === "prospect_engaged").length,
    clientCount: leads.filter((l) => l.phase === "client_closed").length,
    syncedCount: leads.filter((l) => l.sheetsSynced).length,
    tasksSyncedCount: leads.filter((l) => l.tasksCreated).length,
  };
}
