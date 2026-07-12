"use client";
import { motion, AnimatePresence } from "motion/react";
import { Check, AlertCircle, Sparkles, X } from "lucide-react";
import type { ToastMessage } from "@/types/activity";

interface ToastStackProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export function ToastStack({ toasts, onDismiss }: ToastStackProps) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`pointer-events-auto p-4 rounded-xl border shadow-xl flex gap-3 items-start backdrop-blur-md transition-all ${
              toast.type === "success"
                ? "bg-[#7A8452]/95 text-white border-[#7A8452]/40"
                : toast.type === "warning"
                ? "bg-[#B74A26]/95 text-white border-[#B74A26]/40"
                : "bg-white/95 text-[#1F1612] border-[#1F1612]/15"
            }`}
          >
            {toast.type === "success" ? (
              <div className="p-1 rounded bg-white/20 text-white flex-shrink-0"><Check className="w-4 h-4 font-bold" /></div>
            ) : toast.type === "warning" ? (
              <div className="p-1 rounded bg-white/20 text-white flex-shrink-0"><AlertCircle className="w-4 h-4 font-bold" /></div>
            ) : (
              <div className="p-1 rounded bg-[#1F1612]/10 text-[#1F1612] flex-shrink-0"><Sparkles className="w-4 h-4" /></div>
            )}
            <div className="flex-1">
              <h4 className="font-serif font-bold italic text-sm leading-none mb-1">{toast.title}</h4>
              <p className="text-xs opacity-90 leading-normal">{toast.desc}</p>
            </div>
            <button onClick={() => onDismiss(toast.id)} className="text-current opacity-60 hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5 cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
