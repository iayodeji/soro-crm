"use client";

import Link from "next/link";
import { AuthControls } from "@/components/auth/AuthControls";

/**
 * Responsive application header.
 *
 * Auth-aware controls are provided by the shared <AuthControls /> component
 * so behavior stays consistent with the rest of the app.
 */
export function Header() {
  return (
    <header className="border-b border-[#1F1612]/10 bg-[#FDFBF2]/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-1 shrink-0">
          <span className="text-2xl sm:text-3xl font-serif font-bold italic tracking-tight text-[#1F1612]">
            Soro
          </span>
          <span className="text-[#B74A26] font-sans text-[9px] sm:text-[10px] font-bold tracking-widest px-2 py-0.5 rounded-full bg-[#B74A26]/10 uppercase">
            CRM
          </span>
        </Link>

        {/* Auth-aware controls */}
        <nav className="flex items-center gap-2 sm:gap-4">
          <AuthControls />
        </nav>
      </div>
    </header>
  );
}
