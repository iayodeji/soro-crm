"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Building2, Globe, Save, Tag, Trash2 } from "lucide-react";
import { useWorkspace } from "@/providers/WorkspaceProvider";
import type { Company, Phase } from "@/types";
import { ActivityTimeline } from "@/features/activities/components/ActivityTimeline";

const stages: Array<{ value: Phase; label: string; activeClass: string }> = [
  { value: "lead_found", label: "Lead", activeClass: "border-[#B74A26]/40 bg-[#B74A26]/10 text-[#9E3D1F]" },
  { value: "prospect_engaged", label: "Prospect", activeClass: "border-[#CFA331]/40 bg-[#CFA331]/15 text-[#816113]" },
  { value: "client_closed", label: "Client", activeClass: "border-[#7A8452]/40 bg-[#7A8452]/15 text-[#536035]" },
];

export default function CompanyProfilePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { companies, leads, companiesLoaded, updateCompany, deleteCompany } = useWorkspace();
  const company = companies.find((item: Company) => item.id === params.id);
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [industry, setIndustry] = useState("");
  const [notes, setNotes] = useState("");
  const [phase, setPhase] = useState<Phase>("lead_found");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!company) return;
    setName(company.name);
    setWebsite(company.website || "");
    setIndustry(company.industry || "");
    setNotes(company.notes);
    setPhase(company.phase);
  }, [company]);

  if (!companiesLoaded) {
    return <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8"><div className="h-96 animate-pulse rounded-2xl border border-[#1F1612]/10 bg-white/60" /></main>;
  }

  if (!company) {
    return <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center"><h1 className="font-serif text-3xl font-bold italic">Company not found</h1><p className="mt-2 text-sm text-[#1F1612]/60">This company may have been removed or belongs to another workspace.</p><button onClick={() => router.push("/crm/companies")} className="mt-6 min-h-11 rounded-xl bg-[#1F1612] px-4 text-xs font-mono font-bold uppercase tracking-wider text-white">Back to companies</button></main>;
  }

  const save = async () => {
    if (!name.trim()) {
      setError("Enter a company name before saving.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await updateCompany({ ...company, name: name.trim(), website: website.trim() || null, industry: industry.trim() || null, notes: notes.trim(), phase });
    } catch {
      setError("We couldn’t save this company. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(`Delete ${company.name}? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await deleteCompany(company.id);
      router.push("/crm/companies");
    } catch {
      setError("We couldn’t delete this company. Please try again.");
      setDeleting(false);
    }
  };

  return (
    <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20">
      <header className="flex flex-col gap-4 border-b border-[#1F1612]/15 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-start gap-3">
          <button onClick={() => router.push("/crm/companies")} aria-label="Back to companies" className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#1F1612]/15 bg-white text-[#1F1612]/65 transition-colors hover:bg-[#1F1612]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B74A26]"><ArrowLeft className="h-4 w-4" aria-hidden="true" /></button>
          <div>
            <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#B74A26]">Company profile</p>
            <h1 className="mt-1 font-serif text-3xl font-bold italic tracking-tight text-[#1F1612]">{company.name}</h1>
          </div>
        </div>
        <button onClick={save} disabled={saving} className="min-h-11 inline-flex items-center justify-center gap-2 rounded-xl bg-[#B74A26] px-4 text-xs font-mono font-bold uppercase tracking-wider text-white transition-colors hover:bg-[#9E3D1F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B74A26] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"><Save className="h-4 w-4" aria-hidden="true" />{saving ? "Saving…" : "Save changes"}</button>
      </header>

      <form onSubmit={(event) => { event.preventDefault(); void save(); }} className="mt-8 rounded-2xl border border-[#1F1612]/12 bg-white/70 p-5 shadow-sm sm:p-7">
        <div className="flex items-center gap-2 border-b border-[#1F1612]/10 pb-4"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1F1612]/5 text-[#1F1612]/65"><Building2 className="h-4 w-4" aria-hidden="true" /></span><div><h2 className="font-serif text-xl font-bold italic">Company dossier</h2><p className="text-xs text-[#1F1612]/55">Keep account context and commercial stage in one place.</p></div></div>
        {error && <p role="alert" className="mt-5 rounded-xl border border-[#B74A26]/25 bg-[#B74A26]/5 px-3 py-2 text-sm text-[#9E3D1F]">{error}</p>}
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
          <label className="block sm:col-span-2"><span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#1F1612]/55">Company name <span aria-hidden="true">*</span></span><input required value={name} onChange={(event) => setName(event.target.value)} autoComplete="organization" className="mt-2 min-h-11 w-full rounded-xl border border-[#1F1612]/15 bg-white px-3 text-sm outline-none transition-shadow focus:ring-2 focus:ring-[#B74A26]/30" placeholder="e.g. Acme Labs" /></label>
          <label className="block"><span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#1F1612]/55">Industry</span><span className="relative mt-2 block"><Tag className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#1F1612]/35" aria-hidden="true" /><input value={industry} onChange={(event) => setIndustry(event.target.value)} className="min-h-11 w-full rounded-xl border border-[#1F1612]/15 bg-white pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-[#B74A26]/30" placeholder="e.g. Fintech" /></span></label>
          <label className="block"><span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#1F1612]/55">Website</span><span className="relative mt-2 block"><Globe className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#1F1612]/35" aria-hidden="true" /><input type="url" value={website} onChange={(event) => setWebsite(event.target.value)} className="min-h-11 w-full rounded-xl border border-[#1F1612]/15 bg-white pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-[#B74A26]/30" placeholder="https://company.com" /></span></label>
          <fieldset className="sm:col-span-2"><legend className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#1F1612]/55">Relationship stage</legend><div className="mt-2 grid grid-cols-3 gap-2">{stages.map((stage) => <button key={stage.value} type="button" onClick={() => setPhase(stage.value)} aria-pressed={phase === stage.value} className={`min-h-11 rounded-xl border px-2 text-xs font-mono font-bold uppercase tracking-wider transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B74A26] ${phase === stage.value ? stage.activeClass : "border-[#1F1612]/15 bg-white text-[#1F1612]/60 hover:bg-[#1F1612]/5"}`}>{stage.label}</button>)}</div><p className="mt-2 text-xs text-[#1F1612]/50">Classify this company as a Lead, Prospect, or Client.</p></fieldset>
          <label className="block sm:col-span-2"><span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#1F1612]/55">Relationship notes</span><textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={7} className="mt-2 w-full rounded-xl border border-[#1F1612]/15 bg-white p-3 text-sm leading-6 outline-none transition-shadow focus:ring-2 focus:ring-[#B74A26]/30" placeholder="What does this company do? Add context, buying signals, and relationship history…" /></label>
        </div>
      </form>
      <div className="mt-6"><ActivityTimeline companyId={company.id} people={leads.map((lead) => ({ id: lead.id, name: `${lead.name} · ${lead.company_name}` }))} companies={[{ id: company.id, name: company.name }]} /></div>
      <section className="mt-6 rounded-2xl border border-[#B74A26]/20 bg-[#B74A26]/5 p-5"><h2 className="font-serif text-lg font-bold italic text-[#1F1612]">Danger zone</h2><p className="mt-1 text-sm text-[#1F1612]/60">Deleting a company permanently removes its profile from this workspace.</p><button onClick={remove} disabled={deleting} className="mt-4 min-h-11 inline-flex items-center gap-2 rounded-xl border border-[#B74A26]/30 bg-white px-4 text-xs font-mono font-bold uppercase tracking-wider text-[#9E3D1F] transition-colors hover:bg-[#B74A26] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"><Trash2 className="h-4 w-4" aria-hidden="true" />{deleting ? "Deleting…" : "Delete company"}</button></section>
    </main>
  );
}
