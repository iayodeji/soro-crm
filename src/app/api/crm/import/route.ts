export const dynamic = "force-dynamic";

import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { ensureWorkspaceTeam, getWorkspaceId } from "@/lib/workspace.server";

const PHASES = new Set(["lead_found", "prospect_engaged", "client_closed"]);
const MAX_IMPORT_ROWS = 1_000;

type CsvRow = Record<string, unknown>;

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function phase(value: unknown) {
  const normalized = text(value).toLowerCase().replace(/[-\s]+/g, "_");
  const aliases: Record<string, string> = { lead: "lead_found", prospect: "prospect_engaged", client: "client_closed" };
  return PHASES.has(normalized) ? normalized : aliases[normalized] ?? "lead_found";
}

export async function POST(request: NextRequest) {
  const teamId = getWorkspaceId(request);
  if (!teamId) return NextResponse.json({ error: "An active organization is required." }, { status: 400 });

  const body = await request.json().catch(() => null) as { entity?: unknown; rows?: unknown } | null;
  const entity = body?.entity;
  const rows = body?.rows;
  if ((entity !== "people" && entity !== "companies") || !Array.isArray(rows) || rows.length === 0 || rows.length > MAX_IMPORT_ROWS || !rows.every((row) => row && typeof row === "object" && !Array.isArray(row))) {
    return NextResponse.json({ error: "Provide 1 to 1,000 valid CSV rows and an import entity." }, { status: 400 });
  }

  const timestamp = new Date().toISOString();
  if (entity === "people") {
    const invalidIndex = rows.findIndex((row) => !text((row as CsvRow).name) || !text((row as CsvRow).company_name));
    if (invalidIndex >= 0) return NextResponse.json({ error: `Row ${invalidIndex + 2} needs a name and company.` }, { status: 400 });
    const leads = rows.map((row) => {
      const item = row as CsvRow;
      return {
        id: `lead-${crypto.randomUUID()}`, teamId, name: text(item.name), company_name: text(item.company_name),
        email: text(item.email) || null, phone: text(item.phone) || null, notes: text(item.notes), phase: phase(item.phase),
        linkedinUrl: text(item.linkedinUrl) || null, companyWebsite: text(item.companyWebsite) || null,
        createdAt: timestamp, updatedAt: timestamp,
      };
    });
    try {
      await ensureWorkspaceTeam(request);
      const { data, error } = await getSupabaseAdmin().from("leads").insert(leads).select();
      if (error) throw error;
      return NextResponse.json({ imported: data ?? [] }, { status: 201 });
    } catch (error: any) {
      console.error("Failed to import people:", error);
      return NextResponse.json({ error: "People import failed. No rows were saved." }, { status: 500 });
    }
  }

  const invalidIndex = rows.findIndex((row) => !text((row as CsvRow).name));
  if (invalidIndex >= 0) return NextResponse.json({ error: `Row ${invalidIndex + 2} needs a company name.` }, { status: 400 });
  const companies = rows.map((row) => {
    const item = row as CsvRow;
    return {
      id: `company-${crypto.randomUUID()}`, teamId, name: text(item.name), website: text(item.website) || null,
      industry: text(item.industry) || null, notes: text(item.notes), phase: phase(item.phase), createdAt: timestamp, updatedAt: timestamp,
    };
  });
  try {
    await ensureWorkspaceTeam(request);
    const { data, error } = await getSupabaseAdmin().from("companies").insert(companies).select();
    if (error) throw error;
    return NextResponse.json({ imported: data ?? [] }, { status: 201 });
  } catch (error: any) {
    console.error("Failed to import companies:", error);
    return NextResponse.json({ error: "Company import failed. No rows were saved." }, { status: 500 });
  }
}
