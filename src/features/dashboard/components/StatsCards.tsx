import { Layers, MessageSquare, CheckCircle2, TrendingUp, Sparkles } from "lucide-react";
import type { LeadStats } from "@/features/leads/utils/leadStats";

export function StatsCards({ stats }: { stats: LeadStats }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div className="bg-white/40 border border-[#1F1612]/5 rounded-2xl p-4 flex items-center justify-between shadow-sm hover:shadow-md transition-all duration-200">
        <div>
          <p className="text-[11px] uppercase font-bold tracking-tighter text-[#1F1612]/50">Lead Found</p>
          <h4 className="text-2xl font-serif font-bold italic mt-1 text-[#1F1612]">{stats.leadCount}</h4>
        </div>
        <span className="p-2.5 rounded-xl bg-[#B74A26]/10 text-[#B74A26]"><Layers className="w-5 h-5" /></span>
      </div>
      <div className="bg-white/40 border border-[#1F1612]/5 rounded-2xl p-4 flex items-center justify-between shadow-sm hover:shadow-md transition-all duration-200">
        <div>
          <p className="text-[11px] uppercase font-bold tracking-tighter text-[#1F1612]/50">Prospect (Engaged)</p>
          <h4 className="text-2xl font-serif font-bold italic mt-1 text-[#1F1612]">{stats.prospectCount}</h4>
        </div>
        <span className="p-2.5 rounded-xl bg-[#CFA331]/10 text-[#CFA331]"><MessageSquare className="w-5 h-5" /></span>
      </div>
      <div className="bg-white/40 border border-[#1F1612]/5 rounded-2xl p-4 flex items-center justify-between shadow-sm hover:shadow-md transition-all duration-200">
        <div>
          <p className="text-[11px] uppercase font-bold tracking-tighter text-[#1F1612]/50">Client (Closed)</p>
          <h4 className="text-2xl font-serif font-bold italic mt-1 text-[#1F1612]">{stats.clientCount}</h4>
        </div>
        <span className="p-2.5 rounded-xl bg-[#7A8452]/10 text-[#7A8452]"><CheckCircle2 className="w-5 h-5" /></span>
      </div>
      <div className="bg-[#B74A26]/5 border border-[#B74A26]/10 rounded-2xl p-4 flex items-center justify-between shadow-sm">
        <div>
          <p className="text-[11px] uppercase font-bold tracking-tighter text-[#B74A26]">Sorizzy AI Status</p>
          <h4 className="text-sm font-sans font-bold mt-1 text-[#1F1612] flex items-center gap-1">
            Proactive Active <Sparkles className="w-3.5 h-3.5 text-[#B74A26] inline" />
          </h4>
        </div>
        <span className="p-2.5 rounded-xl bg-[#B74A26]/10 text-[#B74A26]"><TrendingUp className="w-5 h-5" /></span>
      </div>
    </div>
  );
}
