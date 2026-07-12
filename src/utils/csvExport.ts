import type { Lead } from "@/types";

function csvValue(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

export function buildLeadsCsv(leads: Lead[]): string {
  const headers = [
    "Lead ID", "Founder Name", "Company", "Email", "Phone", "Phase",
    "Market-Fit Thesis", "Created At", "Google Sheets Synced", "Google Tasks Synced",
  ];
  const rows = leads.map((lead) => [
    csvValue(lead.id),
    csvValue(lead.name),
    csvValue(lead.company_name),
    csvValue(lead.email || ""),
    csvValue(lead.phone || ""),
    csvValue(lead.phase),
    csvValue(lead.marketFitThesis || ""),
    csvValue(lead.createdAt),
    csvValue(lead.sheetsSynced ? "YES" : "NO"),
    csvValue(lead.tasksCreated ? "YES" : "NO"),
  ]);
  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

export function downloadLeadsCsv(leads: Lead[]): void {
  const blob = new Blob([buildLeadsCsv(leads)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `Soro_CRM_Discovery_Pipeline_${new Date().toISOString().split("T")[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
