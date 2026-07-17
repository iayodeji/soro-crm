import React from "react";
import { Sparkles, Radio, CheckCircle2, AlertCircle, Mail } from "lucide-react";
import Link from "next/link";
import { AuthControls } from "@/components/auth/AuthControls";
import { OrganizationSwitcher } from "@/components/organizations/OrganizationSwitcher";
import type { NetworkStatus } from "@/hooks/useNetworkStatus";
import { useUser } from "@clerk/nextjs";
import { Show } from "@clerk/nextjs";

interface TopBarProps {
  networkStatus: NetworkStatus;
}

export const TopBar: React.FC<TopBarProps> = ({ networkStatus }) => {
  return (
    <header className="border-b border-[#1F1612]/10 bg-[#FDFBF2]/80 backdrop-blur-md sticky top-0 z-40 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2">
        {/* Logo and Platform Tag */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          <h1 className="text-2xl sm:text-3xl font-serif font-bold italic tracking-tight text-[#1F1612] select-none flex items-center gap-1">
            Soro <span className="text-[#B74A26] font-sans text-[9px] sm:text-[10px] font-bold tracking-widest px-2 py-0.5 rounded-full bg-[#B74A26]/10 uppercase">CRM</span>
          </h1>
          <div className="hidden md:block relative pl-3 border-l border-[#1F1612]/10">
            <span className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-widest text-[#1F1612]/60 font-medium">
              <Radio className="w-3.5 h-3.5 text-[#7A8452] animate-pulse" />
              <strong className="text-[#1F1612] normal-case font-serif italic text-xs">Discovery Pipeline</strong>
            </span>
          </div>
        </div>

        {/* Sync & Network Status Badge */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 bg-[#1F1612]/5 px-2 py-1 rounded-full border border-[#1F1612]/10">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                networkStatus === "online"
                  ? "bg-[#7A8452]"
                  : networkStatus === "checking"
                  ? "bg-[#CFA331] animate-pulse"
                  : "bg-[#B74A26] animate-ping"
              }`}
            />
            <span className="hidden sm:inline text-[11px] font-mono font-semibold tracking-wider text-[#1F1612]/70 uppercase">
              {networkStatus === "online"
                ? "Connected"
                : networkStatus === "checking"
                ? "Connecting"
                : "Offline"}
            </span>
          </div>

          <div className="flex items-center gap-1.5 bg-[#1F1612]/5 px-2 py-1 rounded-full border border-[#1F1612]/10">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#7A8452]" />
            <span className="hidden sm:inline text-[11px] font-mono font-semibold tracking-wider text-[#1F1612]/70 uppercase">
              Cloud Sync
            </span>
          </div>

          {/* Organization Switcher */}
          <Show when="signed-in">
            <OrganizationSwitcher />
            <Link
              href="/crm/settings/mail"
              className="hidden md:inline-flex min-h-9 items-center gap-1.5 rounded-full px-2.5 text-[10px] font-mono font-bold uppercase tracking-wider text-[#1F1612]/65 transition-colors hover:bg-[#1F1612]/5 hover:text-[#1F1612] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B74A26]"
            >
              <Mail className="w-3.5 h-3.5" />
              Mail settings
            </Link>
          </Show>

          {/* Auth controls */}
          <div className="flex items-center pl-1 sm:pl-2 sm:ml-1 sm:border-l sm:border-[#1F1612]/10">
            <AuthControls />
          </div>
        </div>
      </div>
    </header>
  );
};
