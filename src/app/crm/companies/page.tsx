"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, FileSpreadsheet, Globe, Plus, Search } from "lucide-react";
import { useWorkspace } from "@/providers/WorkspaceProvider";
import { EntityTabs } from "@/features/companies/components/EntityTabs";
import type { Company, Phase } from "@/types";
import { CsvImportExportModal, type CsvField } from "@/features/crm-import-export/components/CsvImportExportModal";

const companyFields: CsvField[] = [
  { key: "name", label: "Company name", required: true }, { key: "website", label: "Website" },
  { key: "industry", label: "Industry" }, { key: "notes", label: "Notes" }, { key: "phase", label: "Stage" },
];

const phaseDetails: Record<Phase, { label: string; className: string }> = {
  lead_found: { label: "Lead", className: "bg-[#B74A26]/10 text-[#9E3D1F] border-[#B74A26]/25" },
  prospect_engaged: { label: "Prospect", className: "bg-[#CFA331]/15 text-[#816113] border-[#CFA331]/30" },
  client_closed: { label: "Client", className: "bg-[#7A8452]/15 text-[#536035] border-[#7A8452]/30" },
};

export default function CompaniesPage() {
  const router = useRouter();
  const { companies, companiesLoaded, addNewCompany, importCompanies } = useWorkspace();
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState<"all" | Phase>("all");
  const [creating, setCreating] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);

  const visibleCompanies = useMemo(() => companies.filter((company: Company) => {
    const matchesQuery = [company.name, company.industry, company.website, company.notes]
      .filter(Boolean).some((value) => value!.toLowerCase().includes(query.toLowerCase()));
    return matchesQuery && (stage === "all" || company.phase === stage);
  }), [companies, query, stage]);

  const createCompany = async () => {
    setCreating(true);
    try {
      const company = await addNewCompany();
      router.push(`/crm/companies/${company.id}`);
    } finally {
      setCreating(false);
    }
  };

  return (
    <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20">
      <div className="flex flex-col gap-5 border-b border-[#1F1612]/15 pb-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold italic tracking-tight text-[#1F1612]">Companies</h1>
            <p className="mt-1 text-sm text-[#1F1612]/60">A shared view of every account, from first signal to signed client.</p>
          </div>
          <div className="flex flex-wrap gap-2"><button onClick={() => setCsvOpen(true)} className="min-h-11 inline-flex items-center justify-center gap-2 rounded-xl border border-[#1F1612]/15 bg-white px-4 text-xs font-mono font-bold uppercase tracking-wider text-[#1F1612]/70 hover:bg-[#1F1612]/5"><FileSpreadsheet className="h-4 w-4" />CSV tools</button><button onClick={createCompany} disabled={creating} className="min-h-11 inline-flex items-center justify-center gap-2 rounded-xl bg-[#B74A26] px-4 text-xs font-mono font-bold uppercase tracking-wider text-white shadow-sm transition-colors hover:bg-[#9E3D1F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B74A26] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60">
            <Plus className="h-4 w-4" aria-hidden="true" />
            {creating ? "Creating…" : "Add company"}
          </button></div>
        </div>
        <EntityTabs active="companies" />
      </div>

      <section aria-label="Company directory" className="mt-6 space-y-5">
        <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <div className="relative w-full md:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#1F1612]/45" aria-hidden="true" />
            <label className="sr-only" htmlFor="company-search">Search companies</label>
            <input id="company-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search companies, industry, or notes…" className="min-h-11 w-full rounded-xl border border-[#1F1612]/15 bg-white pl-10 pr-3 text-sm text-[#1F1612] outline-none transition-shadow placeholder:text-[#1F1612]/40 focus:ring-2 focus:ring-[#B74A26]/30" />
          </div>
          <div className="flex flex-wrap gap-2" aria-label="Filter companies by stage">
            {(["all", "lead_found", "prospect_engaged", "client_closed"] as const).map((value) => (
              <button key={value} onClick={() => setStage(value)} className={`min-h-10 rounded-lg border px-3 text-[10px] font-mono font-bold uppercase tracking-wider transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B74A26] ${stage === value ? "border-[#1F1612] bg-[#1F1612] text-white" : "border-[#1F1612]/15 bg-white text-[#1F1612]/60 hover:bg-[#1F1612]/5"}`}>
                {value === "all" ? "All" : phaseDetails[value].label}
              </button>
            ))}
          </div>
        </div>

        {!companiesLoaded ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Loading companies">
            {[0, 1, 2].map((item) => <div key={item} className="h-48 animate-pulse rounded-2xl border border-[#1F1612]/10 bg-white/60" />)}
          </div>
        ) : visibleCompanies.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#1F1612]/20 bg-white/35 px-6 py-16 text-center">
            <Building2 className="mx-auto h-10 w-10 text-[#1F1612]/30" aria-hidden="true" />
            <h2 className="mt-4 font-serif text-xl font-bold italic">{companies.length === 0 ? "Start your company directory" : "No matching companies"}</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#1F1612]/60">{companies.length === 0 ? "Add a company and assign it to a Lead, Prospect, or Client stage." : "Try a different search or stage filter."}</p>
            {companies.length === 0 && <button onClick={createCompany} disabled={creating} className="mt-6 min-h-11 rounded-xl bg-[#B74A26] px-4 text-xs font-mono font-bold uppercase tracking-wider text-white hover:bg-[#9E3D1F] disabled:opacity-60">Add your first company</button>}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visibleCompanies.map((company: Company) => {
              const stageInfo = phaseDetails[company.phase];
              return <article key={company.id} className="group flex min-h-52 flex-col rounded-2xl border border-[#1F1612]/12 bg-white/75 p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#B74A26]/35 hover:shadow-md">
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1F1612]/5 text-[#1F1612]/65"><Building2 className="h-5 w-5" aria-hidden="true" /></span>
                  <span className={`rounded-full border px-2.5 py-1 text-[10px] font-mono font-bold uppercase tracking-wider ${stageInfo.className}`}>{stageInfo.label}</span>
                </div>
                <h2 className="mt-4 font-serif text-xl font-bold text-[#1F1612]">{company.name}</h2>
                <p className="mt-1 min-h-5 text-xs font-mono text-[#1F1612]/55">{company.industry || "Industry not specified"}</p>
                <p className="mt-4 line-clamp-2 text-sm leading-5 text-[#1F1612]/70">{company.notes}</p>
                <div className="mt-auto flex items-center justify-between gap-3 pt-5">
                  {company.website ? <span className="inline-flex min-w-0 items-center gap-1 text-xs text-[#1F1612]/50"><Globe className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /><span className="truncate">{company.website.replace(/^https?:\/\//, "")}</span></span> : <span />}
                  <button onClick={() => router.push(`/crm/companies/${company.id}`)} className="min-h-10 shrink-0 rounded-lg border border-[#1F1612]/15 px-3 text-[10px] font-mono font-bold uppercase tracking-wider text-[#1F1612]/70 transition-colors hover:border-[#B74A26]/35 hover:bg-[#B74A26]/5 hover:text-[#B74A26] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B74A26]">Open profile</button>
                </div>
              </article>;
            })}
          </div>
        )}
      </section>
      {csvOpen && <CsvImportExportModal entityLabel="Companies" fields={companyFields} records={companies as unknown as Record<string, unknown>[]} onImport={importCompanies} onClose={() => setCsvOpen(false)} />}
    </main>
  );
}
