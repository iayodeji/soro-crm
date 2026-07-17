import Link from "next/link";

export function EntityTabs({ active }: { active: "people" | "companies" }) {
  const tabs = [
    { label: "People", href: "/crm", key: "people" },
    { label: "Companies", href: "/crm/companies", key: "companies" },
  ] as const;

  return (
    <nav aria-label="CRM records" className="flex items-center gap-1 rounded-xl border border-[#1F1612]/10 bg-white/60 p-1 w-fit">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          aria-current={active === tab.key ? "page" : undefined}
          className={`min-h-9 px-3 sm:px-4 inline-flex items-center rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B74A26] ${
            active === tab.key
              ? "bg-[#1F1612] text-[#FDFBF2] shadow-sm"
              : "text-[#1F1612]/60 hover:bg-[#1F1612]/5 hover:text-[#1F1612]"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
