"use client";
import { motion, AnimatePresence } from "motion/react";
import { Smartphone } from "lucide-react";
import { playSuccessPop } from "@/utils/audio";
import type { FcmNotification } from "@/types/activity";

interface FcmPushStackProps {
  notifications: FcmNotification[];
  onDismiss: (id: string) => void;
  soundEnabled: boolean;
}

export function FcmPushStack({ notifications, onDismiss, soundEnabled }: FcmPushStackProps) {
  return (
    <div className="fixed top-24 right-6 z-50 flex flex-col gap-4 max-w-sm w-full pointer-events-none">
      <AnimatePresence>
        {notifications.map((notif) => (
          <motion.div
            key={notif.id}
            initial={{ opacity: 0, x: 100, scale: 0.9, y: -20 }}
            animate={{ opacity: 1, x: 0, scale: 1, y: 0 }}
            exit={{ opacity: 0, x: 100, scale: 0.95 }}
            className="pointer-events-auto bg-[#1F1612]/95 text-white p-4 rounded-3xl border border-white/10 shadow-2xl flex flex-col gap-2 backdrop-blur-lg w-80 ring-4 ring-[#1F1612]/20"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-2 text-[9px] font-mono text-white/50 tracking-wider">
              <div className="flex items-center gap-1.5">
                <Smartphone className="w-3 h-3 text-[#B74A26] animate-pulse" />
                <span className="font-bold uppercase">FCM CLOUD PUSH</span>
              </div>
              <span>{notif.timestamp}</span>
            </div>
            <div className="space-y-1">
              <div className="text-xs font-serif font-bold italic text-[#FDFBF2] flex items-center gap-1.5">
                <span>{notif.title}</span>
              </div>
              <p className="text-[11px] text-white/80 leading-snug">{notif.body}</p>
            </div>
            <div className="flex items-center justify-between pt-1.5 text-[10px] font-mono border-t border-white/5 mt-1">
              <span className="text-[#B74A26] font-bold">📲 Lead: {notif.leadName}</span>
              <button
                onClick={() => { onDismiss(notif.id); if (soundEnabled) playSuccessPop(); }}
                className="px-2 py-0.5 bg-white/10 hover:bg-[#B74A26] text-white rounded-md transition-colors cursor-pointer uppercase text-[9px] tracking-tight"
              >
                Dismiss
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
