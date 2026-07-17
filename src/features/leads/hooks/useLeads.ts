"use client";
import { useCallback, useEffect, useState } from "react";
import { downloadLeadsCsv } from "@/utils/csvExport";
import type { Lead, CreateLeadInput, Phase } from "@/types";
import type { LogActivityInput } from "@/types/activity";
import { readApiResponse } from "@/lib/safeApiResponse";

export function useLeads(logActivity: (input: LogActivityInput) => void) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadsLoaded, setLeadsLoaded] = useState(false);
  const [isParsing, setIsParsing] = useState(false);

  // Single-tenant: the server resolves the workspace id. No client-side team
  // selection is required anymore.
  useEffect(() => {
    let cancelled = false;
    setLeadsLoaded(false);
    fetch("/api/leads")
      .then((r) => (r.ok ? r.json() : { leads: [] }))
      .then((data) => {
        if (cancelled) return;
        setLeads(data.leads ?? []);
        setLeadsLoaded(true);
      })
      .catch(() => {
        if (cancelled) return;
        setLeads([]);
        setLeadsLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const updateLead = useCallback(
    async (updatedLead: Lead) => {
      const previousLead = leads.find((lead) => lead.id === updatedLead.id);
      setLeads((prev) => {
        const idx = prev.findIndex((l) => l.id === updatedLead.id);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = updatedLead;
          return copy;
        }
        return [...prev, updatedLead];
      });

      try {
        const res = await fetch("/api/leads", {
          method: previousLead ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lead: updatedLead }),
        });
        if (!res.ok) throw new Error("save failed");
      } catch (e: any) {
        setLeads((current) =>
          previousLead
            ? current.map((lead) => lead.id === previousLead.id ? previousLead : lead)
            : current.filter((lead) => lead.id !== updatedLead.id),
        );
        console.error("[useLeads] updateLead: server write FAILED.", e);
        logActivity({
          eventType: "generic",
          action: "Lead Save Failed",
          details: e?.message || "Unknown error while saving lead.",
          level: "warning",
        });
        throw e;
      }
    },
    [leads, logActivity]
  );

  const deleteLead = useCallback(
    async (leadId: string) => {
      const leadToDelete = leads.find((l) => l.id === leadId);
      setLeads((prev) => prev.filter((l) => l.id !== leadId));
      try {
        const res = await fetch(`/api/leads?leadId=${encodeURIComponent(leadId)}`, {
          method: "DELETE",
        });
        if (!res.ok) throw new Error("delete failed");
      } catch (e: any) {
        console.error("[useLeads] deleteLead: server delete FAILED.", e);
      }
      logActivity({
        eventType: "lead_deleted",
        action: "Lead Deleted",
        details: `Permanently removed "${leadToDelete?.name || "lead"}" from pipeline.`,
        level: "warning",
      });
    },
    [leads, logActivity]
  );

  const addNewLead = useCallback(
    async (phase: Phase) => {
      const timestamp = new Date().toISOString();
      const newLead: CreateLeadInput = {
        // Keep manual creation IDs just as collision-resistant as agent-created
        // leads. A timestamp alone can collide when requests are replayed or two
        // quick-add controls are used in the same millisecond.
        id: `lead-${crypto.randomUUID()}`,
        name: "New Founder Lead",
        company_name: "Acuity Labs",
        email: null,
        phone: null,
        notes: "Describe their operational bottleneck or recent workflow experience.",
        phase,
        createdAt: timestamp,
        updatedAt: timestamp,
        marketFitThesis: "A proactive target hypothesis relating to user feedback challenges.",
        momTestQuestions: [
          "How do you currently discover bottlenecks in your day-to-day workflow?",
          "When was the last time you bought a software solution for this challenge?",
          "Walk me through what happened when that software was deployed.",
        ],
      };
      try {
        await updateLead(newLead as Lead);
        logActivity({ eventType: "lead_added", action: "Manual Lead Added", details: `Created empty profile card on column ${phase}.`, level: "info" });
        return newLead;
      } catch {
        return null;
      }
    },
    [updateLead, logActivity]
  );

  const parseLead = useCallback(
    async (rawText: string, options: { useSearchGrounding: boolean; modelPreset: string }) => {
      setIsParsing(true);
      logActivity({
        eventType: "generic",
        action: "AI Pipeline Requested",
        details: `Analyzing unstructured raw input with preset '${options.modelPreset}'${options.useSearchGrounding ? " (Web Grounding active)" : ""}.`,
        level: "info",
      });

      try {
        const response = await fetch("/api/parse-lead", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rawText, useSearchGrounding: options.useSearchGrounding, modelPreset: options.modelPreset }),
        });
        const parsedData = await readApiResponse(response);
        if (!response.ok) throw new Error(typeof parsedData.error === "string" ? parsedData.error : "Failed to parse text via backend pipeline.");
        if (!parsedData.parsed_lead || typeof parsedData.parsed_lead !== "object" || !Array.isArray(parsedData.mom_test_questions)) {
          throw new Error("The AI returned an incomplete lead profile. Please try again.");
        }
        const parsedLead = parsedData.parsed_lead as Record<string, unknown>;
        const newLead: CreateLeadInput = {
          id: `lead-${Date.now()}`,
          name: typeof parsedLead.name === "string" ? parsedLead.name : "Unidentified Lead",
          company_name: typeof parsedLead.company_name === "string" ? parsedLead.company_name : "Startup",
          email: typeof parsedLead.email === "string" ? parsedLead.email : null,
          phone: typeof parsedLead.phone === "string" ? parsedLead.phone : null,
          notes: rawText,
          phase: "lead_found",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          marketFitThesis: typeof parsedData.market_fit_thesis === "string" ? parsedData.market_fit_thesis : "",
          momTestQuestions: parsedData.mom_test_questions.filter((question): question is string => typeof question === "string"),
        };
        await updateLead(newLead as Lead);

        if (parsedData.isFallback) {
          logActivity({
            eventType: "ai_parse_fallback",
            action: "Local Parse Fallback",
            details: `Using high-fidelity offline heuristic compiler to parse "${newLead.name}" at "${newLead.company_name}". (Define the "soroCRM" secret key in Settings > Secrets to unlock full AI).`,
            level: "warning",
          });
        } else {
          logActivity({
            eventType: "ai_parse_completed",
            action: "AI Parsing Completed",
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
    },
    [logActivity, updateLead]
  );

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

  const importLeads = useCallback(async (rows: Record<string, string>[]) => {
    const response = await fetch("/api/crm/import", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ entity: "people", rows }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "People import failed.");
    const imported = (payload.imported ?? []) as Lead[];
    setLeads((current) => [...imported, ...current]);
    logActivity({ eventType: "lead_added", action: "People CSV Imported", details: `Imported ${imported.length} people into the pipeline.`, level: "success" });
    return imported;
  }, [logActivity]);

  return { leads, leadsLoaded, isParsing, updateLead, deleteLead, addNewLead, parseLead, exportCsv, importLeads };
}
