import React, { useState } from "react";
import { 
  X, Plus, Users, Mail, Link2, Shield, Trash2, Check, Sparkles, Copy, ExternalLink, AlertCircle, CreditCard, Receipt
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Team, TeamMember } from "@/types";
import { createTeam, createInvitation, changeMemberRole, removeTeamMember, deleteTeamWorkspace } from "@/lib/teamService";

interface TeamManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  currentTeam: Team | null;
  myTeams: Team[];
  teamMembers: TeamMember[];
  onTeamSelected: (team: Team) => void;
  onTeamCreated: (team: Team) => void;
  onTeamDeleted?: (teamId: string) => void;
  onLogActivity: (action: string, details: string, type: "success" | "info" | "warning") => void;
}

export const TeamManagementModal: React.FC<TeamManagementModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  currentTeam,
  myTeams,
  teamMembers,
  onTeamSelected,
  onTeamCreated,
  onTeamDeleted,
  onLogActivity,
}) => {
  const [activeTab, setActiveTab] = useState<"members" | "workspaces" | "settings">("members");
  
  // Team Creation
  const [newTeamName, setNewTeamName] = useState("");
  const [isCreatingTeam, setIsCreatingTeam] = useState(false);
  
  // Invitation System
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "editor" | "viewer" | "member">("editor");
  const [generatedLink, setGeneratedLink] = useState("");
  const [isGeneratingInvite, setIsGeneratingInvite] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Determine current user's role in this team
  const currentMemberRecord = teamMembers.find(m => m.id === currentUser?.uid);
  const isAuthorizedToManage = currentMemberRecord?.role === "owner" || currentMemberRecord?.role === "admin";

  const handleCreateTeamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim() || !currentUser) return;
    setIsCreatingTeam(true);
    try {
      const ownerDetails = {
        name: currentUser.displayName || "Workspace Creator",
        email: currentUser.email || "creator@sorocrm.co",
        avatarUrl: currentUser.photoURL || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80"
      };
      const created = await createTeam(newTeamName.trim(), currentUser.uid, ownerDetails);
      onTeamCreated(created);
      onTeamSelected(created);
      setNewTeamName("");
      onLogActivity("Workspace Created", `Successfully provisioned new Isolated pipeline workspace "${created.name}".`, "success");
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreatingTeam(false);
    }
  };

  const handleGenerateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTeam) return;
    setIsGeneratingInvite(true);
    try {
      const invitation = await createInvitation(currentTeam.id, currentTeam.name, inviteEmail.trim() || "", inviteRole);
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
      const link = `${siteUrl}/?inviteToken=${invitation.token}`;
      setGeneratedLink(link);
      setInviteEmail("");
      const inviteeLabel = invitation.email ? invitation.email : "a teammate";
      onLogActivity("Invite Generated", `Created secure workspace token for ${inviteeLabel} as ${invitation.role}.`, "success");
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingInvite(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    onLogActivity("Link Copied", "Workspace invitation link copied to clipboard.", "info");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleChangeRole = async (targetUserId: string, newRole: "admin" | "editor" | "viewer" | "member", currentRole?: "owner" | "admin" | "editor" | "viewer" | "member") => {
    if (!currentTeam || !isAuthorizedToManage || currentRole === "owner") return;
    try {
      await changeMemberRole(currentTeam.id, targetUserId, newRole);
      onLogActivity("Member Role Updated", `Changed user role to ${newRole}.`, "success");
    } catch (err) {
      console.error(err);
    }
  };

  const handleKickMember = async (targetUserId: string, memberName: string, targetRole?: string) => {
    if (!currentTeam || !isAuthorizedToManage || targetUserId === currentTeam.ownerId || targetRole === "owner") return;
    const confirmKick = window.confirm(`Are you sure you want to remove ${memberName} from this team?`);
    if (!confirmKick) return;
    try {
      await removeTeamMember(currentTeam.id, targetUserId);
      onLogActivity("Member Removed", `Revoked team access for ${memberName}.`, "warning");
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#1F1612]/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-[#FDFBF2] w-full max-w-2xl rounded-3xl border border-[#1F1612]/15 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
      >
        {/* Header Section */}
        <div className="p-4 sm:p-6 border-b border-[#1F1612]/10 flex items-center justify-between bg-white/40">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="p-2 sm:p-2.5 rounded-2xl bg-[#B74A26]/10 text-[#B74A26]">
              <Users className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <span className="text-[8px] sm:text-[9px] uppercase font-mono font-bold tracking-widest text-[#B74A26] block">
                Multi-Tenant Engine
              </span>
              <h2 className="font-serif font-bold text-lg sm:text-xl text-[#1F1612] truncate max-w-[180px] sm:max-w-none">
                {currentTeam?.name || "Workspace Settings"}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-xl hover:bg-[#1F1612]/5 text-[#1F1612]/40 hover:text-[#1F1612] transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Workspace Quick-Selector banner */}
        <div className="bg-[#1F1612] text-[#FDFBF2] px-4 sm:px-6 py-2.5 sm:py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 text-xs">
          <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-white/75">
            <Sparkles className="w-3 h-3 text-[#CFA331]" />
            <span>Active:</span>
            <span className="bg-[#B74A26] text-white px-1.5 sm:px-2 py-0.5 rounded-md font-bold text-[10px] sm:text-xs truncate max-w-[120px] sm:max-w-none">{currentTeam?.id}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-white/60 hidden sm:inline">Switch:</span>
            <select
              value={currentTeam?.id || ""}
              onChange={(e) => {
                const selected = myTeams.find(t => t.id === e.target.value);
                if (selected) {
                  onTeamSelected(selected);
                  onLogActivity("Workspace Shifted", `Switched active pipeline directory to "${selected.name}".`, "info");
                }
              }}
              className="bg-white/10 text-white border border-white/20 rounded-lg px-2 py-1 text-[10px] sm:text-xs font-semibold focus:outline-none cursor-pointer truncate"
            >
              {myTeams.map(team => (
                <option key={team.id} value={team.id} className="text-[#1F1612] font-semibold bg-white">
                  {team.name} {team.id === currentTeam?.id ? "(Active)" : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-[#1F1612]/5 px-4 sm:px-6 pt-3 bg-white/20 overflow-x-auto">
          <button
            onClick={() => setActiveTab("members")}
            className={`pb-3 text-[10px] sm:text-xs font-bold uppercase tracking-wider border-b-2 px-3 sm:px-4 transition-all duration-200 cursor-pointer whitespace-nowrap ${
              activeTab === "members" 
                ? "border-[#B74A26] text-[#B74A26]" 
                : "border-transparent text-[#1F1612]/50 hover:text-[#1F1612]"
            }`}
          >
            Team Members ({teamMembers.length})
          </button>
          <button
            onClick={() => setActiveTab("workspaces")}
            className={`pb-3 text-[10px] sm:text-xs font-bold uppercase tracking-wider border-b-2 px-3 sm:px-4 transition-all duration-200 cursor-pointer whitespace-nowrap ${
              activeTab === "workspaces" 
                ? "border-[#B74A26] text-[#B74A26]" 
                : "border-transparent text-[#1F1612]/50 hover:text-[#1F1612]"
            }`}
          >
            Workspaces ({myTeams.length})
          </button>
          {isAuthorizedToManage && (
            <button
              onClick={() => setActiveTab("settings")}
              className={`pb-3 text-[10px] sm:text-xs font-bold uppercase tracking-wider border-b-2 px-3 sm:px-4 transition-all duration-200 cursor-pointer whitespace-nowrap ${
                activeTab === "settings" 
                  ? "border-[#B74A26] text-[#B74A26]" 
                  : "border-transparent text-[#1F1612]/50 hover:text-[#1F1612]"
              }`}
            >
              ⚙️ Settings
            </button>
          )}
        </div>

        {/* Scrollable Content Area */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-6 flex-1">
          {activeTab === "members" && (
            <div className="space-y-6">
              {/* Member management panel */}
              <div className="space-y-3">
                <h3 className="text-xs uppercase font-mono font-bold tracking-wider text-[#1F1612]/60">
                  Current Directory Access
                </h3>
                <div className="divide-y divide-[#1F1612]/5 border border-[#1F1612]/10 rounded-2xl bg-white/50 overflow-hidden">
                   {teamMembers.map((member) => {
                     const isSelf = member.id === currentUser?.uid;
                     const isOwner = member.role === "owner";
                     return (
                       <div key={member.id} className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
                         <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
                           <div className="relative shrink-0">
                             <img
                               src={member.avatarUrl}
                               alt={member.name}
                               className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl object-cover border border-[#1F1612]/10"
                             />
                             <span className={`absolute -bottom-0.5 -right-0.5 block h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full border-2 border-[#FDFBF2] ${
                               member.status === "active" 
                                 ? "bg-[#7A8452]" 
                                 : member.status === "away" 
                                 ? "bg-[#CFA331]" 
                                 : "bg-[#1F1612]/30"
                             }`} />
                           </div>
                           <div className="min-w-0">
                             <p className="text-xs font-bold text-[#1F1612] truncate flex items-center gap-1">
                               {member.name}
                               {isSelf && (
                                 <span className="bg-[#1F1612]/5 text-[#1F1612]/60 font-mono text-[8px] sm:text-[9px] px-1 py-0.5 rounded">You</span>
                               )}
                             </p>
                             <p className="text-[10px] text-[#1F1612]/50 truncate font-mono">
                               {member.email || "no-email@sorocrm.co"}
                             </p>
                           </div>
                         </div>

                         <div className="flex items-center gap-2 sm:gap-3 pl-10 sm:pl-0">
                           <span className={`text-[8px] sm:text-[9px] font-mono uppercase px-1.5 sm:px-2 py-0.5 rounded-full ${
                             member.activity === "editing" 
                               ? "bg-[#B74A26]/10 text-[#B74A26]" 
                               : member.activity === "idle"
                               ? "bg-[#CFA331]/10 text-[#CFA331]"
                               : "bg-[#7A8452]/10 text-[#7A8452]"
                           }`}>
                             {member.activity || "viewing"}
                           </span>

                           <div className="flex items-center gap-1">
                             {isAuthorizedToManage && !isOwner && !isSelf ? (
                               <div className="flex items-center gap-1.5">
                                 <select
                                   value={member.role || "member"}
                                   onChange={(e) => handleChangeRole(member.id, e.target.value as any, member.role)}
                                   disabled={
                                     currentMemberRecord?.role === "admin" && (member.role === "admin" || member.role === "owner")
                                   }
                                   className="bg-white border border-[#1F1612]/15 rounded-xl px-2 py-1 text-[10px] sm:text-[11px] font-bold font-mono uppercase focus:outline-none cursor-pointer disabled:opacity-50"
                                 >
                                   {currentMemberRecord?.role === "owner" && <option value="admin">Admin</option>}
                                   <option value="editor">Editor</option>
                                   <option value="viewer">Viewer</option>
                                   <option value="member">Member</option>
                                 </select>
                                 <button
                                   onClick={() => handleKickMember(member.id, member.name, member.role)}
                                   disabled={
                                     currentMemberRecord?.role === "admin" && (member.role === "admin" || member.role === "owner")
                                   }
                                   className="p-1.5 rounded-xl border border-red-500/15 hover:bg-red-500/5 text-red-600 cursor-pointer transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                   title="Revoke access"
                                 >
                                   <Trash2 className="w-3.5 h-3.5" />
                                 </button>
                               </div>
                             ) : (
                               <span className="text-[10px] font-mono uppercase font-bold text-[#1F1612]/50 px-2 py-1 bg-[#1F1612]/5 rounded-xl border border-[#1F1612]/5">
                                 {member.role || "member"}
                               </span>
                             )}
                           </div>
                         </div>
                       </div>
                     );
                   })}
                </div>
              </div>

              {/* Invite Link Generator Area */}
              {isAuthorizedToManage ? (
                <div className="bg-[#7A8452]/5 border border-[#7A8452]/15 rounded-3xl p-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-[#7A8452]" />
                    <h4 className="font-serif font-bold text-sm text-[#1F1612]">Generate New Workspace Invite Link</h4>
                  </div>
                  <p className="text-[11px] text-[#1F1612]/70 leading-relaxed">
                    Generate secure, role-assigned, one-time authorization tokens linked to this isolated tenant pipeline. Users visiting the link will auto-join this workspace instantly.
                  </p>

                  <form onSubmit={handleGenerateInvite} className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="email"
                      placeholder="teammate@email.com (optional)"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="flex-1 bg-white border border-[#1F1612]/15 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#B74A26]"
                    />
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as any)}
                      className="bg-white border border-[#1F1612]/15 rounded-xl px-2 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#B74A26] cursor-pointer font-semibold"
                    >
                      <option value="editor">Editor</option>
                      <option value="viewer">Viewer</option>
                      <option value="member">Member</option>
                      {currentMemberRecord?.role === "owner" && (
                        <option value="admin">Administrator (Admin)</option>
                      )}
                    </select>
                    <button
                      type="submit"
                      disabled={isGeneratingInvite}
                      className="bg-[#7A8452] hover:bg-[#7A8452]/90 disabled:bg-[#7A8452]/50 text-[#FDFBF2] text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer shadow-sm font-mono uppercase tracking-wide"
                    >
                      {isGeneratingInvite ? "Generating..." : "Get Token Link"}
                    </button>
                  </form>

                  {generatedLink && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white border border-[#7A8452]/20 p-3 rounded-2xl flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Link2 className="w-4 h-4 text-[#7A8452] shrink-0" />
                        <span className="text-[10px] font-mono text-[#1F1612]/70 truncate flex-1">
                          {generatedLink}
                        </span>
                      </div>
                      <button
                        onClick={copyToClipboard}
                        className="p-1.5 px-3 rounded-lg bg-[#7A8452] text-white text-[10px] font-bold uppercase tracking-wider hover:bg-[#7A8452]/90 transition-all cursor-pointer shrink-0 flex items-center gap-1"
                      >
                        {copied ? (
                          <>
                            <Check className="w-3 h-3" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy Link</span>
                          </>
                        )}
                      </button>
                    </motion.div>
                  )}
                </div>
              ) : (
                <div className="p-4 bg-[#1F1612]/5 border border-[#1F1612]/10 rounded-2xl flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-[#1F1612]/40 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-[#1F1612]/60">
                    You are currently a workspace <b>teammate</b>. Team invitations, role management, and directory access adjustments require an <b>Administrator</b> or <b>Owner</b> clearance level.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === "workspaces" && (
            <div className="space-y-6">
              {/* List of current workspaces with indicator of which is selected */}
              <div className="space-y-3">
                <h3 className="text-xs uppercase font-mono font-bold tracking-wider text-[#1F1612]/60">
                  Your Pipeline Workspaces
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                  {myTeams.map((team) => {
                    const isSelected = team.id === currentTeam?.id;
                    return (
                      <div
                        key={team.id}
                        onClick={() => {
                          onTeamSelected(team);
                          onLogActivity("Workspace Shifted", `Switched active pipeline directory to "${team.name}".`, "info");
                        }}
                        className={`p-3 sm:p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between h-auto sm:h-28 relative ${
                          isSelected
                            ? "bg-white border-[#B74A26] shadow-md ring-1 ring-[#B74A26]"
                            : "bg-white/40 border-[#1F1612]/10 hover:border-[#1F1612]/30 hover:bg-white/70"
                        }`}
                      >
                        {isSelected && (
                          <span className="absolute top-3 right-3 p-1 rounded-full bg-[#B74A26]/10 text-[#B74A26]">
                            <Check className="w-3 h-3" />
                          </span>
                        )}
                        <div>
                          <h4 className="font-serif font-bold text-sm text-[#1F1612] truncate max-w-[85%]">
                            {team.name}
                          </h4>
                          <span className="text-[10px] font-mono text-[#1F1612]/40 block uppercase">ID: {team.id}</span>
                        </div>
                        <span className="text-[10px] text-[#1F1612]/60">
                          Created {new Date(team.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Create new Workspace Form */}
              <div className="bg-white/60 border border-[#1F1612]/10 rounded-3xl p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Plus className="w-4 h-4 text-[#B74A26]" />
                  <h4 className="font-serif font-bold text-sm text-[#1F1612]">Provision New Workspace Tenant</h4>
                </div>
                <p className="text-[11px] text-[#1F1612]/70 leading-relaxed">
                  Establish a fully isolated environment. All customer records, analysis thesis, and board pipelines remain strictly ring-fenced inside this new team directory.
                </p>

                <form onSubmit={handleCreateTeamSubmit} className="flex gap-2">
                  <input
                    type="text"
                    required
                    maxLength={30}
                    placeholder="E.g., NextFlow Enterprise, Soro Growth"
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    className="flex-1 bg-white border border-[#1F1612]/15 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#B74A26]"
                  />
                  <button
                    type="submit"
                    disabled={isCreatingTeam}
                    className="bg-[#1F1612] hover:bg-[#B74A26] disabled:bg-[#1F1612]/50 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer shadow-sm"
                  >
                    {isCreatingTeam ? "Provisioning..." : "Create Workspace"}
                  </button>
                </form>
              </div>
            </div>
          )}

          {activeTab === "settings" && isAuthorizedToManage && (
            <div className="space-y-6">
              {/* Billing & Subscription management section */}
              <div className="bg-white/60 border border-[#1F1612]/10 rounded-3xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-[#1F1612]/15 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-[#7A8452]/10 text-[#7A8452]">
                      <Shield className="w-4 h-4" />
                    </span>
                    <h4 className="font-serif font-bold text-sm text-[#1F1612]">Billing & Subscription Management</h4>
                  </div>
                  <span className="bg-[#7A8452] text-white text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-full">
                    Active Pro Plan
                  </span>
                </div>
                
                <p className="text-[11px] text-[#1F1612]/70 leading-relaxed">
                  Your workspace is on the <b>Soro CRM Team Pro</b> plan. Manage seats, payment methods, and download simulated enterprise invoices.
                </p>

                {/* Plan overview & Sim controls */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 pt-1">
                  <div className="border border-[#1F1612]/10 bg-white p-2.5 sm:p-3 rounded-xl">
                    <span className="text-[9px] font-mono text-[#1F1612]/50 uppercase tracking-wider block">Price</span>
                    <span className="text-lg font-serif font-bold italic text-[#B74A26]">$49<span className="text-xs font-sans not-italic text-[#1F1612]/50">/mo</span></span>
                  </div>
                  <div className="border border-[#1F1612]/10 bg-white p-2.5 sm:p-3 rounded-xl">
                    <span className="text-[9px] font-mono text-[#1F1612]/50 uppercase tracking-wider block">Seats</span>
                    <span className="text-lg font-serif font-bold italic text-[#B74A26]">{teamMembers.length} <span className="text-xs font-sans not-italic text-[#1F1612]/50">/ 10</span></span>
                  </div>
                  <div className="border border-[#1F1612]/10 bg-white p-2.5 sm:p-3 rounded-xl">
                    <span className="text-[9px] font-mono text-[#1F1612]/50 uppercase tracking-wider block">Renewal</span>
                    <span className="text-lg font-serif font-bold italic text-[#B74A26]">Aug 1, 2026</span>
                  </div>
                </div>

                {/* Simulate Invoices list and Card */}
                <div className="space-y-2 pt-2">
                  <span className="text-[10px] font-mono uppercase font-bold text-[#1F1612]/50 block">Simulated Invoice History</span>
                  <div className="border border-[#1F1612]/5 rounded-xl bg-white overflow-hidden divide-y divide-[#1F1612]/5 text-xs">
                    <div className="p-3 flex items-center justify-between">
                      <div className="font-medium">
                        <p className="text-xs text-[#1F1612]">Inv #SORO-9281 (July 2026)</p>
                        <p className="text-[9px] text-[#1F1612]/40 font-mono">Paid via Visa ending 4242</p>
                      </div>
                      <button 
                        type="button"
                        onClick={() => {
                          alert("Simulated invoice PDF compiled successfully! Downloading standard receipt.");
                          onLogActivity("Billing Admin", "Downloaded simulated Soro Pro billing invoice.", "success");
                        }}
                        className="text-[10px] font-bold font-mono text-[#7A8452] hover:text-[#B74A26] cursor-pointer"
                      >
                        Download Receipt
                      </button>
                    </div>
                    <div className="p-3 flex items-center justify-between">
                      <div className="font-medium">
                        <p className="text-xs text-[#1F1612]">Inv #SORO-8472 (June 2026)</p>
                        <p className="text-[9px] text-[#1F1612]/40 font-mono">Paid via Visa ending 4242</p>
                      </div>
                      <button 
                        type="button"
                        onClick={() => {
                          alert("Simulated invoice PDF compiled successfully! Downloading standard receipt.");
                          onLogActivity("Billing Admin", "Downloaded simulated Soro Pro billing invoice.", "success");
                        }}
                        className="text-[10px] font-bold font-mono text-[#7A8452] hover:text-[#B74A26] cursor-pointer"
                      >
                        Download Receipt
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Danger Zone: Restricted to Owner */}
              <div className="bg-red-500/5 border border-red-500/25 rounded-3xl p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <h4 className="font-serif font-bold text-sm text-red-700">Danger Zone</h4>
                </div>
                <p className="text-[11px] text-[#1F1612]/70 leading-relaxed">
                  Permanently delete this customer discovery workspace. This action will erase all leads, analysis theses, and revoke access for all team members. <b>This cannot be undone.</b>
                </p>
                
                {currentMemberRecord?.role === "owner" ? (
                  <div className="space-y-3">
                    <span className="text-[9px] font-mono uppercase text-red-600 font-bold block">
                      Type active workspace name to confirm: <b className="bg-red-500/10 px-1.5 py-0.5 rounded ml-1">{currentTeam?.name}</b>
                    </span>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        id="confirmDeleteInput"
                        placeholder="Type workspace name..."
                        className="flex-1 bg-white border border-red-500/20 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-red-500"
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          const inp = (document.getElementById("confirmDeleteInput") as HTMLInputElement)?.value;
                          if (inp !== currentTeam?.name) {
                            alert("Verification name mismatch. Please type the exact workspace name.");
                            return;
                          }
                          if (confirm(`Are you absolutely sure you want to delete ${currentTeam?.name}? This is irreversible!`)) {
                            if (currentTeam) {
                              await deleteTeamWorkspace(currentTeam.id);
                              onLogActivity("Workspace Purged", `Permanently destroyed tenant workspace "${currentTeam.name}".`, "warning");
                              if (onTeamDeleted) {
                                onTeamDeleted(currentTeam.id);
                              }
                              onClose();
                            }
                          }
                        }}
                        className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer shadow-sm font-mono uppercase tracking-wide"
                      >
                        Delete Workspace
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-red-100/45 text-red-700 border border-red-200/40 rounded-xl text-[11px]">
                    ⚠️ Only the <b>Workspace Creator (Owner)</b> has authority to delete this workspace. Admins are blocked from destructive purging operations.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Section */}
        <div className="p-4 bg-[#1F1612]/5 border-t border-[#1F1612]/10 flex justify-end text-[10px] font-mono text-[#1F1612]/50">
          <span>Enterprise Workspace Sandboxing Standard Active</span>
        </div>
      </motion.div>
    </div>
  );
};
