import React, { useState, useEffect } from "react";
import {
  ArrowLeft, Sparkles, Check, User, Building2, Phone, HelpCircle,
  CornerDownRight, CheckCircle2, AlertCircle, FileText,
  FileDown, Layers, MessageSquare, Save
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Lead, Phase } from "@/types";

interface LeadDetailViewProps {
  lead: Lead | null;
  onClose: () => void;
  onUpdateLead: (lead: Lead) => Promise<void>;
  onLogActivity: (action: string, details: string, type: "success" | "info" | "warning") => void;
}

export const LeadDetailView: React.FC<LeadDetailViewProps> = ({
  lead,
  onClose,
  onUpdateLead,
  onLogActivity,
}) => {
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [phase, setPhase] = useState<Phase>("lead_found");
  const [isSaving, setIsSaving] = useState(false);

  // Sync state to current lead
  useEffect(() => {
    if (lead) {
      setName(lead.name || "");
      setCompanyName(lead.company_name || "");
      setEmail(lead.email || "");
      setPhone(lead.phone || "");
      setNotes(lead.notes || "");
      setPhase(lead.phase || "lead_found");
    }
  }, [lead]);

  if (!lead) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updatedLead = {
        ...lead,
        name: name.trim(),
        company_name: companyName.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        notes: notes.trim(),
        phase,
      };
      await onUpdateLead(updatedLead);
      onLogActivity(
        "Lead Updated",
        `Saved full profile updates for ${name} (${companyName})`,
        "success"
      );
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLocalCSVExportSingle = () => {
    try {
      const headers = ["Lead ID", "Founder Name", "Company", "Email", "Phone", "Phase", "Market-Fit Thesis", "Created At"];
      const row = [
        `"${lead.id}"`,
        `"${lead.name.replace(/"/g, '""')}"`,
        `"${lead.company_name.replace(/"/g, '""')}"`,
        `"${(lead.email || "").replace(/"/g, '""')}"`,
        `"${(lead.phone || "").replace(/"/g, '""')}"`,
        `"${lead.phase}"`,
        `"${(lead.marketFitThesis || "").replace(/"/g, '""')}"`,
        `"${lead.createdAt}"`
      ];

      const csvContent = [headers.join(","), row.join(",")].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Soro_Lead_${lead.name.replace(/\s+/g, "_")}_Export.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      onLogActivity("Lead Exported Offline", `Successfully downloaded direct offline Excel backup of ${lead.name}'s profile.`, "success");
    } catch (err: any) {
      onLogActivity("Export Failed", err.message || "Failed offline export", "warning");
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF2] text-[#1F1612] flex flex-col font-sans select-none antialiased">
      {/* Top Details Nav Bar */}
      <header className="border-b border-[#1F1612]/10 bg-white/85 backdrop-blur-md sticky top-0 z-40 px-3 sm:px-6 lg:px-8 py-3 sm:py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-xl border border-[#1F1612]/10 bg-white hover:bg-[#1F1612]/5 text-[#1F1612]/70 hover:text-[#B74A26] transition-all cursor-pointer flex items-center justify-center gap-1 text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider"
            >
              <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Back to Board</span>
            </button>
            <div className="h-5 sm:h-6 w-px bg-[#1F1612]/10 hidden sm:block" />
            <div className="hidden sm:block">
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#B74A26] block">
                Pipeline Lead File
              </span>
              <h2 className="font-serif font-bold text-base sm:text-lg italic text-[#1F1612] truncate max-w-[200px] sm:max-w-[280px]">
                {lead.name}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-3 sm:px-4 py-1.5 sm:py-2 bg-[#B74A26] hover:bg-[#B74A26]/90 disabled:opacity-50 text-[10px] sm:text-xs font-bold font-mono uppercase tracking-wider text-white rounded-xl shadow-xs transition-all flex items-center gap-1.5 sm:gap-2 cursor-pointer"
            >
              <Save className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span className="hidden sm:inline">{isSaving ? "Saving..." : "Save Updates"}</span>
              <span className="sm:hidden">{isSaving ? "..." : "Save"}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8 pb-20">

        {/* Left Column: Editable File Dossier */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white/60 border border-[#1F1612]/10 rounded-2xl p-6 shadow-sm space-y-5">
            <div className="border-b border-[#1F1612]/10 pb-3 flex items-center justify-between">
              <h3 className="font-serif text-lg font-bold italic text-[#1F1612]">Lead Dossier</h3>
              <span className="text-[10px] font-mono bg-[#B74A26]/10 text-[#B74A26] px-2.5 py-0.5 rounded-full font-bold uppercase">
                Profile
              </span>
            </div>

            {/* Founder Name */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold tracking-widest text-[#1F1612]/50 block">Founder Name</label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 w-4 h-4 text-[#1F1612]/30" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter founder full name..."
                  className="w-full bg-white border border-[#1F1612]/10 rounded-xl pl-9 pr-3 py-2 text-xs text-[#1F1612] outline-none focus:ring-1 focus:ring-[#B74A26]/30 transition-all font-serif font-bold disabled:bg-[#1F1612]/5 disabled:opacity-80"
                />
              </div>
            </div>

            {/* Company Name */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold tracking-widest text-[#1F1612]/50 block">Startup Company</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-2.5 w-4 h-4 text-[#1F1612]/30" />
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Enter company/project name..."
                  className="w-full bg-white border border-[#1F1612]/10 rounded-xl pl-9 pr-3 py-2 text-xs text-[#1F1612] outline-none focus:ring-1 focus:ring-[#B74A26]/30 transition-all font-mono font-semibold disabled:bg-[#1F1612]/5 disabled:opacity-80"
                />
              </div>
            </div>

            {/* Contact Email */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold tracking-widest text-[#1F1612]/50 block">Email Address</label>
              <div className="relative">
                <FileText className="absolute left-3 top-2.5 w-4 h-4 text-[#1F1612]/30" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="founder@domain.co"
                  className="w-full bg-white border border-[#1F1612]/10 rounded-xl pl-9 pr-3 py-2 text-xs text-[#1F1612] outline-none focus:ring-1 focus:ring-[#B74A26]/30 transition-all"
                />
              </div>
            </div>

            {/* Contact Phone */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold tracking-widest text-[#1F1612]/50 block">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 w-4 h-4 text-[#1F1612]/30" />
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 123-4567"
                  className="w-full bg-white border border-[#1F1612]/10 rounded-xl pl-9 pr-3 py-2 text-xs text-[#1F1612] outline-none focus:ring-1 focus:ring-[#B74A26]/30 transition-all"
                />
              </div>
            </div>

            {/* Pipeline Phase */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold tracking-widest text-[#1F1612]/50 block">Pipeline Stage</label>
              <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={() => setPhase("lead_found")}
                  className={`py-1.5 sm:py-2 text-[9px] sm:text-[10px] font-mono font-bold uppercase rounded-xl border text-center transition-all cursor-pointer ${
                    phase === "lead_found"
                      ? "bg-[#B74A26]/10 border-[#B74A26]/40 text-[#B74A26]"
                      : "bg-white border-[#1F1612]/10 text-[#1F1612]/60 hover:bg-[#1F1612]/5"
                  }`}
                >
                  Lead Found
                </button>
                <button
                  type="button"
                  onClick={() => setPhase("prospect_engaged")}
                  className={`py-1.5 sm:py-2 text-[9px] sm:text-[10px] font-mono font-bold uppercase rounded-xl border text-center transition-all cursor-pointer ${
                    phase === "prospect_engaged"
                      ? "bg-[#CFA331]/10 border-[#CFA331]/40 text-[#CFA331]"
                      : "bg-white border-[#1F1612]/10 text-[#1F1612]/60 hover:bg-[#1F1612]/5"
                  }`}
                >
                  Engaged
                </button>
                <button
                  type="button"
                  onClick={() => setPhase("client_closed")}
                  className={`py-1.5 sm:py-2 text-[9px] sm:text-[10px] font-mono font-bold uppercase rounded-xl border text-center transition-all cursor-pointer ${
                    phase === "client_closed"
                      ? "bg-[#7A8452]/10 border-[#7A8452]/40 text-[#7A8452]"
                      : "bg-white border-[#1F1612]/10 text-[#1F1612]/60 hover:bg-[#1F1612]/5"
                  }`}
                >
                  Closed
                </button>
              </div>
            </div>

            {/* Notes / Discovery Transcription Box */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold tracking-widest text-[#1F1612]/50 block">Discovery Field Notes / Bios</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={5}
                placeholder="Paste startup descriptions or notes compiled from active calls..."
                className="w-full bg-white border border-[#1F1612]/10 rounded-xl p-3 text-xs text-[#1F1612] outline-none focus:ring-1 focus:ring-[#B74A26]/30 transition-all font-sans leading-relaxed resize-none"
              />
            </div>
          </div>
        </div>

        {/* Right Columns: AI Coach Insights and Offline Backup */}
        <div className="lg:col-span-2 space-y-6">

          {/* Soro Coach Analysis */}
          <div className="bg-white/60 border border-[#1F1612]/10 rounded-2xl p-6 shadow-sm space-y-6">
            <div className="border-b border-[#1F1612]/5 pb-4 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <span className="p-1.5 rounded-lg bg-[#B74A26]/10 text-[#B74A26]">
                  <Sparkles className="w-5 h-5 animate-pulse" />
                </span>
                <div>
                  <h3 className="font-serif text-lg font-bold italic text-[#1F1612]">Soro "The Mom Test" Assistant</h3>
                  <p className="text-[10px] font-mono text-[#1F1612]/50">Proactive Market-Fit Alignment & Interactive Prompts</p>
                </div>
              </div>
              <span className="text-[10px] font-mono text-[#7A8452] bg-[#7A8452]/10 px-2.5 py-0.5 rounded-full font-bold uppercase">
                AI Active
              </span>
            </div>

            {/* Market Fit Thesis */}
            <div className="space-y-2">
              <span className="text-[10px] font-mono uppercase font-bold tracking-widest text-[#1F1612]/50 block border-b border-[#1F1612]/5 pb-1">
                Market-Fit Thesis Formulation
              </span>
              {lead.marketFitThesis ? (
                <div className="bg-[#B74A26]/5 border-l-2 border-[#B74A26] p-4 rounded-r-xl">
                  <p className="font-serif text-[15px] text-[#1F1612]/95 leading-relaxed italic">
                    "{lead.marketFitThesis}"
                  </p>
                </div>
              ) : (
                <div className="flex items-center space-x-2.5 py-4 text-xs text-[#1F1612]/40 italic bg-[#1F1612]/5 rounded-xl px-4">
                  <AlertCircle className="w-4 h-4 text-[#B74A26]" />
                  <span>No thesis generated yet. Soro will draft one once bios are parsed.</span>
                </div>
              )}
            </div>

            {/* Custom Discovery Questions */}
            <div className="space-y-3">
              <span className="text-[10px] font-mono uppercase font-bold tracking-widest text-[#1F1612]/50 block border-b border-[#1F1612]/5 pb-1">
                Custom Non-Leading Discovery Questions (The Mom Test)
              </span>
              {lead.momTestQuestions && lead.momTestQuestions.length > 0 ? (
                <div className="space-y-3.5">
                  {lead.momTestQuestions.map((q, idx) => (
                    <div key={idx} className="flex gap-3.5 bg-white/40 border border-[#1F1612]/5 rounded-xl p-3.5 shadow-2xs hover:border-[#1F1612]/15 transition-all">
                      <span className="text-[#B74A26] font-serif italic font-extrabold text-[17px] select-none shrink-0">
                        0{idx + 1}
                      </span>
                      <p className="text-xs leading-relaxed text-[#1F1612]/90 font-medium">
                        {q}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center space-x-2.5 py-4 text-xs text-[#1F1612]/40 italic bg-[#1F1612]/5 rounded-xl px-4">
                  <HelpCircle className="w-4 h-4 text-[#CFA331]" />
                  <span>No custom non-leading questions formulated.</span>
                </div>
              )}
            </div>
          </div>

          {/* Offline Backup Panel */}
          <div className="bg-white/60 border border-[#1F1612]/10 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="border-b border-[#1F1612]/5 pb-3 flex items-center justify-between">
              <h3 className="font-serif text-lg font-bold italic text-[#1F1612]">Accountability Hub</h3>
              <span className="text-[10px] font-mono text-[#1F1612]/40">Offline</span>
            </div>

            <button
              onClick={handleLocalCSVExportSingle}
              className="flex items-center justify-between p-4 bg-white hover:bg-[#7A8452]/5 border border-[#7A8452]/20 rounded-xl text-left transition-all cursor-pointer group shadow-2xs w-full"
              title="Instant backup download as Excel-ready CSV"
            >
              <div className="flex items-center space-x-3.5">
                <span className="p-2.5 rounded-xl bg-[#7A8452]/10 text-[#7A8452]">
                  <FileDown className="w-5 h-5" />
                </span>
                <div>
                  <p className="text-xs font-extrabold text-[#1F1612]">
                    Local Excel Backup
                  </p>
                  <p className="text-[10px] text-[#1F1612]/50 font-mono mt-0.5">
                    Save this lead's profile as a CSV
                  </p>
                </div>
              </div>
              <CornerDownRight className="w-4 h-4 text-[#1F1612]/30 group-hover:text-[#7A8452] transition-colors shrink-0" />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};
