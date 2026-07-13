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
    <div className="bg-white/60 backdrop-blur-md border border-[#1F1612]/10 rounded-xl p-3 shadow-sm space-y-2.5">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="space-y-0">
          <div className="flex items-center gap-1.5">
            <span className="inline-block p-1 rounded-md bg-[#B74A26]/10 text-[#B74A26]"><Smartphone className="w-3.5 h-3.5 text-[#B74A26]" /></span>
            <h3 className="font-serif text-sm font-bold italic text-[#1F1612]">Notification Engine</h3>
          </div>
          <p className="text-[11px] text-[#1F1612]/60 leading-relaxed hidden sm:block">
            Configure workspace alerts & backups.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button onClick={onExportCsv} className="flex items-center gap-1.5 bg-white hover:bg-[#7A8452]/10 border border-[#7A8452]/30 text-[#7A8452] font-mono font-bold uppercase text-[9px] tracking-widest px-3 py-1.5 rounded-lg transition-all shadow-xs cursor-pointer" title="Direct local spreadsheet fallback without Google credentials">
            <FileDown className="w-3 h-3" /><span className="hidden sm:inline">Export Excel Backup</span>
          </button>
          <button onClick={onToggleFcm} className={`flex items-center gap-1.5 border font-mono font-bold uppercase text-[9px] tracking-widest px-3 py-1.5 rounded-lg transition-all cursor-pointer ${fcmEnabled ? "bg-[#B74A26]/10 border-[#B74A26]/30 text-[#B74A26]" : "bg-white border-[#1F1612]/10 text-[#1F1612]/40"}`}>
            <Bell className="w-3 h-3" /><span>FCM {fcmEnabled ? "On" : "Off"}</span>
          </button>
          <button onClick={onToggleSound} className={`flex items-center gap-1.5 border font-mono font-bold uppercase text-[9px] tracking-widest px-3 py-1.5 rounded-lg transition-all cursor-pointer ${soundEnabled ? "bg-[#7A8452]/10 border-[#7A8452]/30 text-[#7A8452]" : "bg-white border-[#1F1612]/10 text-[#1F1612]/40"}`}>
            {soundEnabled ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}<span className="hidden sm:inline">{soundEnabled ? "Audio On" : "Muted"}</span>
          </button>
          <button onClick={onTestPush} className="bg-[#1F1612] hover:bg-[#B74A26] text-[#FDFBF2] font-mono font-bold uppercase text-[9px] tracking-widest px-3 py-1.5 rounded-lg transition-all shadow-sm cursor-pointer">
            Test
          </button>
        </div>
      </div>
      <div className="pt-2 border-t border-[#1F1612]/5 flex items-center justify-between text-[10px] font-mono text-[#1F1612]/50">
        <span className="w-1.5 h-1.5 rounded-full bg-[#7A8452] animate-pulse"></span>
      </div>
    </div>
  );
}
