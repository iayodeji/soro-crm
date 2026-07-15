"use client";

import { useState, useRef, useEffect } from "react";
import { useOrganizationList, useOrganization, useClerk } from "@clerk/nextjs";
import { ChevronDown, Plus, Building2, Users } from "lucide-react";
import { CreateOrganizationModal } from "./CreateOrganizationModal";

export function OrganizationSwitcher() {
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

  const [isOpen, setIsOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSwitch = async (orgId: string) => {
    await setActiveOrg({ organization: orgId });
    setIsOpen(false);
  };

  const handleManage = () => {
    setIsOpen(false);
    window.location.href = "/crm/organizations";
  };

  if (!listLoaded || !orgLoaded) {
    return (
      <div className="h-8 w-8 rounded-full bg-[#1F1612]/10 animate-pulse" />
    );
  }

  const orgs = (userMemberships?.data || []).map((m) => ({
    id: m.organization.id,
    name: m.organization.name,
    slug: m.organization.slug,
    role: m.role,
  }));

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 bg-[#1F1612]/5 hover:bg-[#1F1612]/10 px-2.5 py-1.5 rounded-full border border-[#1F1612]/10 transition-colors"
      >
        <Building2 className="w-3.5 h-3.5 text-[#7A8452]" />
        <span className="text-[11px] font-mono font-semibold tracking-wider text-[#1F1612]/70 uppercase max-w-[120px] truncate">
          {currentOrg?.name || "Personal"}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-[#1F1612]/50" />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-[#1F1612]/10 py-1 z-50">
          <div className="px-3 py-2 text-[10px] font-mono font-bold uppercase tracking-widest text-[#1F1612]/50 border-b border-[#1F1612]/10">
            Workspaces
          </div>

          {orgs.map((org) => (
            <button
              key={org.id}
              onClick={() => handleSwitch(org.id)}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-[#1F1612]/5 flex items-center gap-2 transition-colors ${
                currentOrg?.id === org.id
                  ? "bg-[#7A8452]/10 text-[#7A8452]"
                  : "text-[#1F1612]"
              }`}
            >
              <Building2 className="w-4 h-4" />
              <div className="flex-1 min-w-0">
                <div className="truncate font-medium">{org.name}</div>
                <div className="text-[10px] text-[#1F1612]/50 font-mono">
                  {org.role || "Member"}
                </div>
              </div>
              {currentOrg?.id === org.id && (
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#7A8452]">
                  Active
                </span>
              )}
            </button>
          ))}

          <div className="border-t border-[#1F1612]/10 mt-1 pt-1">
            <button
              onClick={() => setShowCreateModal(true)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-[#1F1612]/5 flex items-center gap-2 text-[#1F1612]/70 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="font-medium">Create Workspace</span>
            </button>
            <button
              onClick={handleManage}
              className="w-full text-left px-3 py-2 text-sm hover:bg-[#1F1612]/5 flex items-center gap-2 text-[#1F1612]/70 transition-colors"
            >
              <Users className="w-4 h-4" />
              <span className="font-medium">Manage All Workspaces</span>
            </button>
          </div>
        </div>
      )}

      <CreateOrganizationModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </div>
  );
}
