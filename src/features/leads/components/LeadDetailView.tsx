import React, { useState, useEffect } from "react";
import {
  ArrowLeft, Check, User, Building2, Phone, Linkedin, Globe,
  CornerDownRight, CheckCircle2, FileText,
  FileDown, Layers, MessageSquare, Save, Mail, CalendarDays, Send
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Lead, Phase } from "@/types";
import { ActivityTimeline } from "@/features/activities/components/ActivityTimeline";

interface LeadDetailViewProps {
  lead: Lead | null;
  onClose: () => void;
  onUpdateLead: (lead: Lead) => Promise<void>;
  onLogActivity: (action: string, details: string, type: "success" | "info" | "warning") => void;
  companies?: Array<{ id: string; name: string }>;
}

export const LeadDetailView: React.FC<LeadDetailViewProps> = ({
  lead,
  onClose,
  onUpdateLead,
  onLogActivity,
  companies = [],
}) => {
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [notes, setNotes] = useState("");
  const [phase, setPhase] = useState<Phase>("lead_found");
  const [isSaving, setIsSaving] = useState(false);
  const [mailSubject, setMailSubject] = useState("");
  const [mailBody, setMailBody] = useState("");
  const [meetingTitle, setMeetingTitle] = useState("");
  const [meetingStart, setMeetingStart] = useState("");
  const [meetingEnd, setMeetingEnd] = useState("");
  const [meetingNotes, setMeetingNotes] = useState("");
  const [workspaceAction, setWorkspaceAction] = useState<"mail" | "calendar" | null>(null);
  const [workspaceStatus, setWorkspaceStatus] = useState("");
  const [isWorkspaceWorking, setIsWorkspaceWorking] = useState(false);
  const [senders, setSenders] = useState<Array<{ sendAsEmail: string; displayName?: string; isDefault?: boolean }>>([]);
  const [selectedSender, setSelectedSender] = useState("");
  const [isLoadingSenders, setIsLoadingSenders] = useState(false);

  // Sync state to current lead
  useEffect(() => {
    if (lead) {
      setName(lead.name || "");
      setCompanyName(lead.company_name || "");
      setEmail(lead.email || "");
      setPhone(lead.phone || "");
      setLinkedinUrl(lead.linkedinUrl || "");
      setCompanyWebsite(lead.companyWebsite || "");
      setNotes(lead.notes || "");
      setPhase(lead.phase || "lead_found");
      setMailSubject(`Quick question about ${lead.company_name}`);
      setMailBody(`Hi ${lead.name},\n\nI’d love to learn about how you currently handle this workflow. Would you be open to a short conversation?\n\nBest,`);
      setMeetingTitle(`Discovery conversation — ${lead.name}`);
      setMeetingNotes(`Discovery conversation with ${lead.name} at ${lead.company_name}.`);
      setWorkspaceStatus("");
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
        linkedinUrl: linkedinUrl.trim() || null,
        companyWebsite: companyWebsite.trim() || null,
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
      const headers = ["Lead ID", "Founder Name", "Company", "Email", "Phone", "LinkedIn", "Company Website", "Phase", "Market-Fit Thesis", "Created At"];
      const row = [
        `"${lead.id}"`,
        `"${lead.name.replace(/"/g, '""')}"`,
        `"${lead.company_name.replace(/"/g, '""')}"`,
        `"${(lead.email || "").replace(/"/g, '""')}"`,
        `"${(lead.phone || "").replace(/"/g, '""')}"`,
        `"${(lead.linkedinUrl || "").replace(/"/g, '""')}"`,
        `"${(lead.companyWebsite || "").replace(/"/g, '""')}"`,
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

  const sendMail = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsWorkspaceWorking(true);
    setWorkspaceStatus("");
    try {
      const response = await fetch("/api/workspace/gmail", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: lead.id, subject: mailSubject, body: mailBody }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not send the email.");
      await onUpdateLead({ ...lead, gmailSent: true });
      setWorkspaceStatus("Email sent from your connected Gmail account.");
      onLogActivity("Gmail Sent", `Sent outreach to ${lead.email}.`, "success");
    } catch (error: any) {
      setWorkspaceStatus(error.message || "Could not send the email.");
    } finally {
      setIsWorkspaceWorking(false);
    }
  };

  const loadSenders = async () => {
    setIsLoadingSenders(true);
    setWorkspaceStatus("");
    try {
      const response = await fetch("/api/workspace/gmail/senders");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load your Gmail sender addresses.");
      setSenders(data.senders || []);
      setSelectedSender(data.preferred || "");
    } catch (error: any) {
      setWorkspaceStatus(error.message || "Could not load your Gmail sender addresses.");
    } finally {
      setIsLoadingSenders(false);
    }
  };

  const saveSender = async (fromEmail: string) => {
    setSelectedSender(fromEmail);
    setIsWorkspaceWorking(true);
    setWorkspaceStatus("");
    try {
      const response = await fetch("/api/workspace/gmail/senders", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fromEmail }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save your sender address.");
      setWorkspaceStatus("Sender saved for future emails.");
    } catch (error: any) {
      setWorkspaceStatus(error.message || "Could not save your sender address.");
      await loadSenders();
    } finally {
      setIsWorkspaceWorking(false);
    }
  };

  const scheduleMeeting = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsWorkspaceWorking(true);
    setWorkspaceStatus("");
    try {
      const response = await fetch("/api/workspace/calendar", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: lead.id, title: meetingTitle, description: meetingNotes, startAt: meetingStart, endAt: meetingEnd }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not create the calendar event.");
      await onUpdateLead({ ...lead, calendarScheduled: true });
      setWorkspaceStatus("Calendar event created and invitation sent.");
      onLogActivity("Calendar Scheduled", `Created a calendar event with ${lead.name}.`, "success");
    } catch (error: any) {
      setWorkspaceStatus(error.message || "Could not create the calendar event.");
    } finally {
      setIsWorkspaceWorking(false);
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
              <label className="text-[10px] uppercase font-bold tracking-widest text-[#1F1612]/50 block">LinkedIn Profile</label>
              <div className="relative">
                <Linkedin className="absolute left-3 top-2.5 w-4 h-4 text-[#1F1612]/30" />
                <input
                  type="url"
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                  placeholder="https://linkedin.com/in/founder"
                  className="w-full bg-white border border-[#1F1612]/10 rounded-xl pl-9 pr-3 py-2 text-xs text-[#1F1612] outline-none focus:ring-1 focus:ring-[#B74A26]/30 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold tracking-widest text-[#1F1612]/50 block">Company Website</label>
              <div className="relative">
                <Globe className="absolute left-3 top-2.5 w-4 h-4 text-[#1F1612]/30" />
                <input
                  type="url"
                  value={companyWebsite}
                  onChange={(e) => setCompanyWebsite(e.target.value)}
                  placeholder="https://company.com"
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

          <ActivityTimeline leadId={lead.id} people={[{ id: lead.id, name: lead.name }]} companies={companies} />

          <div className="bg-white/60 border border-[#1F1612]/10 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#1F1612]/5 pb-4">
              <div>
                <h3 className="font-serif text-lg font-bold italic text-[#1F1612]">Google Workspace</h3>
                <p className="text-[11px] text-[#1F1612]/55 mt-1">Send a personal email or create a calendar invite from this profile.</p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => { setWorkspaceAction("mail"); void loadSenders(); }} className={`min-h-10 inline-flex items-center gap-1.5 rounded-xl border px-3 text-[10px] font-mono font-bold uppercase tracking-wider transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B74A26] ${workspaceAction === "mail" ? "border-[#B74A26]/40 bg-[#B74A26]/10 text-[#B74A26]" : "border-[#1F1612]/10 bg-white text-[#1F1612]/65 hover:bg-[#1F1612]/5"}`}><Mail className="w-3.5 h-3.5" />Mail</button>
                <button type="button" onClick={() => { setWorkspaceAction("calendar"); setWorkspaceStatus(""); }} className={`min-h-10 inline-flex items-center gap-1.5 rounded-xl border px-3 text-[10px] font-mono font-bold uppercase tracking-wider transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CFA331] ${workspaceAction === "calendar" ? "border-[#CFA331]/40 bg-[#CFA331]/15 text-[#816113]" : "border-[#1F1612]/10 bg-white text-[#1F1612]/65 hover:bg-[#1F1612]/5"}`}><CalendarDays className="w-3.5 h-3.5" />Calendar</button>
              </div>
            </div>
            {!workspaceAction && <p className="rounded-xl bg-[#1F1612]/5 px-4 py-3 text-xs leading-relaxed text-[#1F1612]/60">Choose an action to prepare it first. Nothing is sent or scheduled until you confirm.</p>}
            {workspaceAction === "mail" && <form onSubmit={sendMail} className="space-y-3">
              {!lead.email && <p role="alert" className="rounded-xl border border-[#B74A26]/25 bg-[#B74A26]/5 px-3 py-2 text-xs text-[#9E3D1F]">Add an email address to this lead before sending outreach.</p>}
              <div><label htmlFor="mail-from" className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#1F1612]/55">Send from</label><select id="mail-from" value={selectedSender} disabled={isLoadingSenders || isWorkspaceWorking || senders.length === 0} onChange={(event) => void saveSender(event.target.value)} className="mt-1.5 min-h-11 w-full rounded-xl border border-[#1F1612]/10 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[#B74A26]/30 disabled:cursor-not-allowed disabled:opacity-60"><option value="">{isLoadingSenders ? "Loading approved Gmail addresses…" : senders.length === 0 ? "No approved sender addresses" : "Choose a sender address"}</option>{senders.map((sender) => <option key={sender.sendAsEmail} value={sender.sendAsEmail}>{sender.displayName ? `${sender.displayName} — ` : ""}{sender.sendAsEmail}{sender.isDefault ? " (Gmail default)" : ""}</option>)}</select><p className="mt-1.5 text-[11px] text-[#1F1612]/50">Only Gmail-verified aliases appear here. Your choice is remembered for future emails.</p></div>
              <div><label htmlFor="mail-subject" className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#1F1612]/55">Subject</label><input id="mail-subject" value={mailSubject} onChange={(event) => setMailSubject(event.target.value)} required className="mt-1.5 min-h-11 w-full rounded-xl border border-[#1F1612]/10 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[#B74A26]/30" /></div>
              <div><label htmlFor="mail-body" className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#1F1612]/55">Message</label><textarea id="mail-body" value={mailBody} onChange={(event) => setMailBody(event.target.value)} required rows={6} className="mt-1.5 w-full rounded-xl border border-[#1F1612]/10 bg-white p-3 text-sm leading-6 outline-none focus:ring-2 focus:ring-[#B74A26]/30" /></div>
              <button disabled={!lead.email || !selectedSender || isWorkspaceWorking || isLoadingSenders} className="min-h-11 inline-flex items-center gap-2 rounded-xl bg-[#B74A26] px-4 text-xs font-mono font-bold uppercase tracking-wider text-white hover:bg-[#9E3D1F] disabled:cursor-not-allowed disabled:opacity-50"><Send className="w-3.5 h-3.5" />{isWorkspaceWorking ? "Sending…" : "Send with Gmail"}</button>
            </form>}
            {workspaceAction === "calendar" && <form onSubmit={scheduleMeeting} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2"><label htmlFor="meeting-title" className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#1F1612]/55">Event title</label><input id="meeting-title" value={meetingTitle} onChange={(event) => setMeetingTitle(event.target.value)} required className="mt-1.5 min-h-11 w-full rounded-xl border border-[#1F1612]/10 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[#CFA331]/30" /></div>
              <div><label htmlFor="meeting-start" className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#1F1612]/55">Start</label><input id="meeting-start" type="datetime-local" value={meetingStart} onChange={(event) => setMeetingStart(event.target.value)} required className="mt-1.5 min-h-11 w-full rounded-xl border border-[#1F1612]/10 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[#CFA331]/30" /></div>
              <div><label htmlFor="meeting-end" className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#1F1612]/55">End</label><input id="meeting-end" type="datetime-local" value={meetingEnd} onChange={(event) => setMeetingEnd(event.target.value)} required className="mt-1.5 min-h-11 w-full rounded-xl border border-[#1F1612]/10 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[#CFA331]/30" /></div>
              <div className="sm:col-span-2"><label htmlFor="meeting-notes" className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#1F1612]/55">Invite notes</label><textarea id="meeting-notes" value={meetingNotes} onChange={(event) => setMeetingNotes(event.target.value)} rows={3} className="mt-1.5 w-full rounded-xl border border-[#1F1612]/10 bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-[#CFA331]/30" /></div>
              <div className="sm:col-span-2"><button disabled={isWorkspaceWorking} className="min-h-11 inline-flex items-center gap-2 rounded-xl bg-[#CFA331] px-4 text-xs font-mono font-bold uppercase tracking-wider text-[#1F1612] hover:bg-[#B78B20] disabled:cursor-not-allowed disabled:opacity-50"><CalendarDays className="w-3.5 h-3.5" />{isWorkspaceWorking ? "Scheduling…" : "Create calendar invite"}</button></div>
            </form>}
            {workspaceStatus && <p role="status" className={`rounded-xl px-3 py-2 text-xs ${workspaceStatus.includes("could not") || workspaceStatus.includes("Connect") || workspaceStatus.includes("Reconnect") ? "bg-[#B74A26]/5 text-[#9E3D1F]" : "bg-[#7A8452]/10 text-[#536035]"}`}>{workspaceStatus}</p>}
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
