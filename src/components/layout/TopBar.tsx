import React from "react";
import { Sparkles, Radio, LogIn, LogOut, CheckCircle2, AlertCircle, Settings, Users } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { TeamMember } from "@/types";

interface TopBarProps {
  user: any;
  accessToken: string | null;
  onSignIn: () => void;
  onSignOut: () => void;
  isFirebaseSynced: boolean;
  networkStatus: "online" | "offline";
  teamMembers: TeamMember[];
  onManageTeam: () => void;
  currentTeamName?: string;
}

/**
 * TopBar component containing Logo, Collaborative Team Stack, Network Sync status, and Authentication details.
 * Styled following the warm editorial cream and terracotta design token set.
 */
export const TopBar: React.FC<TopBarProps> = ({
  user,
  accessToken,
  onSignIn,
  onSignOut,
  isFirebaseSynced,
  networkStatus,
  teamMembers,
  onManageTeam,
  currentTeamName,
}) => {
  return (
    <header className="border-b border-[#1F1612]/10 bg-[#FDFBF2]/80 backdrop-blur-md sticky top-0 z-40 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Logo and Platform Tag */}
        <div className="flex items-center space-x-3">
          <h1 className="text-3xl font-serif font-bold italic tracking-tight text-[#1F1612] select-none flex items-center gap-1.5">
            Soro <span className="text-[#B74A26] font-sans text-[10px] font-bold tracking-widest px-2.5 py-0.5 rounded-full bg-[#B74A26]/10 uppercase">CRM</span>
          </h1>
          <div className="hidden md:flex items-center space-x-1.5 pl-3 border-l border-[#1F1612]/10 text-[10px] uppercase font-bold tracking-widest text-[#1F1612]/60 font-medium">
            <Radio className="w-3.5 h-3.5 text-[#7A8452] animate-pulse" />
            <span>Workspace: <strong className="text-[#1F1612] normal-case font-serif italic text-xs ml-1">{currentTeamName || "Loading..."}</strong></span>
          </div>
        </div>

        {/* Dynamic Collaborative Avatar Stack and Controls */}
        <div className="flex items-center space-x-6">
          
          {/* Active Team Pipeline Avatar Stack */}
          <div className="flex items-center space-x-2">
            <span className="hidden sm:inline-block text-[11px] font-mono tracking-wider text-[#1F1612]/50 uppercase">
              Pipeline Team:
            </span>
            <div className="flex items-center gap-2">
              <div className="flex -space-x-1.5 overflow-hidden">
                {teamMembers.map((member) => {
                  const isEditing = member.activity === "editing";
                  const isViewing = member.activity === "viewing";
                  const isIdle = member.activity === "idle" || member.status === "away";
                  return (
                    <div key={member.id} className="relative group shrink-0">
                      <div className="relative">
                        <img
                          className={`inline-block h-8 w-8 rounded-full ring-2 object-cover transition-all duration-300 group-hover:scale-110 ${
                            isEditing 
                              ? "ring-[#B74A26] border-2 border-[#B74A26]" 
                              : isViewing 
                              ? "ring-[#7A8452] animate-pulse" 
                              : "ring-[#FDFBF2]"
                          } ${isIdle ? "opacity-60 saturate-50" : "opacity-100"}`}
                          src={member.avatarUrl}
                          alt={member.name}
                          title={`${member.name} (${member.status} - ${member.activity || "viewing"})`}
                        />
                        {/* Real-time sync editing pencil badge */}
                        {isEditing && (
                          <span className="absolute -top-1 -right-1 bg-[#B74A26] text-white rounded-full p-0.5 ring-1 ring-[#FDFBF2] shadow-sm transform scale-90" title="Editing Leads Board">
                            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </span>
                        )}
                        {/* Active/Away dot */}
                        <span className={`absolute bottom-0 right-0 block h-2 w-2 rounded-full ring-1 ring-[#FDFBF2] ${
                          member.status === "active" 
                            ? "bg-[#7A8452]" 
                            : member.status === "away" 
                            ? "bg-[#CFA331]" 
                            : "bg-[#1F1612]/30"
                        }`} />
                      </div>
                      {/* Micro Tooltip */}
                      <div className="absolute top-10 left-1/2 -translate-x-1/2 scale-0 group-hover:scale-100 transition-all duration-200 bg-[#1F1612] text-[#FDFBF2] text-[10px] py-1.5 px-2.5 rounded-lg whitespace-nowrap shadow-md font-mono z-50 flex flex-col items-center">
                        <span className="font-bold">{member.name}</span>
                        <span className="text-[8px] opacity-75 uppercase mt-0.5">{member.role || "member"} • {member.activity || "viewing"}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Configure Team / Invite action button */}
              <button
                onClick={onManageTeam}
                className="p-1.5 rounded-xl border border-[#1F1612]/10 hover:bg-[#1F1612]/5 hover:text-[#B74A26] text-[#1F1612]/70 transition-colors shrink-0 cursor-pointer flex items-center justify-center"
                title="Manage Workspace Team & Multi-Tenant Directory"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Sync & Network Status Badge */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1.5 bg-[#1F1612]/5 px-2.5 py-1 rounded-full border border-[#1F1612]/10">
              <span className={`h-1.5 w-1.5 rounded-full ${networkStatus === "online" ? "bg-[#7A8452]" : "bg-[#B74A26] animate-ping"}`} />
              <span className="text-[11px] font-mono font-semibold tracking-wider text-[#1F1612]/70 uppercase">
                {networkStatus === "online" ? "Connected" : "Offline"}
              </span>
            </div>

            <div className="flex items-center space-x-1.5 bg-[#1F1612]/5 px-2.5 py-1 rounded-full border border-[#1F1612]/10">
              {isFirebaseSynced ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-[#7A8452]" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 text-[#CFA331]" />
              )}
              <span className="text-[11px] font-mono font-semibold tracking-wider text-[#1F1612]/70 uppercase">
                {isFirebaseSynced ? "Cloud Sync" : "Local Demo"}
              </span>
            </div>
          </div>

          {/* Google Authentication Control */}
          <AnimatePresence mode="wait">
            {user ? (
              <motion.div
                key="user-badge"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="flex items-center space-x-3 border-l border-[#1F1612]/10 pl-4"
              >
                <div className="hidden lg:block text-right">
                  <p className="text-xs font-semibold text-[#1F1612] truncate max-w-[120px]">
                    {user.displayName || "Founder"}
                  </p>
                  <p className="text-[10px] font-mono text-[#1F1612]/50 truncate max-w-[120px]">
                    {user.email}
                  </p>
                </div>
                <button
                  onClick={onSignOut}
                  id="btn-signout"
                  className="p-1.5 rounded-full hover:bg-[#B74A26]/10 text-[#1F1612]/60 hover:text-[#B74A26] transition-colors duration-200"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </motion.div>
            ) : (
              <motion.button
                key="signin-btn"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                onClick={onSignIn}
                id="btn-signin"
                className="gsi-material-button flex items-center space-x-2 bg-[#1F1612] text-[#FDFBF2] px-3.5 py-1.5 rounded-full text-xs font-semibold hover:bg-[#B74A26] hover:text-[#FDFBF2] transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Google Sign-In</span>
              </motion.button>
            )}
          </AnimatePresence>

        </div>
      </div>
    </header>
  );
};
