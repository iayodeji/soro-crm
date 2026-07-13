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
    <div className="bg-white/60 backdrop-blur-md border border-[#1F1612]/10 rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-block p-1.5 rounded-lg bg-[#B74A26]/10 text-[#B74A26]"><Smartphone className="w-4 h-4 text-[#B74A26]" /></span>
            <h3 className="font-serif text-lg font-bold italic text-[#1F1612]">Notification Engine</h3>
          </div>
          <p className="text-xs text-[#1F1612]/70 leading-relaxed max-w-2xl">
            Configure your CRM workspace alerts. Seamlessly export structured Excel-ready backups of your customer pipeline database directly, or request Native Browser Notifications for discovery alerts.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3.5 w-full lg:w-auto">
          <button onClick={onExportCsv} className="flex items-center gap-2 bg-white hover:bg-[#7A8452]/10 border border-[#7A8452]/30 text-[#7A8452] font-mono font-bold uppercase text-[10px] tracking-widest px-4 py-2.5 rounded-xl transition-all shadow-xs cursor-pointer" title="Direct local spreadsheet fallback without Google credentials">
            <FileDown className="w-3.5 h-3.5" /><span>Export Excel Backup</span>
          </button>
          <button onClick={onToggleFcm} className={`flex items-center gap-2 border font-mono font-bold uppercase text-[10px] tracking-widest px-4 py-2.5 rounded-xl transition-all cursor-pointer ${fcmEnabled ? "bg-[#B74A26]/10 border-[#B74A26]/30 text-[#B74A26]" : "bg-white border-[#1F1612]/10 text-[#1F1612]/40"}`}>
            <Bell className="w-3.5 h-3.5" /><span>FCM {fcmEnabled ? "Active" : "Muted"}</span>
          </button>
          <button onClick={onToggleSound} className={`flex items-center gap-2 border font-mono font-bold uppercase text-[10px] tracking-widest px-4 py-2.5 rounded-xl transition-all cursor-pointer ${soundEnabled ? "bg-[#7A8452]/10 border-[#7A8452]/30 text-[#7A8452]" : "bg-white border-[#1F1612]/10 text-[#1F1612]/40"}`}>
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}<span>{soundEnabled ? "Audio On" : "Muted"}</span>
          </button>
          <button onClick={onTestPush} className="bg-[#1F1612] hover:bg-[#B74A26] text-[#FDFBF2] font-mono font-bold uppercase text-[10px] tracking-widest px-4 py-2.5 rounded-xl transition-all shadow-sm cursor-pointer">
            Test Notification
          </button>
        </div>
      </div>
      <div className="pt-3.5 border-t border-[#1F1612]/5 flex flex-col md:flex-row md:items-center justify-between gap-3 text-[10px] font-mono text-[#1F1612]/50">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="w-1.5 h-1.5 rounded-full bg-[#7A8452] animate-pulse"></span>
        </div>
      </div>
    </div>
  );
}
