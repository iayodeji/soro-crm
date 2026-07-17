"use client";

import { useMemo, useState, useEffect } from "react";
import { ArrowUp, Bot, CalendarDays, Check, Globe, LoaderCircle, Mail, Sparkles, MessageSquarePlus, BookOpen, X } from "lucide-react";
import type { Lead, CreateLeadInput, Phase, Session } from "@/types";
import type { LogActivityInput } from "@/types/activity";
import type { AgentAction, AgentPlan } from "@/features/agent/types";

const ACTION_LABELS: Record<AgentAction["type"], string> = {
  create_lead: "Create lead", update_lead: "Update lead", move_lead: "Move lead",
  draft_email: "Draft email", send_email: "Send email", schedule_meeting: "Schedule meeting",
};

const PHASES: Phase[] = ["lead_found", "prospect_engaged", "client_closed"];

interface AgentCommandBarProps {
  leads: Lead[];
  onUpdateLead: (lead: Lead) => Promise<void>;
  onParse: (rawText: string, options: { useSearchGrounding: boolean; modelPreset: string }) => Promise<void>;
  isParsing: boolean;
  logActivity: (input: LogActivityInput) => void;
}

export function AgentCommandBar({ leads, onUpdateLead, onParse, isParsing, logActivity }: AgentCommandBarProps) {
  const [mode, setMode] = useState<"ask" | "capture">("ask");
  const [prompt, setPrompt] = useState("");
  const [plan, setPlan] = useState<AgentPlan | null>(null);
  const [isPlanning, setIsPlanning] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [searchGrounding, setSearchGrounding] = useState(false);
  const [modelPreset, setModelPreset] = useState("low-latency");
  const [threadId, setThreadId] = useState<string | null>(null);
  const [threads, setThreads] = useState<Session[]>([]);
  const [threadTitle, setThreadTitle] = useState("New conversation");
  const [isKnowledgeOpen, setIsKnowledgeOpen] = useState(false);
  const [isSavingKnowledge, setIsSavingKnowledge] = useState(false);
  const [knowledgeForm, setKnowledgeForm] = useState({ salesProcess: "", leadScoringCriteria: "", commonObjections: "", customInstructions: "", pastDecisions: "" });

  const hasExternalActions = useMemo(() => plan?.actions.some((action) => action.type === "send_email" || action.type === "schedule_meeting") ?? false, [plan]);
  const isWorking = isPlanning || isParsing;

  useEffect(() => {
    let cancelled = false;
    fetch("/api/agent/sessions")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data.sessions) {
          setThreads(data.sessions);
          if (data.sessions.length > 0 && !threadId) {
            setThreadId(data.sessions[0].threadId);
            setThreadTitle(data.sessions[0].title || "Conversation");
          }
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const loadKnowledge = async () => {
    try {
      const res = await fetch("/api/agent/knowledge");
      const data = await res.json();
      if (data.knowledge) {
        setKnowledgeForm({
          salesProcess: data.knowledge.salesProcess || "",
          leadScoringCriteria: data.knowledge.leadScoringCriteria || "",
          commonObjections: data.knowledge.commonObjections || "",
          customInstructions: data.knowledge.customInstructions || "",
          pastDecisions: (data.knowledge.pastDecisions || []).map((d: any) => `${d.topic}: ${d.decision}`).join("\n"),
        });
      } else {
        setKnowledgeForm({ salesProcess: "", leadScoringCriteria: "", commonObjections: "", customInstructions: "", pastDecisions: "" });
      }
    } catch (e) {
      console.error("Failed to load knowledge:", e);
    }
  };

  const openKnowledge = () => {
    loadKnowledge();
    setIsKnowledgeOpen(true);
  };

  const saveKnowledge = async () => {
    setIsSavingKnowledge(true);
    try {
      const pastDecisions = knowledgeForm.pastDecisions.split("\n").filter((line) => line.trim()).map((line) => {
        const colonIndex = line.indexOf(":");
        if (colonIndex === -1) return null;
        const topic = line.slice(0, colonIndex).trim();
        const decision = line.slice(colonIndex + 1).trim();
        if (!topic || !decision) return null;
        return { topic, decision };
      }).filter((item): item is { topic: string; decision: string } => item !== null);
      const payload = {
        salesProcess: knowledgeForm.salesProcess,
        leadScoringCriteria: knowledgeForm.leadScoringCriteria,
        commonObjections: knowledgeForm.commonObjections,
        customInstructions: knowledgeForm.customInstructions,
        pastDecisions,
      };
      const res = await fetch("/api/agent/knowledge", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to save knowledge.");
      setIsKnowledgeOpen(false);
      logActivity({ eventType: "generic", action: "Team Knowledge Updated", details: "Updated agent team knowledge.", level: "success" });
    } catch (e: any) {
      alert(e.message || "Failed to save knowledge.");
    } finally {
      setIsSavingKnowledge(false);
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!prompt.trim() || isWorking) return;
    setPlan(null);
    if (mode === "capture") {
      await onParse(prompt, { useSearchGrounding: searchGrounding, modelPreset });
      setPrompt("");
      return;
    }

    setIsPlanning(true);
    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt, threadId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Soro could not understand that request.");
      setPlan(data);
      if (data.threadId && !threadId) {
        setThreadId(data.threadId);
      }
      if (data.sessionId) {
        const title = prompt.slice(0, 40) + (prompt.length > 40 ? "…" : "");
        setThreadTitle(title);
        setThreads((current) => {
          const exists = current.find((t) => t.id === data.sessionId);
          if (exists) return current.map((t) => t.id === data.sessionId ? { ...t, title, lastActivity: new Date().toISOString() } : t);
          return [data.session as Session, ...current];
        });
      }
      logActivity({ eventType: "generic", action: "Agent Plan Ready", details: `Soro planned ${data.actions.length} action${data.actions.length === 1 ? "" : "s"}.`, level: "info" });
    } catch (error: any) {
      setPlan({ response: error.message || "Soro could not create a plan.", actions: [] });
    } finally {
      setIsPlanning(false);
    }
  };

  const startNewThread = () => {
    setThreadId(null);
    setThreadTitle("New conversation");
    setPlan(null);
    setPrompt("");
  };

  const switchThread = (t: Session) => {
    setThreadId(t.threadId);
    setThreadTitle(t.title || "Conversation");
    setPlan(null);
    setPrompt("");
  };

  const getLead = (leadId?: string) => leads.find((lead) => lead.id === leadId);

  const applyAction = async (action: AgentAction) => {
    const existingLead = getLead(action.leadId);
    if (["update_lead", "move_lead", "draft_email", "send_email", "schedule_meeting"].includes(action.type) && !existingLead) throw new Error("Soro referenced a lead that no longer exists. Run the request again.");
    if (action.type === "create_lead") {
      const timestamp = new Date().toISOString();
      const newLead: CreateLeadInput = {
        id: `lead-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: action.name?.trim() || "Unidentified Lead",
        company_name: action.companyName?.trim() || "Unknown company",
        email: action.email || null,
        phone: action.phone || null,
        notes: action.notes || "Created by Soro agent.",
        phase: PHASES.includes(action.phase as Phase) ? action.phase as Phase : "lead_found",
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      await onUpdateLead(newLead as Lead);
      return;
    }
    if (action.type === "update_lead" || action.type === "move_lead") {
      await onUpdateLead({ ...existingLead!, name: action.name?.trim() || existingLead!.name, company_name: action.companyName?.trim() || existingLead!.company_name, email: action.email === undefined ? existingLead!.email : action.email, phone: action.phone === undefined ? existingLead!.phone : action.phone, notes: action.notes?.trim() || existingLead!.notes, phase: PHASES.includes(action.phase as Phase) ? action.phase as Phase : existingLead!.phase });
      return;
    }
    if (action.type === "send_email") {
      if (!existingLead!.email) throw new Error(`${existingLead!.name} has no email address.`);
      // Google Workspace dispatch has been removed. The lead is flagged locally
      // so the dossier reflects the intended outreach until you wire it back up.
      await onUpdateLead({ ...existingLead!, gmailSent: true });
      logActivity({ eventType: "generic", action: "Email Recorded", details: `Outreach to ${existingLead!.email} recorded locally (external dispatch disabled).`, level: "info" });
      return;
    }
    if (action.type === "schedule_meeting") {
      if (!existingLead!.email) throw new Error(`${existingLead!.name} has no email address for an invite.`);
      await onUpdateLead({ ...existingLead!, calendarScheduled: true });
      logActivity({ eventType: "generic", action: "Meeting Recorded", details: `Discovery meeting with ${existingLead!.name} recorded locally (external dispatch disabled).`, level: "info" });
    }
  };

  const applyPlan = async () => {
    if (!plan || isApplying) return;
    setIsApplying(true);
    try {
      for (const action of plan.actions) await applyAction(action);
      logActivity({ eventType: "generic", action: "Agent Plan Applied", details: `Soro completed ${plan.actions.length} CRM action${plan.actions.length === 1 ? "" : "s"}.`, level: "success" });
      setPrompt("");
      setPlan({ response: "Done. Your CRM is up to date.", actions: [] });
    } catch (error: any) {
      setPlan((current) => current ? { ...current, response: `Stopped: ${error.message || "an action failed."}` } : current);
      logActivity({ eventType: "generic", action: "Agent Plan Stopped", details: error.message || "An action failed.", level: "warning" });
    } finally {
      setIsApplying(false);
    }
  };

  const switchMode = (nextMode: "ask" | "capture") => { setMode(nextMode); setPlan(null); };

  return <section className="w-full max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
    <div className="rounded-2xl border border-[#B74A26]/20 bg-white/75 p-3 sm:p-5 shadow-sm backdrop-blur-md">
      <div className="mb-3 sm:mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2"><span className="rounded-xl bg-[#B74A26] p-2 text-[#FDFBF2]"><Bot className="h-4 w-4 sm:h-5 sm:w-5" /></span><div><p className="text-sm font-bold text-[#1F1612]">Soro Command Center</p><p className="text-[10px] sm:text-[11px] text-[#1F1612]/50">Ask, act, or turn raw context into a lead.</p></div></div>
        <div className="flex items-center gap-2">
          <div className="rounded-lg border border-[#1F1612]/10 bg-[#1F1612]/5 p-0.5 text-[10px] sm:text-xs font-semibold"><button type="button" onClick={() => switchMode("ask")} className={`rounded-md px-2 sm:px-3 py-1 ${mode === "ask" ? "bg-white text-[#1F1612] shadow-sm" : "text-[#1F1612]/55"}`}>Ask Soro</button><button type="button" onClick={() => switchMode("capture")} className={`rounded-md px-2 sm:px-3 py-1 ${mode === "capture" ? "bg-white text-[#1F1612] shadow-sm" : "text-[#1F1612]/55"}`}>Capture lead</button></div>
          <button type="button" onClick={openKnowledge} className="flex items-center gap-1 rounded-lg border border-[#1F1612]/10 bg-[#1F1612]/5 px-2 sm:px-2.5 py-1.5 text-[10px] sm:text-[11px] font-bold text-[#1F1612]/70 hover:bg-[#1F1612]/10"><BookOpen className="h-3 w-3 sm:h-3.5 sm:w-3.5" />Knowledge</button>
        </div>
      </div>
      {threads.length > 0 && <div className="mb-2 sm:mb-3 flex flex-wrap items-center gap-1.5 sm:gap-2">
        <button type="button" onClick={startNewThread} className="flex items-center gap-1 rounded-lg border border-[#1F1612]/10 bg-[#1F1612]/5 px-2 py-1 text-[10px] font-bold text-[#1F1612]/60 hover:bg-[#1F1612]/10"><MessageSquarePlus className="h-3 h-3" />New</button>
        {threads.map((t) => <button key={t.id} type="button" onClick={() => switchThread(t)} className={`rounded-lg border px-2 py-1 text-[10px] sm:text-[11px] font-semibold truncate max-w-[120px] sm:max-w-[160px] ${threadId === t.threadId ? "border-[#B74A26]/40 bg-[#B74A26]/10 text-[#B74A26]" : "border-[#1F1612]/10 bg-white text-[#1F1612]/70 hover:bg-[#1F1612]/5"}`}>{t.title || "Conversation"}</button>)}
      </div>}
      <form onSubmit={submit}>
        <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} disabled={isWorking} placeholder={mode === "ask" ? (threadId ? "Continue the conversation..." : "Ask Soro anything — follow up with Sarah next Tuesday") : "Paste a LinkedIn bio, email signature, meeting note, or transcript"} className="min-h-24 sm:min-h-28 w-full resize-none rounded-xl border border-[#1F1612]/10 bg-[#FDFBF2]/60 px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-[#1F1612] outline-none placeholder:text-[#1F1612]/40 focus:border-[#B74A26]/40" />
        <div className="mt-2 sm:mt-3 flex flex-wrap items-center justify-between gap-2 sm:gap-3">
          {mode === "capture" ? <div className="flex flex-wrap items-center gap-1.5 sm:gap-2"><div className="rounded-lg border border-[#1F1612]/10 bg-[#1F1612]/5 p-0.5 text-[10px] sm:text-[11px] font-bold"><button type="button" onClick={() => setModelPreset("low-latency")} className={`rounded-md px-1.5 sm:px-2 py-1 ${modelPreset === "low-latency" ? "bg-white shadow-sm" : "text-[#1F1612]/50"}`}>Lite</button><button type="button" onClick={() => setModelPreset("high-quality")} className={`rounded-md px-1.5 sm:px-2 py-1 ${modelPreset === "high-quality" ? "bg-white shadow-sm" : "text-[#1F1612]/50"}`}>Balanced</button><button type="button" onClick={() => setModelPreset("deep-reasoning")} className={`rounded-md px-1.5 sm:px-2 py-1 ${modelPreset === "deep-reasoning" ? "bg-white shadow-sm" : "text-[#1F1612]/50"}`}>Reason</button></div><button type="button" onClick={() => setSearchGrounding((active) => !active)} className={`flex items-center gap-1 rounded-lg border px-2 py-1.5 text-[10px] sm:text-[11px] font-bold ${searchGrounding ? "border-[#7A8452]/40 bg-[#7A8452]/10 text-[#7A8452]" : "border-[#1F1612]/10 text-[#1F1612]/55"}`}><Globe className="h-3 w-3 sm:h-3.5 sm:w-3.5" />Web research</button></div> : <p className="text-[10px] sm:text-[11px] text-[#1F1612]/50 hidden sm:block">Search leads · Write email · Update pipeline</p>}
          <button type="submit" disabled={!prompt.trim() || isWorking} className="flex items-center gap-2 rounded-xl bg-[#B74A26] px-3 sm:px-4 py-1.5 sm:py-2 text-xs font-bold text-[#FDFBF2] disabled:opacity-40">{isWorking ? <LoaderCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" /> : <ArrowUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}{isWorking ? "Working…" : mode === "ask" ? "Ask Soro" : "Create lead"}</button>
        </div>
      </form>
      {plan && <div className="mt-3 sm:mt-4 border-t border-[#1F1612]/10 pt-3 sm:pt-4"><div className="flex gap-2 text-sm leading-relaxed text-[#1F1612]"><Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#B74A26]" /><p>{plan.response}</p></div>{plan.actions.length > 0 && <div className="mt-2 sm:mt-3 space-y-2">{plan.actions.map((action, index) => <div key={`${action.type}-${index}`} className="flex items-center gap-2 rounded-lg bg-[#FDFBF2] px-2 sm:px-3 py-1.5 sm:py-2 text-xs text-[#1F1612]/75">{action.type === "send_email" ? <Mail className="h-3 h-3 sm:h-3.5 sm:w-3.5 text-[#B74A26]" /> : action.type === "schedule_meeting" ? <CalendarDays className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-[#CFA331]" /> : <Check className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-[#7A8452]" />}<span className="truncate">{ACTION_LABELS[action.type]}{action.leadId ? ` · ${getLead(action.leadId)?.name || action.leadId}` : action.name ? ` · ${action.name}` : ""}</span></div>)}<button type="button" onClick={applyPlan} disabled={isApplying} className="mt-2 rounded-xl bg-[#B74A26] px-3 sm:px-4 py-1.5 sm:py-2 text-xs font-bold text-[#FDFBF2] disabled:cursor-not-allowed disabled:opacity-40">{isApplying ? "Working…" : "Apply plan"}</button>{hasExternalActions && <p className="text-[10px] sm:text-[11px] text-[#1F1612]/45">Email and calendar actions are recorded locally; external dispatch was removed.</p>}</div>}</div>}
    </div>
    {isKnowledgeOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 sm:p-4">
      <div className="w-full max-w-lg rounded-2xl border border-[#1F1612]/10 bg-white p-4 sm:p-6 shadow-xl">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h3 className="text-sm font-bold text-[#1F1612]">Team Knowledge</h3>
          <button type="button" onClick={() => setIsKnowledgeOpen(false)} className="rounded-lg p-1 text-[#1F1612]/50 hover:bg-[#1F1612]/5"><X className="h-4 w-4" /></button>
        </div>
        <p className="text-[11px] text-[#1F1612]/55 mb-3 sm:mb-4">This context is injected into every Soro request so the agent understands how your team operates.</p>
        <div className="space-y-2 sm:space-y-3">
          <div>
            <label className="block text-[11px] font-bold text-[#1F1612]/70 mb-1">Sales Process</label>
            <textarea value={knowledgeForm.salesProcess} onChange={(e) => setKnowledgeForm({ ...knowledgeForm, salesProcess: e.target.value })} rows={2} className="w-full rounded-lg border border-[#1F1612]/10 bg-[#FDFBF2]/60 px-3 py-2 text-xs text-[#1F1612] outline-none focus:border-[#B74A26]/40" placeholder="How your team qualifies and moves leads..." />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[#1F1612]/70 mb-1">Lead Scoring Criteria</label>
            <textarea value={knowledgeForm.leadScoringCriteria} onChange={(e) => setKnowledgeForm({ ...knowledgeForm, leadScoringCriteria: e.target.value })} rows={2} className="w-full rounded-lg border border-[#1F1612]/10 bg-[#FDFBF2]/60 px-3 py-2 text-xs text-[#1F1612] outline-none focus:border-[#B74A26]/40" placeholder="What makes a lead hot, warm, or cold..." />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[#1F1612]/70 mb-1">Common Objections</label>
            <textarea value={knowledgeForm.commonObjections} onChange={(e) => setKnowledgeForm({ ...knowledgeForm, commonObjections: e.target.value })} rows={2} className="w-full rounded-lg border border-[#1F1612]/10 bg-[#FDFBF2]/60 px-3 py-2 text-xs text-[#1F1612] outline-none focus:border-[#B74A26]/40" placeholder="Typical pushbacks and how to handle them..." />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[#1F1612]/70 mb-1">Custom Instructions</label>
            <textarea value={knowledgeForm.customInstructions} onChange={(e) => setKnowledgeForm({ ...knowledgeForm, customInstructions: e.target.value })} rows={2} className="w-full rounded-lg border border-[#1F1612]/10 bg-[#FDFBF2]/60 px-3 py-2 text-xs text-[#1F1612] outline-none focus:border-[#B74A26]/40" placeholder="Any other rules or context Soro should know..." />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[#1F1612]/70 mb-1">Past Decisions (one per line: topic: decision)</label>
            <textarea value={knowledgeForm.pastDecisions} onChange={(e) => setKnowledgeForm({ ...knowledgeForm, pastDecisions: e.target.value })} rows={3} className="w-full rounded-lg border border-[#1F1612]/10 bg-[#FDFBF2]/60 px-3 py-2 text-xs text-[#1F1612] outline-none focus:border-[#B74A26]/40" placeholder="Pricing: we charge $49/month\nOutreach: prefer email over LinkedIn\nMarket: focusing on e-commerce founders" />
          </div>
        </div>
        <div className="mt-4 sm:mt-5 flex flex-col-reverse sm:flex-row justify-end gap-2">
          <button type="button" onClick={() => setIsKnowledgeOpen(false)} className="rounded-lg border border-[#1F1612]/10 px-4 py-2 text-xs font-bold text-[#1F1612]/70 hover:bg-[#1F1612]/5">Cancel</button>
          <button type="button" onClick={saveKnowledge} disabled={isSavingKnowledge} className="rounded-xl bg-[#B74A26] px-4 py-2 text-xs font-bold text-[#FDFBF2] disabled:opacity-40">{isSavingKnowledge ? "Saving…" : "Save knowledge"}</button>
        </div>
      </div>
    </div>}
  </section>;
}
