import type { LeadStats } from "@/features/leads/utils/leadStats";

export function DashboardHeader({ stats }: { stats: LeadStats }) {
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-[#1F1612]/15 pb-6">
      <div>
        <h2 className="font-serif font-bold italic text-4xl text-[#1F1612] tracking-tight">Customer Discovery Console</h2>
        <p className="text-sm font-sans text-[#1F1612]/60 mt-1">
          Analyze user bios, construct non-leading discovery profiles, and sync to Workspace sheets.
        </p>
      </div>
      <div className="flex items-center space-x-6 mt-4 md:mt-0">
        <div className="text-right">
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#1F1612]/50 block">Active Board</span>
          <span className="text-xl font-serif font-bold italic text-[#B74A26]">{stats.total} leads</span>
        </div>
        <div className="h-8 w-px bg-[#1F1612]/10" />
        <div className="text-right">
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#1F1612]/50 block">Synced Sheets</span>
          <span className="text-xl font-serif font-bold italic text-[#7A8452]">{stats.syncedCount} rows</span>
        </div>
        <div className="h-8 w-px bg-[#1F1612]/10" />
        <div className="text-right">
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#1F1612]/50 block">Tracked Tasks</span>
          <span className="text-xl font-serif font-bold italic text-[#B74A26]">{stats.tasksSyncedCount} synced</span>
        </div>
      </div>
    </div>
  );
}
