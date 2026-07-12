"use client";
import { motion, AnimatePresence } from "motion/react";
import { AlertCircle, X } from "lucide-react";
import type { Lead } from "@/types";

interface DeleteLeadModalProps {
  lead: Lead;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeleteLeadModal({ lead, onCancel, onConfirm }: DeleteLeadModalProps) {
  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-[#1F1612]/75 backdrop-blur-sm z-50 flex items-center justify-center p-6">
        <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-[#FDFBF2] rounded-3xl p-6 border border-[#1F1612]/15 max-w-sm w-full space-y-4 shadow-2xl relative">
          <button onClick={onCancel} className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-[#1F1612]/5 text-[#1F1612]/40 hover:text-[#1F1612] transition-colors cursor-pointer">
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center space-x-3 text-[#B74A26]">
            <div className="p-2 rounded-xl bg-[#B74A26]/10 text-[#B74A26]"><AlertCircle className="w-6 h-6" /></div>
            <div>
              <span className="text-[9px] uppercase font-bold tracking-widest text-[#B74A26] block">Warning action</span>
              <h3 className="font-serif font-bold text-lg text-[#1F1612]">Delete Lead?</h3>
            </div>
          </div>
          <p className="text-xs text-[#1F1612]/85 leading-relaxed">
            Are you sure you want to permanently delete <b>{lead.name}</b> from your discovery pipeline? This cannot be undone.
          </p>
          <div className="flex space-x-3 pt-2">
            <button onClick={onCancel} className="flex-1 px-4 py-2 border border-[#1F1612]/15 hover:bg-[#1F1612]/5 text-xs font-bold text-[#1F1612]/70 rounded-xl transition-all cursor-pointer">Cancel</button>
            <button onClick={onConfirm} className="flex-1 px-4 py-2 bg-[#B74A26] hover:bg-[#B74A26]/90 text-xs font-bold text-white rounded-xl transition-all cursor-pointer shadow-sm">Confirm Delete</button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
