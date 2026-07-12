import React, { useState } from "react";
import { Sparkles, Globe, Search, ArrowRight, CornerDownLeft, Info } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface OmniInputProps {
  onParse: (rawText: string, options: { useSearchGrounding: boolean; modelPreset: string }) => Promise<void>;
  isParsing: boolean;
}

/**
 * OmniInput Capture Bar Component.
 * Accepts raw text context like LinkedIn bios, email signatures, or meeting transcripts.
 * Includes toggles for Gemini Search Grounding and specific performance models.
 */
export const OmniInput: React.FC<OmniInputProps> = ({ onParse, isParsing }) => {
  const [text, setText] = useState("");
  const [searchGrounding, setSearchGrounding] = useState(false);
  const [modelPreset, setModelPreset] = useState("low-latency"); // low-latency | high-quality | deep-reasoning
  const [showTooltip, setShowTooltip] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || isParsing) return;
    onParse(text, { useSearchGrounding: searchGrounding, modelPreset });
    setText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const loadSample = (type: "linkedin" | "signature" | "meeting") => {
    let sampleText = "";
    if (type === "linkedin") {
      sampleText = "Sarah Jenkins - VP of Product at NextFlow. Ex-Stripe PM. Building the future of automated B2B customer support workflows in London. Focus on voice agents and Gen Z. Email: sarah@nextflow.co";
    } else if (type === "signature") {
      sampleText = "Marcus Vance, Founder of Glitch-Zero. Tel: +1 (415) 890-1122 | London & SF | Seed backed by YC. Solving distributed data latency.";
    } else if (type === "meeting") {
      sampleText = "User Chat Transcript: 'Yeah, currently we spend about 4 hours every week just coordinating our sheets, sending emails manually to 30 beta users, and compiling results. Our main bottleneck is knowing who actually opened the email and responded. We use traditional CRM but it is way too bloated.' - David O.";
    }
    setText(sampleText);
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative bg-white/60 backdrop-blur-md rounded-2xl border border-[#1F1612]/10 p-5 shadow-sm hover:shadow-md transition-all duration-300"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Section Header with Small Sparkles Badge */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="flex items-center justify-center p-1 rounded-lg bg-[#B74A26]/10 text-[#B74A26]">
                <Sparkles className="w-4 h-4" />
              </span>
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#1F1612]/70">
                Omni-Input Capture Bar
              </span>
            </div>
            
            {/* Quick Demo Pre-sets */}
            <div className="flex items-center space-x-2 text-[11px] font-mono text-[#1F1612]/50">
              <span>Samples:</span>
              <button
                type="button"
                onClick={() => loadSample("linkedin")}
                className="hover:text-[#B74A26] border-b border-transparent hover:border-[#B74A26] transition-all"
              >
                LinkedIn Bio
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => loadSample("signature")}
                className="hover:text-[#B74A26] border-b border-transparent hover:border-[#B74A26] transition-all"
              >
                Email Sig
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => loadSample("meeting")}
                className="hover:text-[#B74A26] border-b border-transparent hover:border-[#B74A26] transition-all"
              >
                Meeting Transcript
              </button>
            </div>
          </div>

          {/* Interactive Text Area */}
          <div className="relative">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Paste unstructured lead data here... (LinkedIn bio, email signature, meeting feedback, raw conversation notes)"
              className="w-full min-h-[110px] bg-[#FDFBF2]/50 border border-[#1F1612]/10 focus:border-[#B74A26]/40 rounded-xl px-4 py-3.5 text-sm text-[#1F1612] placeholder-[#1F1612]/40 outline-none resize-none transition-all duration-200"
              disabled={isParsing}
            />
            
            {/* Corner submit tips */}
            <div className="absolute bottom-3 right-3 hidden sm:flex items-center space-x-1 text-[10px] font-mono text-[#1F1612]/30 pointer-events-none">
              <span>Press Enter</span>
              <CornerDownLeft className="w-3 h-3" />
            </div>
          </div>

          {/* Pipeline Options and controls */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2 border-t border-[#1F1612]/5">
            
            {/* Left side options: Model preset & Search grounding */}
            <div className="flex flex-wrap items-center gap-4">
              
              {/* Model Preset Tabs */}
              <div className="flex items-center space-x-1.5 bg-[#1F1612]/5 p-0.5 rounded-lg border border-[#1F1612]/10">
                <button
                  type="button"
                  onClick={() => setModelPreset("low-latency")}
                  className={`px-2 py-1 rounded-md text-[11px] font-mono font-bold tracking-tight transition-all duration-200 ${
                    modelPreset === "low-latency"
                      ? "bg-white text-[#1F1612] shadow-sm"
                      : "text-[#1F1612]/50 hover:text-[#1F1612]"
                  }`}
                  title="Uses fast low-latency gemini-3.1-flash-lite"
                >
                  Lite
                </button>
                <button
                  type="button"
                  onClick={() => setModelPreset("high-quality")}
                  className={`px-2 py-1 rounded-md text-[11px] font-mono font-bold tracking-tight transition-all duration-200 ${
                    modelPreset === "high-quality"
                      ? "bg-white text-[#1F1612] shadow-sm"
                      : "text-[#1F1612]/50 hover:text-[#1F1612]"
                  }`}
                  title="Uses general balanced gemini-3.5-flash"
                >
                  Balanced
                </button>
                <button
                  type="button"
                  onClick={() => setModelPreset("deep-reasoning")}
                  className={`px-2 py-1 rounded-md text-[11px] font-mono font-bold tracking-tight transition-all duration-200 ${
                    modelPreset === "deep-reasoning"
                      ? "bg-white text-[#1F1612] shadow-sm"
                      : "text-[#1F1612]/50 hover:text-[#1F1612]"
                  }`}
                  title="Uses high reasoning gemini-3.1-pro-preview"
                >
                  Reason
                </button>
              </div>

              {/* Search Grounding Toggle */}
              <button
                type="button"
                onClick={() => setSearchGrounding(!searchGrounding)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono font-bold transition-all duration-200 ${
                  searchGrounding
                    ? "bg-[#7A8452]/15 border-[#7A8452]/40 text-[#7A8452]"
                    : "bg-transparent border-[#1F1612]/10 text-[#1F1612]/60 hover:border-[#1F1612]/30"
                }`}
              >
                <Globe className={`w-3.5 h-3.5 ${searchGrounding ? "animate-spin-slow text-[#7A8452]" : ""}`} />
                <span>Google Search Grounding</span>
              </button>

              {/* info tooltip */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowTooltip(!showTooltip)}
                  className="p-1 rounded-full text-[#1F1612]/40 hover:text-[#1F1612]/70 transition-colors"
                >
                  <Info className="w-4 h-4" />
                </button>
                {showTooltip && (
                  <div className="absolute bottom-8 left-0 w-64 bg-[#1F1612] text-[#FDFBF2] text-xs p-3 rounded-xl shadow-lg font-sans z-30">
                    <p className="font-semibold mb-1">Sorizzy Intelligence Engine</p>
                    <p className="text-[11px] text-[#FDFBF2]/80 leading-relaxed">
                      Lite preset utilizes <b>gemini-3.1-flash-lite</b> for speed.
                      Google Search Grounding lets Gemini verify details across the web to lookup company size and actual user backgrounds.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Parse CTA button */}
            <button
              type="submit"
              id="btn-parse-lead"
              disabled={!text.trim() || isParsing}
              className={`flex items-center justify-center space-x-2 px-5 py-2 rounded-xl text-xs font-bold tracking-wide transition-all duration-300 ${
                !text.trim()
                  ? "bg-[#1F1612]/5 text-[#1F1612]/30 border border-[#1F1612]/10 cursor-not-allowed"
                  : isParsing
                  ? "bg-[#B74A26]/10 text-[#B74A26] border border-[#B74A26]/20 cursor-wait"
                  : "bg-[#B74A26] text-[#FDFBF2] hover:bg-[#B74A26]/90 active:scale-95 shadow-sm cursor-pointer"
              }`}
            >
              {isParsing ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-[#B74A26]" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span className="font-mono">Sorizzy Parsing...</span>
                </>
              ) : (
                <>
                  <span>Inject & Parse CRM Lead</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

          </div>
        </form>
      </motion.div>
    </div>
  );
};
