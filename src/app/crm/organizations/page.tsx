"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useOrganizationList, useOrganization, useClerk } from "@clerk/nextjs";
import { useAuth } from "@clerk/nextjs";
import {
  Plus,
  Building2,
  Users,
  ArrowLeft,
  Loader2,
  Settings,
  UserPlus,
  Trash2,
  MoreVertical,
} from "lucide-react";
import { CreateOrganizationModal } from "@/components/organizations/CreateOrganizationModal";
import { ManageMembersModal } from "@/components/organizations/ManageMembersModal";

interface Organization {
  id: string;
  name: string;
  slug?: string;
  role?: string;
  createdAt?: number;
  membersCount?: number;
}

export default function OrganizationsPage() {
  const router = useRouter();
  const { setActive } = useClerk();
  const { organization: currentOrg, isLoaded: orgLoaded } = useOrganization();
  const {
    userMemberships,
    isLoaded: listLoaded,
    setActive: setActiveOrg,
  } = useOrganizationList({
    userMemberships: {
      infinite: true,
    },
  });

  const { userId } = useAuth();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [manageOrg, setManageOrg] = useState<Organization | null>(null);
  const [localOrgs, setLocalOrgs] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchOrgs = async () => {
      setIsLoading(true);
      try {
        const res = await fetch("/api/organizations");
        if (res.ok) {
          const data = await res.json();
          setLocalOrgs(data || []);
        }
      } catch (err) {
        console.error("Failed to fetch organizations:", err);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchOrgs();
  }, []);

  const handleSwitch = async (orgId: string) => {
    await setActiveOrg({ organization: orgId });
    router.push("/crm");
  };

  const handleCreate = async () => {
    setShowCreateModal(false);
    await fetchOrgs();
  };

  const fetchOrgs = async () => {
    try {
      const res = await fetch("/api/organizations");
      if (res.ok) {
        const data = await res.json();
        setLocalOrgs(data || []);
      }
    } catch (err) {
      console.error("Failed to fetch organizations:", err);
    }
  };

  if (!listLoaded || !orgLoaded || isLoading) {
    return (
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-[#7A8452]" />
        </div>
      </main>
    );
  }

  const displayOrgs = localOrgs.length > 0 ? localOrgs : (userMemberships?.data || []).map((m) => ({
    id: m.organization.id,
    name: m.organization.name,
    slug: m.organization.slug,
    role: m.role,
    createdAt: m.organization.createdAt,
  }));

  return (
    <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/crm")}
            className="p-2 rounded-full hover:bg-[#1F1612]/5 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-[#1F1612]/60" />
          </button>
          <div>
            <h1 className="font-serif font-bold italic text-3xl sm:text-4xl tracking-tight">
              Workspaces
            </h1>
            <p className="text-sm text-[#1F1612]/60 mt-1">
              Manage your teams and workspaces
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#B74A26] text-white text-sm font-semibold hover:bg-[#a03f20] transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">New Workspace</span>
        </button>
      </div>

      {/* Current Active Workspace */}
      {currentOrg && (
        <section className="space-y-4">
          <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#1F1612]/50">
            Active Workspace
          </div>
          <div className="bg-[#7A8452]/5 border border-[#7A8452]/20 rounded-xl p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#7A8452]/10 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-[#7A8452]" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-xl">{currentOrg.name}</h3>
                <p className="text-sm text-[#1F1612]/60 mt-0.5">
                  {currentOrg.slug || `org_${currentOrg.id.slice(0, 8)}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setManageOrg({
                  id: currentOrg.id,
                  name: currentOrg.name,
                  slug: currentOrg.slug,
                  role: "admin",
                })}
                className="p-2 rounded-full hover:bg-[#7A8452]/10 transition-colors"
                title="Manage members"
              >
                <Users className="w-5 h-5 text-[#7A8452]" />
              </button>
              <button
                onClick={() => router.push(`/crm/organizations/${currentOrg.id}`)}
                className="p-2 rounded-full hover:bg-[#7A8452]/10 transition-colors"
                title="Settings"
              >
                <Settings className="w-5 h-5 text-[#7A8452]" />
              </button>
            </div>
          </div>
        </section>
      )}

      {/* All Workspaces */}
      <section className="space-y-4">
        <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#1F1612]/50">
          All Workspaces ({displayOrgs.length})
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {displayOrgs.map((org) => {
            const isActive = currentOrg?.id === org.id;
            return (
              <div
                key={org.id}
                className={`rounded-xl border p-6 hover:shadow-md transition-all ${
                  isActive
                    ? "border-[#7A8452] bg-[#7A8452]/5"
                    : "border-[#1F1612]/10 bg-white"
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-[#1F1612]/5 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-[#1F1612]/60" />
                  </div>
                  {isActive && (
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#7A8452] bg-[#7A8452]/10 px-2 py-0.5 rounded-full">
                      Active
                    </span>
                  )}
                </div>

                <h3 className="font-serif font-bold text-lg mb-1">{org.name}</h3>
                <p className="text-xs text-[#1F1612]/50 font-mono mb-4">
                  {org.slug || `org_${org.id.slice(0, 8)}`}
                </p>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleSwitch(org.id)}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-[#7A8452] text-white hover:bg-[#6a7348]"
                        : "bg-[#1F1612]/5 text-[#1F1612] hover:bg-[#1F1612]/10"
                    }`}
                  >
                    {isActive ? "Current" : "Switch"}
                  </button>
                  <button
                    onClick={() => setManageOrg({
                      id: org.id,
                      name: org.name,
                      slug: org.slug,
                      role: org.role || "member",
                    })}
                    className="p-2 rounded-lg border border-[#1F1612]/10 hover:bg-[#1F1612]/5 transition-colors"
                    title="Manage members"
                  >
                    <Users className="w-4 h-4 text-[#1F1612]/60" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {displayOrgs.length === 0 && (
          <div className="text-center py-16 border-2 border-dashed border-[#1F1612]/10 rounded-xl">
            <Building2 className="w-12 h-12 text-[#1F1612]/20 mx-auto mb-4" />
            <h3 className="font-serif font-bold text-lg mb-2">No workspaces yet</h3>
            <p className="text-sm text-[#1F1612]/60 mb-6">
              Create your first workspace to start collaborating with your team.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#B74A26] text-white text-sm font-semibold hover:bg-[#a03f20] transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Workspace
            </button>
          </div>
        )}
      </section>

      <CreateOrganizationModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />

      {manageOrg && (
        <ManageMembersModal
          isOpen={!!manageOrg}
          onClose={() => setManageOrg(null)}
          orgId={manageOrg.id}
          orgName={manageOrg.name}
        />
      )}
    </main>
  );
}
