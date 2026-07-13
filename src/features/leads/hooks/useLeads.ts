"use client";
import { useCallback, useEffect, useState } from "react";
import { fetchLeadsByTeam, saveLeadForTeam, deleteLeadForTeam } from "@/lib/teamService";
import { downloadLeadsCsv } from "@/utils/csvExport";
import type { Lead, Phase, Team } from "@/types";
import type { LogActivityInput } from "@/types/activity";

export function useLeads(currentTeam: Team | null, logActivity: (input: LogActivityInput) => void) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadsLoaded, setLeadsLoaded] = useState(false);
  const [isParsing, setIsParsing] = useState(false);

  useEffect(() => {
    if (!currentTeam) return;
    let cancelled = false;
    setLeadsLoaded(false);
    fetchLeadsByTeam(currentTeam.id).then((teamLeads) => {
      if (cancelled) return;
      setLeads(teamLeads);
      setLeadsLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [currentTeam]);

  const updateLead = useCallback(async (updatedLead: Lead) => {
    setLeads((prev) => {
      const idx = prev.findIndex((l) => l.id === updatedLead.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = updatedLead;
        return copy;
      }
      return [...prev, updatedLead];
    });

    // --- DIAGNOSTIC: confirm whether the Firestore write actually runs ---
    if (!currentTeam) {
      console.warn(
        "[useLeads] updateLead: currentTeam is NULL — lead is in local UI state ONLY and will NOT be written to Firestore.",
        { leadId: updatedLead.id, name: updatedLead.name }
      );
      return;
    }
    try {
      await saveLeadForTeam(currentTeam.id, updatedLead);
      console.info("[useLeads] updateLead: Firestore write SUCCEEDED.", {
        leadId: updatedLead.id,
        teamId: currentTeam.id,
      });
    } catch (e: any) {
      console.error("[useLeads] updateLead: Firestore write FAILED.", e);
      logActivity({
        eventType: "generic",
        action: "Firestore Save Failed",
        details: e?.message || "Unknown error while saving lead to Firestore.",
        level: "warning",
      });
    }
  }, [currentTeam, logActivity]);

  const deleteLead = useCallback(async (leadId: string) => {
    const leadToDelete = leads.find((l) => l.id === leadId);
    setLeads((prev) => prev.filter((l) => l.id !== leadId));
    if (currentTeam) await deleteLeadForTeam(currentTeam.id, leadId);
    logActivity({
      eventType: "lead_deleted", action: "Lead Deleted",
      details: `Permanently removed "${leadToDelete?.name || "lead"}" from pipeline.`, level: "warning",
    });
  }, [leads, currentTeam, logActivity]);

  const addNewLead = useCallback(async (phase: Phase) => {
    const newLead: Lead = {
      id: `lead-${Date.now()}`,
      name: "New Founder Lead",
      company_name: "Acuity Labs",
      email: null,
      phone: null,
      notes: "Describe their operational bottleneck or recent workflow experience.",
      phase,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      marketFitThesis: "A proactive target hypothesis relating to user feedback challenges.",
      momTestQuestions: [
        "How do you currently discover bottlenecks in your day-to-day workflow?",
        "When was the last time you bought a software solution for this challenge?",
        "Walk me through what happened when that software was deployed.",
      ],
    };
    await updateLead(newLead);
    logActivity({ eventType: "lead_added", action: "Manual Lead Added", details: `Created empty profile card on column ${phase}.`, level: "info" });
    return newLead;
  }, [updateLead, logActivity]);

  const parseLead = useCallback(async (rawText: string, options: { useSearchGrounding: boolean; modelPreset: string }) => {
    setIsParsing(true);
    logActivity({
      eventType: "generic", action: "AI Pipeline Requested",
      details: `Analyzing unstructured raw input with preset '${options.modelPreset}'${options.useSearchGrounding ? " (Web Grounding active)" : ""}.`,
      level: "info",
    });

    try {
      const response = await fetch("/api/parse-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText, useSearchGrounding: options.useSearchGrounding, modelPreset: options.modelPreset }),
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to parse text via backend pipeline.");
      }
      const parsedData = await response.json();
      const newLead: Lead = {
        id: `lead-${Date.now()}`,
        name: parsedData.parsed_lead?.name || "Unidentified Lead",
        company_name: parsedData.parsed_lead?.company_name || "Startup",
        email: parsedData.parsed_lead?.email || null,
        phone: parsedData.parsed_lead?.phone || null,
        notes: rawText,
        phase: "lead_found",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        marketFitThesis: parsedData.market_fit_thesis,
        momTestQuestions: parsedData.mom_test_questions,
      };
      await updateLead(newLead);

      if (parsedData.isFallback) {
        logActivity({
          eventType: "ai_parse_fallback", action: "Local Parse Fallback",
          details: `Using high-fidelity offline heuristic compiler to parse "${newLead.name}" at "${newLead.company_name}". (Define the "soroCRM" secret key in Settings > Secrets to unlock full AI).`,
          level: "warning",
        });
      } else {
        logActivity({
          eventType: "ai_parse_completed", action: "AI Parsing Completed",
          details: `Discovered ${newLead.name} at ${newLead.company_name}. Compiled ${newLead.momTestQuestions?.length || 0} non-pitching questions.`,
          level: "success",
          leadOverride: { id: newLead.id, name: newLead.name },
        });
      }
      return newLead;
    } catch (e: any) {
      console.error("Parse Error:", e);
      logActivity({ eventType: "ai_parse_failed", action: "AI Parsing Failed", details: e.message || "Unstructured token lookup error.", level: "warning" });
      return null;
    } finally {
      setIsParsing(false);
    }
  }, [logActivity, updateLead]);

  const exportCsv = useCallback(() => {
    if (leads.length === 0) {
      logActivity({ eventType: "csv_export_failed", action: "Local CSV Export Failed", details: "No leads exist in the customer discovery console yet.", level: "warning" });
      return;
    }
    try {
      downloadLeadsCsv(leads);
      logActivity({ eventType: "csv_exported", action: "Local CSV Exported", details: "Successfully downloaded perfect Excel-ready spreadsheet of all active pipeline leads.", level: "success" });
    } catch (err: any) {
      logActivity({ eventType: "csv_export_failed", action: "CSV Export Failed", details: err.message || "Could not generate local backup", level: "warning" });
    }
  }, [leads, logActivity]);

  return { leads, leadsLoaded, isParsing, updateLead, deleteLead, addNewLead, parseLead, exportCsv };
}
