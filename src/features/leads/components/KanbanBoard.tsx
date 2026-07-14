import React, { useState } from "react";
import { Plus, Eye, Search, X, User, Building2, Trash2, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Lead, Phase } from "@/types";
import { LeadSlideshow } from "./LeadSlideshow";

interface KanbanBoardProps {
  leads: Lead[];
  onUpdateLead: (lead: Lead) => Promise<void>;
  onDeleteLead: (leadId: string) => Promise<void>;
  onSelectLead: (lead: Lead) => void;
  selectedLeadId?: string;
  onAddNewLead: (phase: Phase) => void;
}

/**
 * Collaborative Kanban Board displaying discovery pipelines.
 * Features 3 columns with a compact cascade slideshow view of top 3 items to optimize space,
 * along with a comprehensive "See All" overlay index for stage-level browsing.
 */
export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  leads,
  onDeleteLead,
  onSelectLead,
  onAddNewLead,
}) => {
  const [selectedPhaseView, setSelectedPhaseView] = useState<Phase | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const columns: { id: Phase; title: string; subtitle: string; color: string; bg: string }[] = [
    {
      id: "lead_found",
      title: "Lead Found",
      subtitle: "Raw discovery target profiles",
      color: "#B74A26", // Terracotta
      bg: "bg-[#B74A26]/5",
    },
    {
      id: "prospect_engaged",
      title: "Prospect (Engaged)",
      subtitle: "Active conversations running",
      color: "#CFA331", // Ochre
      bg: "bg-[#CFA331]/5",
    },
    {
      id: "client_closed",
      title: "Client (Closed)",
      subtitle: "Discovery completed successfully",
      color: "#7A8452", // Muted Sage
      bg: "bg-[#7A8452]/5",
    },
  ];

  // Retrieve details for the active phase modal
  const activeCol = columns.find(col => col.id === selectedPhaseView);
  const activePhaseLeads = selectedPhaseView 
    ? leads.filter(lead => lead.phase === selectedPhaseView)
    : [];

  // Filter leads within the See All modal based on search query
  const filteredModalLeads = activePhaseLeads.filter(lead => 
    lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lead.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (lead.notes || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="relative">
      {/* 3-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
        {columns.map((column) => {
          const columnLeads = leads.filter((lead) => lead.phase === column.id);

          return (
            <div
              key={column.id}
              className={`flex flex-col rounded-2xl border border-[#1F1612]/10 overflow-hidden ${column.bg} backdrop-blur-sm shadow-sm transition-all h-auto pb-1`}
            >
              {/* Column Header */}
              <div className={`px-5 py-3 border-b flex items-center justify-between transition-colors ${
                column.id === "lead_found" 
                  ? "border-[#B74A26]/30" 
                  : column.id === "prospect_engaged" 
                  ? "border-[#CFA331]/30" 
                  : "border-[#7A8452]/30"
              }`}>
                <div>
                  <h3 className="font-serif text-[17px] italic font-bold text-[#1F1612] flex items-center gap-2">
                    <span
                      className="w-2 rounded-full h-2"
                      style={{ backgroundColor: column.color }}
                    />
                    {column.title}
                  </h3>
                  <p className="text-[9px] font-mono font-bold uppercase tracking-widest text-[#1F1612]/50 mt-0.5">
                    {column.subtitle} • {columnLeads.length < 10 ? `0${columnLeads.length}` : columnLeads.length}
                  </p>
                </div>

                {/* Quick Add Button */}
                <button
                  onClick={() => onAddNewLead(column.id)}
                  className="p-1 rounded-lg border border-[#1F1612]/10 bg-white hover:bg-[#B74A26] hover:text-[#FDFBF2] hover:border-[#B74A26] text-[#1F1612]/70 transition-all cursor-pointer"
                  title={`Add new lead to ${column.title}`}
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Compact Cascade / Slideshow container */}
              <div className="p-3">
                <LeadSlideshow
                  leads={columnLeads}
                  onSelectLead={onSelectLead}
                  onDeleteLead={onDeleteLead}
                />
              </div>

              {/* See All Button at bottom of column */}
              <div className="px-2 sm:px-3 pb-2 sm:pb-3 pt-1 text-center">
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedPhaseView(column.id);
                  }}
                  className="w-full py-2 px-2 sm:px-3 border border-[#1F1612]/10 hover:border-[#B74A26]/30 bg-white/60 hover:bg-white text-[10px] sm:text-[11px] font-mono font-bold uppercase tracking-wider text-[#1F1612]/70 hover:text-[#B74A26] rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 shadow-2xs"
                >
                  <Eye className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  <span className="truncate">See all ({columnLeads.length})</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Polish Overlay / Slide-out Modal for browsing all items of a phase */}
      <AnimatePresence>
        {selectedPhaseView && activeCol && (
          <div className="fixed inset-0 bg-[#1F1612]/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", duration: 0.35 }}
              className="bg-[#FDFBF2] rounded-2xl sm:rounded-3xl border border-[#1F1612]/15 w-full max-w-2xl h-[85vh] sm:h-[85vh] flex flex-col shadow-2xl overflow-hidden text-[#1F1612]"
            >
              {/* Modal Header */}
              <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-[#1F1612]/10 bg-white/80 backdrop-blur-md flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: activeCol.color }}
                    />
                    <h2 className="font-serif font-bold italic text-lg sm:text-xl">
                      {activeCol.title} Workspace Directory
                    </h2>
                  </div>
                  <p className="text-[10px] font-mono text-[#1F1612]/50 uppercase tracking-wider mt-0.5">
                    Viewing all {activePhaseLeads.length} entries
                  </p>
                </div>
                <button
                  onClick={() => setSelectedPhaseView(null)}
                  className="p-1.5 rounded-xl border border-[#1F1612]/10 bg-white hover:bg-[#1F1612]/5 text-[#1F1612]/60 hover:text-[#B74A26] transition-all cursor-pointer flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Search & Statistics Bar */}
              <div className="p-3 sm:p-4 bg-white/40 border-b border-[#1F1612]/5 flex flex-col sm:flex-row gap-2 sm:gap-3 items-center justify-between">
                <div className="relative w-full sm:max-w-xs">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-[#1F1612]/30" />
                  <input
                    type="text"
                    placeholder="Search name, startup, or thesis..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white border border-[#1F1612]/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-[#1F1612] outline-none focus:ring-1 focus:ring-[#B74A26]/30 transition-all font-mono"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-2.5 text-[#1F1612]/40 hover:text-[#1F1612]"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#1F1612]/50">
                  Matches: {filteredModalLeads.length} of {activePhaseLeads.length}
                </div>
              </div>

              {/* Scrollable list content */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 sm:space-y-4">
                {filteredModalLeads.length === 0 ? (
                  <div className="h-40 sm:h-60 border border-dashed border-[#1F1612]/10 rounded-2xl flex flex-col items-center justify-center text-xs text-[#1F1612]/40 italic gap-2 bg-white/20">
                    <span>No discovery matching your queries.</span>
                    <button
                      onClick={() => onAddNewLead(activeCol.id)}
                      className="px-3 py-1.5 border border-[#B74A26]/30 text-[#B74A26] font-mono text-[10px] rounded-lg bg-white uppercase font-bold hover:bg-[#B74A26] hover:text-white transition-all cursor-pointer"
                    >
                      + Create New Discovery Lead
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                    {filteredModalLeads.map((lead) => (
                      <div
                        key={lead.id}
                        onClick={() => {
                          setSelectedPhaseView(null);
                          onSelectLead(lead);
                        }}
                        className="bg-white border border-[#1F1612]/10 rounded-2xl p-3 sm:p-4 shadow-2xs hover:shadow-md hover:border-[#B74A26]/30 transition-all cursor-pointer flex flex-col justify-between group h-32 sm:h-40"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <User className="w-3.5 h-3.5 text-[#1F1612]/40 shrink-0" />
                              <span className="font-serif font-bold text-xs text-[#1F1612] truncate">
                                {lead.name}
                              </span>
                            </div>
                            <div className="flex items-center space-x-1 shrink-0 opacity-60">
                              {lead.sheetsSynced && (
                                <span className="w-1.5 h-1.5 rounded-full bg-[#7A8452]" title="Synced to Sheets" />
                              )}
                              {lead.gmailSent && (
                                <span className="w-1.5 h-1.5 rounded-full bg-[#B74A26]" title="Discovery email sent" />
                              )}
                              {lead.calendarScheduled && (
                                <span className="w-1.5 h-1.5 rounded-full bg-[#CFA331]" title="Interview scheduled" />
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-[#1F1612]/40 shrink-0" />
                            <span className="text-[10px] font-mono font-medium text-[#1F1612]/70 truncate">
                              {lead.company_name}
                            </span>
                          </div>

                          <p className="text-[11px] text-[#1F1612]/75 leading-relaxed pt-2 border-t border-[#1F1612]/5 line-clamp-2">
                            {lead.notes || "No discovery notes formulated yet."}
                          </p>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-[#1F1612]/5 mt-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteLead(lead.id);
                            }}
                            className="p-1 rounded-lg text-[#1F1612]/30 hover:text-[#B74A26] hover:bg-[#B74A26]/5 transition-all cursor-pointer"
                            title="Delete Lead"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>

                          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#B74A26] group-hover:translate-x-1 transition-transform flex items-center gap-1">
                            <span>Open dossier</span>
                            <ArrowRight className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
