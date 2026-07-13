"use client";
import { Smartphone, FileDown, Bell, Volume2, VolumeX, Sparkles } from "lucide-react";

interface NotificationEngineControlsProps {
  onExportCsv: () => void;
  fcmEnabled: boolean;
  onToggleFcm: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onTestPush: () => void;
}

export function NotificationEngineControls({
  onExportCsv, fcmEnabled, onToggleFcm, soundEnabled, onToggleSound, onTestPush,
}: NotificationEngineControlsProps) {
  return (
    <div className="bg-white/60 backdrop-blur-md border border-[#1F1612]/10 rounded-xl p-2.5 sm:p-3 shadow-sm space-y-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5">
            <span className="inline-block p-1 rounded-md bg-[#B74A26]/10 text-[#B74A26]"><Smartphone className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#B74A26]" /></span>
            <h3 className="font-serif text-xs sm:text-sm font-bold italic text-[#1F1612]">Notification Engine</h3>
          </div>
          <p className="text-[10px] sm:text-[11px] text-[#1F1612]/60 leading-relaxed hidden sm:block">
            Configure workspace alerts & backups.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <button onClick={onExportCsv} className="flex items-center gap-1 bg-white hover:bg-[#7A8452]/10 border border-[#7A8452]/30 text-[#7A8452] font-mono font-bold uppercase text-[8px] sm:text-[9px] tracking-widest px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg transition-all shadow-xs cursor-pointer" title="Direct local spreadsheet fallback without Google credentials">
            <FileDown className="w-3 h-3" /><span className="hidden sm:inline">Export Excel</span>
          </button>
          <button onClick={onToggleFcm} className={`flex items-center gap-1 border font-mono font-bold uppercase text-[8px] sm:text-[9px] tracking-widest px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg transition-all cursor-pointer ${fcmEnabled ? "bg-[#B74A26]/10 border-[#B74A26]/30 text-[#B74A26]" : "bg-white border-[#1F1612]/10 text-[#1F1612]/40"}`}>
            <Bell className="w-3 h-3" /><span>FCM {fcmEnabled ? "On" : "Off"}</span>
          </button>
          <button onClick={onToggleSound} className={`flex items-center gap-1 border font-mono font-bold uppercase text-[8px] sm:text-[9px] tracking-widest px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg transition-all cursor-pointer ${soundEnabled ? "bg-[#7A8452]/10 border-[#7A8452]/30 text-[#7A8452]" : "bg-white border-[#1F1612]/10 text-[#1F1612]/40"}`}>
            {soundEnabled ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}<span className="hidden sm:inline">{soundEnabled ? "Audio On" : "Muted"}</span>
          </button>
          <button onClick={onTestPush} className="bg-[#1F1612] hover:bg-[#B74A26] text-[#FDFBF2] font-mono font-bold uppercase text-[8px] sm:text-[9px] tracking-widest px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg transition-all shadow-sm cursor-pointer">
            Test
          </button>
        </div>
      </div>
      <div className="pt-1.5 sm:pt-2 border-t border-[#1F1612]/5 flex items-center justify-between text-[10px] font-mono text-[#1F1612]/50">
        <span className="w-1.5 h-1.5 rounded-full bg-[#7A8452] animate-pulse"></span>
      </div>
    </div>
  );
}
