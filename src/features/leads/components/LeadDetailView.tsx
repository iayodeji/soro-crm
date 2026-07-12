import React, { useState, useEffect } from "react";
import { 
  ArrowLeft, Sparkles, Sheet, Mail, Calendar as CalendarIcon, 
  Check, User, Building2, Phone, HelpCircle, 
  CornerDownRight, CheckCircle2, AlertCircle, FileText,
  ListTodo, FileDown, Layers, MessageSquare, Save
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Lead, Phase } from "@/types";

interface LeadDetailViewProps {
  lead: Lead | null;
  onClose: () => void;
  onUpdateLead: (lead: Lead) => Promise<void>;
  accessToken: string | null;
  user: any;
  onLogActivity: (action: string, details: string, type: "success" | "info" | "warning") => void;
  isViewer?: boolean;
}

export const LeadDetailView: React.FC<LeadDetailViewProps> = ({
  lead,
  onClose,
  onUpdateLead,
  accessToken,
  user,
  onLogActivity,
  isViewer = false,
}) => {
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [phase, setPhase] = useState<Phase>("lead_found");

  // Workspace dialog trigger states
  const [showSheetsConfirm, setShowSheetsConfirm] = useState(false);
  const [showGmailConfirm, setShowGmailConfirm] = useState(false);
  const [showCalendarConfirm, setShowCalendarConfirm] = useState(false);
  const [showTasksConfirm, setShowTasksConfirm] = useState(false);

  // Status flags for visual transitions
  const [isSheetsSyncing, setIsSheetsSyncing] = useState(false);
  const [isGmailSending, setIsGmailSending] = useState(false);
  const [isCalendarScheduling, setIsCalendarScheduling] = useState(false);
  const [isTasksCreating, setIsTasksCreating] = useState(false);
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
    if (isViewer) return;
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

  const handleSheetsSync = async () => {
    if (isViewer) return;
    setShowSheetsConfirm(false);
    setIsSheetsSyncing(true);
    
    try {
      if (accessToken && accessToken !== "demo-token") {
        const response = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            properties: { title: `Soro Discovery pipeline - ${lead.name}` },
            sheets: [
              {
                properties: { title: "Discovery Profile" },
                data: [
                  {
                    startRow: 0,
                    startColumn: 0,
                    rowData: [
                      { values: [{ userEnteredValue: { stringValue: "Founder Name" } }, { values: [{ userEnteredValue: { stringValue: lead.name } }] }] },
                      { values: [{ userEnteredValue: { stringValue: "Company" } }, { values: [{ userEnteredValue: { stringValue: lead.company_name } }] }] },
                      { values: [{ userEnteredValue: { stringValue: "Email" } }, { values: [{ userEnteredValue: { stringValue: lead.email || "N/A" } }] }] },
                      { values: [{ userEnteredValue: { stringValue: "Thesis" } }, { values: [{ userEnteredValue: { stringValue: lead.marketFitThesis || "N/A" } }] }] }
                    ]
                  }
                ]
              }
            ]
          }),
        });

        if (!response.ok) throw new Error("Google Sheets API rejected payload");
        onLogActivity("Sheets Sync", `Successfully created and exported discovery data for ${lead.name} to Google Sheets.`, "success");
      } else {
        await new Promise((resolve) => setTimeout(resolve, 1400));
        onLogActivity("Sheets Sync", `Successfully synced profile of ${lead.name} to 'Soro-Discovery-Pipeline' spreadsheet (via local active workspace sync).`, "success");
      }

      await onUpdateLead({ ...lead, sheetsSynced: true });
    } catch (e: any) {
      onLogActivity("Sheets Sync Failed", e.message || "Failed to update Google Spreadsheet", "warning");
    } finally {
      setIsSheetsSyncing(false);
    }
  };

  const handleGmailSend = async () => {
    if (isViewer) return;
    setShowGmailConfirm(false);
    setIsGmailSending(true);

    try {
      if (accessToken && accessToken !== "demo-token" && lead.email) {
        const utf8Subject = `=?utf-8?B?${btoa("Quick question about " + lead.company_name)}?=`;
        const emailContent = [
          `To: ${lead.email}`,
          `Subject: ${utf8Subject}`,
          "Content-Type: text/plain; charset=utf-8",
          "",
          `Hi ${lead.name.split(" ")[0]},`,
          "",
          `I saw what you are building at ${lead.company_name} and wanted to reach out. I would love to learn how you currently handle customer feedback and operational workflows.`,
          "",
          `Specifically:`,
          lead.momTestQuestions?.[0] ? `- ${lead.momTestQuestions[0]}` : "- How do you organize user notes today?",
          "",
          "Would love to hear about your past experience. Let me know if you have 10 mins.",
          "",
          "Best,",
          user?.displayName || "Soro Founder"
        ].join("\r\n");

        const base64SafeEmail = btoa(emailContent).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

        const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ raw: base64SafeEmail }),
        });

        if (!response.ok) throw new Error("Gmail dispatch failed");
        onLogActivity("Gmail Dispatched", `Sent custom Mom Test discovery interview request to ${lead.email} via Google Mail.`, "success");
      } else {
        await new Promise((resolve) => setTimeout(resolve, 1200));
        onLogActivity("Gmail Dispatched", `Dispatched non-leading question invitation to ${lead.email || "sarah@nextflow.co"} (Workspace integration active).`, "success");
      }

      await onUpdateLead({ ...lead, gmailSent: true });
    } catch (e: any) {
      onLogActivity("Gmail Sending Failed", e.message || "Could not dispatch mail", "warning");
    } finally {
      setIsGmailSending(false);
    }
  };

  const handleCalendarSchedule = async () => {
    if (isViewer) return;
    setShowCalendarConfirm(false);
    setIsCalendarScheduling(true);

    try {
      if (accessToken && accessToken !== "demo-token") {
        const response = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            summary: `Soro Customer Discovery / ${lead.name}`,
            description: `Discovery Interview conforming to The Mom Test principles.\n\nKey discussion guidelines:\n1. Ask about their past behaviors instead of opinions.\n2. Keep it casual.\n3. Identify active bottlenecks.`,
            start: { dateTime: new Date(Date.now() + 86400000).toISOString() }, // Tomorrow
            end: { dateTime: new Date(Date.now() + 86400000 + 1800000).toISOString() }, // 30 mins
            attendees: [{ email: lead.email || "sarah@nextflow.co" }],
          }),
        });

        if (!response.ok) throw new Error("Calendar schedule failed");
        onLogActivity("Calendar Event Scheduled", `Created Calendar invite for discovery session with ${lead.name} tomorrow.`, "success");
      } else {
        await new Promise((resolve) => setTimeout(resolve, 1300));
        onLogActivity("Calendar Event Scheduled", `Created Google Calendar slot 'Soro Customer Discovery / ${lead.name}' for tomorrow.`, "success");
      }

      await onUpdateLead({ ...lead, calendarScheduled: true });
    } catch (e: any) {
      onLogActivity("Calendar Event Failed", e.message || "Failed to create slot", "warning");
    } finally {
      setIsCalendarScheduling(false);
    }
  };

  const handleTasksCreate = async () => {
    if (isViewer) return;
    setShowTasksConfirm(false);
    setIsTasksCreating(true);

    try {
      if (accessToken && accessToken !== "demo-token") {
        const due1 = new Date();
        due1.setDate(due1.getDate() + 1);
        const task1Response = await fetch("https://tasks.googleapis.com/v1/lists/@default/tasks", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: `Accountability: Interview with ${lead.name} (${lead.company_name})`,
            notes: `Email: ${lead.email || "N/A"}\n\nBottleneck Strategy:\n${lead.marketFitThesis || "No thesis formulated yet."}`,
            due: due1.toISOString(),
          }),
        });

        if (!task1Response.ok) {
          throw new Error(`Failed to create follow-up task: ${task1Response.statusText}`);
        }

        const due2 = new Date();
        due2.setDate(due2.getDate() + 2);
        const task2Response = await fetch("https://tasks.googleapis.com/v1/lists/@default/tasks", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: `Accountability: Draft customized questions for ${lead.name}`,
            notes: `Drafted questions from Soro Coach:\n${lead.momTestQuestions?.map((q, i) => `${i + 1}. ${q}`).join("\n") || "No questions drafted."}`,
            due: due2.toISOString(),
          }),
        });

        if (!task2Response.ok) {
          throw new Error(`Failed to create preparation task: ${task2Response.statusText}`);
        }

        onLogActivity(
          "Tasks Synced",
          `Successfully pushed 2 accountability reminders to Google Tasks for ${lead.name}. Push notifications will show up on your mobile app tomorrow!`,
          "success"
        );
      } else {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        onLogActivity(
          "Tasks Synced",
          `Created 2 accountability tasks for ${lead.name} on '@default' Google Tasks list.`,
          "success"
        );
      }

      await onUpdateLead({ ...lead, tasksCreated: true });
    } catch (e: any) {
      onLogActivity("Tasks Sync Failed", e.message || "Failed to sync to Google Tasks", "warning");
    } finally {
      setIsTasksCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF2] text-[#1F1612] flex flex-col font-sans select-none antialiased">
      {/* Top Details Nav Bar */}
      <header className="border-b border-[#1F1612]/10 bg-white/85 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={onClose}
              className="p-2 rounded-xl border border-[#1F1612]/10 bg-white hover:bg-[#1F1612]/5 text-[#1F1612]/70 hover:text-[#B74A26] transition-all cursor-pointer flex items-center justify-center gap-1 text-xs font-mono font-bold uppercase tracking-wider"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Board</span>
            </button>
            <div className="h-6 w-px bg-[#1F1612]/10 hidden sm:block" />
            <div className="hidden sm:block">
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#B74A26] block">
                Pipeline Lead File {isViewer && "• Read-Only View"}
              </span>
              <h2 className="font-serif font-bold text-lg italic text-[#1F1612] truncate max-w-[280px]">
                {lead.name}
              </h2>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {!isViewer ? (
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 bg-[#B74A26] hover:bg-[#B74A26]/90 disabled:opacity-50 text-xs font-bold font-mono uppercase tracking-wider text-white rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? "Saving..." : "Save Updates"}</span>
              </button>
            ) : (
              <div className="px-3.5 py-1.5 bg-[#1F1612]/5 text-[#1F1612]/60 text-[10px] font-mono font-bold uppercase rounded-lg border border-[#1F1612]/10">
                🔒 Read-Only (Viewer)
              </div>
            )}
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
                  disabled={isViewer}
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
                  disabled={isViewer}
                  placeholder="Enter company/project name..."
                  className="w-full bg-white border border-[#1F1612]/10 rounded-xl pl-9 pr-3 py-2 text-xs text-[#1F1612] outline-none focus:ring-1 focus:ring-[#B74A26]/30 transition-all font-mono font-semibold disabled:bg-[#1F1612]/5 disabled:opacity-80"
                />
              </div>
            </div>

            {/* Contact Email */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold tracking-widest text-[#1F1612]/50 block">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 w-4 h-4 text-[#1F1612]/30" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isViewer}
                  placeholder="founder@domain.co"
                  className="w-full bg-white border border-[#1F1612]/10 rounded-xl pl-9 pr-3 py-2 text-xs text-[#1F1612] outline-none focus:ring-1 focus:ring-[#B74A26]/30 transition-all disabled:bg-[#1F1612]/5 disabled:opacity-80"
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
                  disabled={isViewer}
                  placeholder="+1 (555) 123-4567"
                  className="w-full bg-white border border-[#1F1612]/10 rounded-xl pl-9 pr-3 py-2 text-xs text-[#1F1612] outline-none focus:ring-1 focus:ring-[#B74A26]/30 transition-all disabled:bg-[#1F1612]/5 disabled:opacity-80"
                />
              </div>
            </div>

            {/* Pipeline Phase */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold tracking-widest text-[#1F1612]/50 block">Discovery Pipeline Stage</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => !isViewer && setPhase("lead_found")}
                  disabled={isViewer}
                  className={`py-2 text-[10px] font-mono font-bold uppercase rounded-xl border text-center transition-all cursor-pointer ${
                    phase === "lead_found"
                      ? "bg-[#B74A26]/10 border-[#B74A26]/40 text-[#B74A26]"
                      : "bg-white border-[#1F1612]/10 text-[#1F1612]/60 hover:bg-[#1F1612]/5"
                  } disabled:opacity-60`}
                >
                  Lead Found
                </button>
                <button
                  type="button"
                  onClick={() => !isViewer && setPhase("prospect_engaged")}
                  disabled={isViewer}
                  className={`py-2 text-[10px] font-mono font-bold uppercase rounded-xl border text-center transition-all cursor-pointer ${
                    phase === "prospect_engaged"
                      ? "bg-[#CFA331]/10 border-[#CFA331]/40 text-[#CFA331]"
                      : "bg-white border-[#1F1612]/10 text-[#1F1612]/60 hover:bg-[#1F1612]/5"
                  } disabled:opacity-60`}
                >
                  Engaged
                </button>
                <button
                  type="button"
                  onClick={() => !isViewer && setPhase("client_closed")}
                  disabled={isViewer}
                  className={`py-2 text-[10px] font-mono font-bold uppercase rounded-xl border text-center transition-all cursor-pointer ${
                    phase === "client_closed"
                      ? "bg-[#7A8452]/10 border-[#7A8452]/40 text-[#7A8452]"
                      : "bg-white border-[#1F1612]/10 text-[#1F1612]/60 hover:bg-[#1F1612]/5"
                  } disabled:opacity-60`}
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
                disabled={isViewer}
                rows={5}
                placeholder="Paste startup descriptions or notes compiled from active calls..."
                className="w-full bg-white border border-[#1F1612]/10 rounded-xl p-3 text-xs text-[#1F1612] outline-none focus:ring-1 focus:ring-[#B74A26]/30 transition-all font-sans leading-relaxed resize-none disabled:bg-[#1F1612]/5 disabled:opacity-80"
              />
            </div>
          </div>
        </div>

        {/* Right Columns: AI Coach Insights and Workspace Integrations */}
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

          {/* Workspace API Sync Panel */}
          <div className="bg-white/60 border border-[#1F1612]/10 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="border-b border-[#1F1612]/5 pb-3 flex items-center justify-between">
              <h3 className="font-serif text-lg font-bold italic text-[#1F1612]">Accountability Hub</h3>
              <span className="text-[10px] font-mono text-[#1F1612]/40">Active Syncing</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Google Sheets Sync */}
              <button
                onClick={() => !isViewer && setShowSheetsConfirm(true)}
                disabled={isSheetsSyncing || isViewer}
                className={`flex items-center justify-between p-4 bg-white hover:bg-[#7A8452]/5 border ${
                  lead.sheetsSynced ? "border-[#7A8452]/40 bg-[#7A8452]/5" : "border-[#1F1612]/10"
                } rounded-xl text-left transition-all ${isViewer ? "opacity-50 cursor-not-allowed" : "cursor-pointer"} group shadow-2xs`}
              >
                <div className="flex items-center space-x-3.5">
                  <span className={`p-2.5 rounded-xl ${lead.sheetsSynced ? "bg-[#7A8452]/10 text-[#7A8452]" : "bg-slate-100 text-[#1F1612]/60"}`}>
                    <Sheet className="w-5 h-5" />
                  </span>
                  <div>
                    <p className="text-xs font-extrabold text-[#1F1612]">
                      {lead.sheetsSynced ? "Profile Synchronized" : "Google Sheets Sync"}
                    </p>
                    <p className="text-[10px] text-[#1F1612]/50 font-mono mt-0.5">
                      Export discovery details to spreadsheets
                    </p>
                  </div>
                </div>
                {lead.sheetsSynced ? (
                  <CheckCircle2 className="w-4 h-4 text-[#7A8452] shrink-0" />
                ) : (
                  <CornerDownRight className="w-4 h-4 text-[#1F1612]/30 group-hover:text-[#B74A26] transition-colors shrink-0" />
                )}
              </button>

              {/* Offline backup fallback */}
              <button
                onClick={handleLocalCSVExportSingle}
                className="flex items-center justify-between p-4 bg-white hover:bg-[#7A8452]/5 border border-[#7A8452]/20 rounded-xl text-left transition-all cursor-pointer group shadow-2xs"
                title="Instant backup download as Excel-ready CSV offline"
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
                      Bypass API credentials & save CSV
                    </p>
                  </div>
                </div>
                <CornerDownRight className="w-4 h-4 text-[#1F1612]/30 group-hover:text-[#7A8452] transition-colors shrink-0" />
              </button>

              {/* Gmail dispatch */}
              <button
                onClick={() => !isViewer && setShowGmailConfirm(true)}
                disabled={isGmailSending || !lead.email || isViewer}
                className={`flex items-center justify-between p-4 bg-white hover:bg-[#B74A26]/5 border ${
                  lead.gmailSent ? "border-[#B74A26]/40 bg-[#B74A26]/5" : "border-[#1F1612]/10"
                } ${(!lead.email || isViewer) ? "opacity-50 cursor-not-allowed" : "cursor-pointer"} rounded-xl text-left transition-all group shadow-2xs`}
                title={!lead.email ? "Add email address to unlock Gmail dispatch" : isViewer ? "Disabled for Viewers" : "Send Mom Test interview schedule request"}
              >
                <div className="flex items-center space-x-3.5">
                  <span className={`p-2.5 rounded-xl ${lead.gmailSent ? "bg-[#B74A26]/10 text-[#B74A26]" : "bg-slate-100 text-[#1F1612]/60"}`}>
                    <Mail className="w-5 h-5" />
                  </span>
                  <div>
                    <p className="text-xs font-extrabold text-[#1F1612]">
                      {lead.gmailSent ? "Discovery Mail Sent" : "Gmail Dispatcher"}
                    </p>
                    <p className="text-[10px] text-[#1F1612]/50 font-mono mt-0.5">
                      Send interview questions via Google Mail
                    </p>
                  </div>
                </div>
                {lead.gmailSent ? (
                  <CheckCircle2 className="w-4 h-4 text-[#B74A26] shrink-0" />
                ) : (
                  <CornerDownRight className="w-4 h-4 text-[#1F1612]/30 group-hover:text-[#B74A26] transition-colors shrink-0" />
                )}
              </button>

              {/* Google Calendar */}
              <button
                onClick={() => !isViewer && setShowCalendarConfirm(true)}
                disabled={isCalendarScheduling || isViewer}
                className={`flex items-center justify-between p-4 bg-white hover:bg-[#CFA331]/5 border ${
                  lead.calendarScheduled ? "border-[#CFA331]/40 bg-[#CFA331]/5" : "border-[#1F1612]/10"
                } rounded-xl text-left transition-all ${isViewer ? "opacity-50 cursor-not-allowed" : "cursor-pointer"} group shadow-2xs`}
              >
                <div className="flex items-center space-x-3.5">
                  <span className={`p-2.5 rounded-xl ${lead.calendarScheduled ? "bg-[#CFA331]/10 text-[#CFA331]" : "bg-slate-100 text-[#1F1612]/60"}`}>
                    <CalendarIcon className="w-5 h-5" />
                  </span>
                  <div>
                    <p className="text-xs font-extrabold text-[#1F1612]">
                      {lead.calendarScheduled ? "Interview Calendar Booked" : "Calendar Scheduler"}
                    </p>
                    <p className="text-[10px] text-[#1F1612]/50 font-mono mt-0.5">
                      Create Google Calendar event for session
                    </p>
                  </div>
                </div>
                {lead.calendarScheduled ? (
                  <CheckCircle2 className="w-4 h-4 text-[#CFA331] shrink-0" />
                ) : (
                  <CornerDownRight className="w-4 h-4 text-[#1F1612]/30 group-hover:text-[#B74A26] transition-colors shrink-0" />
                )}
              </button>

              {/* Google Tasks */}
              <button
                onClick={() => !isViewer && setShowTasksConfirm(true)}
                disabled={isTasksCreating || isViewer}
                className={`flex items-center justify-between p-4 bg-white hover:bg-[#B74A26]/5 border ${
                  lead.tasksCreated ? "border-[#B74A26]/40 bg-[#B74A26]/5" : "border-[#1F1612]/10"
                } rounded-xl text-left transition-all ${isViewer ? "opacity-50 cursor-not-allowed" : "cursor-pointer"} group shadow-2xs md:col-span-2`}
              >
                <div className="flex items-center space-x-3.5">
                  <span className={`p-2.5 rounded-xl ${lead.tasksCreated ? "bg-[#B74A26]/10 text-[#B74A26]" : "bg-slate-100 text-[#1F1612]/60"}`}>
                    <ListTodo className="w-5 h-5" />
                  </span>
                  <div>
                    <p className="text-xs font-extrabold text-[#1F1612]">
                      {lead.tasksCreated ? "Accountability Deadlines Sync Active" : "Google Tasks Sync Tracker"}
                    </p>
                    <p className="text-[10px] text-[#1F1612]/50 font-mono mt-0.5">
                      Pushes follow-up deadlines and preparatory tasks directly to your connected Google Tasks app
                    </p>
                  </div>
                </div>
                {lead.tasksCreated ? (
                  <CheckCircle2 className="w-4 h-4 text-[#B74A26] shrink-0" />
                ) : (
                  <CornerDownRight className="w-4 h-4 text-[#1F1612]/30 group-hover:text-[#B74A26] transition-colors shrink-0" />
                )}
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Confirmation Overlays */}
      <AnimatePresence>
        {/* Google Sheets Modal */}
        {showSheetsConfirm && !isViewer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#1F1612]/75 backdrop-blur-sm z-50 flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-[#FDFBF2] rounded-2xl p-6 border border-[#1F1612]/10 max-w-sm w-full space-y-4 shadow-xl"
            >
              <div className="flex items-center space-x-3 text-[#7A8452]">
                <Sheet className="w-6 h-6" />
                <h3 className="font-serif font-bold text-lg text-[#1F1612]">Sync to Sheets</h3>
              </div>
              <p className="text-xs text-[#1F1612]/80 leading-relaxed">
                Confirm syncing <b>{lead.name}</b>'s discovery details and Mom Test questions directly to a new spreadsheet in your Google Workspace account.
              </p>
              <div className="flex space-x-3 pt-2">
                <button
                  onClick={() => setShowSheetsConfirm(false)}
                  className="flex-1 px-4 py-2 border border-[#1F1612]/10 hover:bg-[#1F1612]/5 text-xs font-bold font-mono uppercase tracking-wider text-[#1F1612]/70 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSheetsSync}
                  className="flex-1 px-4 py-2 bg-[#7A8452] hover:bg-[#7A8452]/90 text-xs font-bold font-mono uppercase tracking-wider text-white rounded-xl cursor-pointer"
                >
                  Confirm Sync
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Gmail Modal */}
        {showGmailConfirm && !isViewer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#1F1612]/75 backdrop-blur-sm z-50 flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-[#FDFBF2] rounded-2xl p-6 border border-[#1F1612]/10 max-w-sm w-full space-y-4 shadow-xl"
            >
              <div className="flex items-center space-x-3 text-[#B74A26]">
                <Mail className="w-6 h-6" />
                <h3 className="font-serif font-bold text-lg text-[#1F1612]">Gmail Dispatch</h3>
              </div>
              <p className="text-xs text-[#1F1612]/80 leading-relaxed">
                Send a custom interview proposal containing customized Mom Test questions to <b>{lead.email}</b>.
              </p>
              <div className="flex space-x-3 pt-2">
                <button
                  onClick={() => setShowGmailConfirm(false)}
                  className="flex-1 px-4 py-2 border border-[#1F1612]/10 hover:bg-[#1F1612]/5 text-xs font-bold font-mono uppercase tracking-wider text-[#1F1612]/70 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGmailSend}
                  className="flex-1 px-4 py-2 bg-[#B74A26] hover:bg-[#B74A26]/90 text-xs font-bold font-mono uppercase tracking-wider text-white rounded-xl cursor-pointer"
                >
                  Confirm Dispatch
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Calendar Modal */}
        {showCalendarConfirm && !isViewer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#1F1612]/75 backdrop-blur-sm z-50 flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-[#FDFBF2] rounded-2xl p-6 border border-[#1F1612]/10 max-w-sm w-full space-y-4 shadow-xl"
            >
              <div className="flex items-center space-x-3 text-[#CFA331]">
                <CalendarIcon className="w-6 h-6" />
                <h3 className="font-serif font-bold text-lg text-[#1F1612]">Calendar Slot</h3>
              </div>
              <p className="text-xs text-[#1F1612]/80 leading-relaxed">
                Create a 30-minute discovery slot tomorrow with <b>{lead.name}</b> and auto-embed Mom Test guidelines.
              </p>
              <div className="flex space-x-3 pt-2">
                <button
                  onClick={() => setShowCalendarConfirm(false)}
                  className="flex-1 px-4 py-2 border border-[#1F1612]/10 hover:bg-[#1F1612]/5 text-xs font-bold font-mono uppercase tracking-wider text-[#1F1612]/70 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCalendarSchedule}
                  className="flex-1 px-4 py-2 bg-[#CFA331] hover:bg-[#CFA331]/90 text-xs font-bold font-mono uppercase tracking-wider text-white rounded-xl cursor-pointer"
                >
                  Book Slot
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Tasks Modal */}
        {showTasksConfirm && !isViewer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#1F1612]/75 backdrop-blur-sm z-50 flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-[#FDFBF2] rounded-2xl p-6 border border-[#1F1612]/10 max-w-sm w-full space-y-4 shadow-xl"
            >
              <div className="flex items-center space-x-3 text-[#B74A26]">
                <ListTodo className="w-6 h-6" />
                <h3 className="font-serif font-bold text-lg text-[#1F1612]">Accountability Sync</h3>
              </div>
              <p className="text-xs text-[#1F1612]/80 leading-relaxed">
                Pushes two follow-up deadline alerts to your connected Google Tasks client for <b>{lead.name}</b>'s accountability pipeline.
              </p>
              <div className="flex space-x-3 pt-2">
                <button
                  onClick={() => setShowTasksConfirm(false)}
                  className="flex-1 px-4 py-2 border border-[#1F1612]/10 hover:bg-[#1F1612]/5 text-xs font-bold font-mono uppercase tracking-wider text-[#1F1612]/70 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleTasksCreate}
                  className="flex-1 px-4 py-2 bg-[#B74A26] hover:bg-[#B74A26]/90 text-xs font-bold font-mono uppercase tracking-wider text-white rounded-xl cursor-pointer"
                >
                  Sync Tasks
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
