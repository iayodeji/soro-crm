"use client";

import { useState, useEffect } from "react";
import { X, Loader2, UserPlus, Trash2, Mail } from "lucide-react";

interface Member {
  id: string;
  userId: string;
  email?: string;
  name?: string;
  role: string;
  imageUrl?: string;
}

interface ManageMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  orgId: string;
  orgName: string;
}

export function ManageMembersModal({ isOpen, onClose, orgId, orgName }: ManageMembersModalProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("org:member");

  useEffect(() => {
    if (!isOpen) return;

    const fetchMembers = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/organizations/${orgId}/members`);
        if (!res.ok) {
          throw new Error("Failed to fetch members");
        }
        const data = await res.json();
        setMembers(data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load members");
      } finally {
        setIsLoading(false);
      }
    };

    void fetchMembers();
  }, [isOpen, orgId]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/organizations/${orgId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to invite member");
      }

      setInviteEmail("");
      setInviteRole("org:member");
      setStatus("Invitation email sent. They will join this workspace after opening it while signed in with this email address.");
      
      setTimeout(() => setStatus(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemove = async (userId: string) => {
    if (!confirm("Are you sure you want to remove this member?")) return;

    try {
      const res = await fetch(`/api/organizations/${orgId}/members/${userId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to remove member");
      }

      setMembers((prev) => prev.filter((m) => m.userId !== userId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove member");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1F1612]/10 flex-shrink-0">
          <div>
            <h2 className="font-serif font-bold text-xl">Team Members</h2>
            <p className="text-sm text-[#1F1612]/60 mt-0.5">{orgName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-[#1F1612]/5 transition-colors"
          >
            <X className="w-5 h-5 text-[#1F1612]/60" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-sm text-red-700">
              {error}
            </div>
          )}

          {status && (
            <div className="p-3 rounded-lg bg-green-50 border border-green-100 text-sm text-green-700">
              {status}
            </div>
          )}

          {/* Invite Form */}
          <form onSubmit={handleInvite} className="space-y-3">
            <label className="block text-sm font-medium text-[#1F1612]/80">
              Invite Team Member
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1F1612]/40" />
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  className="w-full rounded-lg border border-[#1F1612]/10 bg-[#FDFBF2] pl-9 pr-4 py-2.5 text-sm outline-none focus:border-[#1F1612]/30 focus:ring-2 focus:ring-[#1F1612]/5 transition-all"
                />
              </div>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="rounded-lg border border-[#1F1612]/10 bg-[#FDFBF2] px-3 py-2.5 text-sm outline-none focus:border-[#1F1612]/30"
              >
                <option value="org:member">Member</option>
                <option value="org:admin">Admin</option>
              </select>
              <button
                type="submit"
                disabled={!inviteEmail.trim() || isSubmitting}
                className="px-4 py-2.5 rounded-lg bg-[#7A8452] text-white text-sm font-semibold hover:bg-[#6a7348] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <UserPlus className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">Invite</span>
              </button>
            </div>
          </form>

          {/* Members List */}
          <div className="space-y-2">
            <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#1F1612]/50 border-b border-[#1F1612]/10 pb-2">
              Members ({members.length})
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3 animate-pulse">
                    <div className="w-8 h-8 rounded-full bg-[#1F1612]/10" />
                    <div className="flex-1 space-y-1">
                      <div className="h-4 bg-[#1F1612]/10 rounded w-32" />
                      <div className="h-3 bg-[#1F1612]/10 rounded w-20" />
                    </div>
                  </div>
                ))}
              </div>
            ) : members.length === 0 ? (
              <div className="text-center py-8 text-sm text-[#1F1612]/50">
                No members yet. Invite your first team member above.
              </div>
            ) : (
              <div className="space-y-2">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-[#1F1612]/5 hover:border-[#1F1612]/10 hover:bg-[#1F1612]/[0.02] transition-colors"
                  >
                    {member.imageUrl ? (
                      <img
                        src={member.imageUrl}
                        alt={member.name || member.email}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-[#7A8452]/10 flex items-center justify-center text-[10px] font-bold text-[#7A8452]">
                        {(member.name ?? member.email ?? "?").charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {member.name || "Unnamed User"}
                      </div>
                      <div className="text-[11px] text-[#1F1612]/50 font-mono">
                        {member.email}
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#7A8452] bg-[#7A8452]/10 px-2 py-0.5 rounded-full">
                      {member.role === "org:admin" || member.role === "admin" ? "Admin" : "Member"}
                    </span>
                    <button
                      onClick={() => handleRemove(member.userId)}
                      className="p-1.5 rounded-full hover:bg-red-50 text-[#1F1612]/40 hover:text-red-600 transition-colors"
                      title="Remove member"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-[#1F1612]/10 flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 rounded-lg border border-[#1F1612]/10 text-sm font-medium hover:bg-[#1F1612]/5 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
