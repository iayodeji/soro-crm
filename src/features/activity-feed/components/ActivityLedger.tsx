import { History } from "lucide-react";
import type { ActivityLog } from "@/types";

interface ActivityLedgerProps {
  logs: ActivityLog[];
}

export function ActivityLedger({ logs }: ActivityLedgerProps) {
  return (
    <div className="bg-white/40 border border-[#1F1612]/10 rounded-2xl p-5 shadow-sm space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center space-x-2 border-b border-[#1F1612]/5 pb-3">
        <History className="w-4 h-4 text-[#1F1612]/50" />
        <h4 className="text-[11px] uppercase font-bold tracking-tighter text-[#1F1612]/70">Discovery Pipeline Audit Ledger</h4>
      </div>
      <div className="max-h-40 overflow-y-auto space-y-2.5 pr-2">
        {logs.length === 0 ? (
          <p className="text-xs text-[#1F1612]/40 italic py-2">No pipeline activities recorded yet.</p>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="flex items-start justify-between text-xs border-b border-[#1F1612]/5 pb-2 last:border-0 last:pb-0">
              <div className="flex items-start space-x-3">
                <span className="text-[10px] font-mono text-[#1F1612]/30 mt-0.5">{log.timestamp}</span>
                <div>
                  <span className={`inline-block text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md mr-2 ${
                    log.type === "success" ? "bg-[#7A8452]/10 text-[#7A8452]" : log.type === "warning" ? "bg-[#B74A26]/10 text-[#B74A26]" : "bg-[#1F1612]/5 text-[#1F1612]/60"
                  }`}>
                    {log.action}
                  </span>
                  <span className="text-[#1F1612]/80">{log.details}</span>
                </div>
              </div>
              <span className="text-[10px] font-mono text-[#1F1612]/40 font-semibold">{log.leadName}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
