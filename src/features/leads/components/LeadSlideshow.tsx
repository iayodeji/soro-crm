import React, { useState, useEffect } from "react";
import { User, Building2, FileText, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Lead } from "@/types";

interface LeadSlideshowProps {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
  onDeleteLead: (leadId: string) => Promise<void>;
}

export const LeadSlideshow: React.FC<LeadSlideshowProps> = ({
  leads,
  onSelectLead,
  onDeleteLead,
}) => {
  // We only preview the top 3 items
  const previewItems = leads.slice(0, 3);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Keep index within bounds if leads list changes
  useEffect(() => {
    if (currentIndex >= previewItems.length && previewItems.length > 0) {
      setCurrentIndex(previewItems.length - 1);
    }
  }, [leads, currentIndex, previewItems.length]);

  if (leads.length === 0) {
    return (
      <div className="h-44 border border-dashed border-[#1F1612]/10 rounded-2xl flex items-center justify-center text-xs text-[#1F1612]/40 italic bg-white/10">
        No discovery leads here
      </div>
    );
  }

  const activeLead = previewItems[currentIndex] || previewItems[0];
  if (!activeLead) return null;

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentIndex < previewItems.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const hasNext = currentIndex < previewItems.length - 1;
  const hasPrev = currentIndex > 0;

  return (
    <div className="relative w-full px-1 py-4">
      {/* 3D Stack / Cascade Background Cards to visually imply overlapping cards */}
      <div className="absolute inset-0 pointer-events-none">
        {previewItems.map((_, idx) => {
          if (idx === currentIndex) return null;
          // Calculate visual offset for stacked cascade look
          const offset = idx - currentIndex;
          if (Math.abs(offset) > 1) return null; // only render immediate neighbors behind

          return (
            <div
              key={idx}
              className="absolute inset-x-3 bottom-2 h-[155px] bg-white/20 border border-[#1F1612]/5 rounded-xl shadow-xs transition-all duration-300"
              style={{
                transform: `translateY(${offset * 4}px) scale(${1 - Math.abs(offset) * 0.03})`,
                zIndex: 10 - Math.abs(offset),
                opacity: 0.35,
              }}
            />
          );
        })}
      </div>

      {/* Main Slideshow Active Lead Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeLead.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          onClick={() => onSelectLead(activeLead)}
          className="relative z-10 bg-white border border-[#1F1612]/10 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-[#B74A26]/30 transition-all cursor-pointer h-[155px] flex flex-col justify-between"
        >
          {/* Top Indicators */}
          <div className="absolute top-4 right-4 flex items-center space-x-1.5 opacity-60">
            {activeLead.sheetsSynced && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#7A8452]" title="Synced to Sheets" />
            )}
            {activeLead.gmailSent && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#B74A26]" title="Discovery email sent" />
            )}
            {activeLead.calendarScheduled && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#CFA331]" title="Interview scheduled" />
            )}
          </div>

          <div className="space-y-1.5">
            {/* Founder Name */}
            <div className="flex items-center space-x-2">
              <User className="w-3.5 h-3.5 text-[#1F1612]/40 shrink-0" />
              <span className="font-serif font-bold text-[13px] text-[#1F1612] truncate">
                {activeLead.name}
              </span>
            </div>

            {/* Company Name */}
            <div className="flex items-center space-x-2">
              <Building2 className="w-3.5 h-3.5 text-[#1F1612]/40 shrink-0" />
              <span className="text-[11px] font-mono font-medium text-[#1F1612]/70 truncate">
                {activeLead.company_name}
              </span>
            </div>

            {/* Truncated Notes/Description */}
            <div className="flex items-start space-x-2 pt-1.5 border-t border-[#1F1612]/5">
              <FileText className="w-3.5 h-3.5 text-[#1F1612]/30 mt-0.5 shrink-0" />
              <span className="text-[11px] text-[#1F1612]/80 leading-snug font-sans line-clamp-2">
                {activeLead.notes || "No discovery notes formulated yet."}
              </span>
            </div>
          </div>

          {/* Footer of card: action and slide indicators */}
          <div className="flex items-center justify-between pt-2 border-t border-[#1F1612]/5 mt-2">
            {/* Trash option */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteLead(activeLead.id);
              }}
              className="p-1 rounded-lg text-[#1F1612]/30 hover:text-[#B74A26] hover:bg-[#B74A26]/5 transition-all cursor-pointer"
              title="Delete Lead"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>

            {/* Slideshow subtle dots and arrows */}
            <div className="flex items-center space-x-2">
              {/* Subtle Dots */}
              {previewItems.length > 1 && (
                <div className="flex space-x-1 mr-1">
                  {previewItems.map((_, idx) => (
                    <span
                      key={idx}
                      className={`w-1.5 h-1.5 rounded-full transition-colors duration-200 ${
                        idx === currentIndex ? "bg-[#B74A26] w-3" : "bg-[#1F1612]/20"
                      }`}
                    />
                  ))}
                </div>
              )}

              {/* Navigation Arrows */}
              <div className="flex items-center space-x-1">
                {hasPrev && (
                  <button
                    onClick={handlePrev}
                    className="p-1 rounded-lg border border-[#1F1612]/10 bg-[#FDFBF2] hover:bg-[#1F1612]/5 text-[#1F1612]/60 hover:text-[#B74A26] transition-colors cursor-pointer"
                    title="Previous Slide"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                )}
                {hasNext && (
                  <button
                    onClick={handleNext}
                    className="p-1 rounded-lg border border-[#1F1612]/10 bg-[#FDFBF2] hover:bg-[#1F1612]/5 text-[#1F1612]/60 hover:text-[#B74A26] transition-colors cursor-pointer"
                    title="Next Slide"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
