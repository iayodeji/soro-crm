export const dynamic = "force-dynamic";

import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { ensureWorkspaceTeam, getWorkspaceId } from "@/lib/workspace.server";
import type { Company, CreateCompanyInput } from "@/types";

const PHASES = new Set(["lead_found", "prospect_engaged", "client_closed"]);

function requireCompanyBody(body: unknown) {
  const company = (body as { company?: CreateCompanyInput } | null)?.company;
  const valid = company &&
    typeof company.id === "string" && company.id.trim() &&
    typeof company.name === "string" && company.name.trim() &&
    typeof company.notes === "string" &&
    typeof company.createdAt === "string" &&
    typeof company.updatedAt === "string" &&
    PHASES.has(company.phase) &&
    (company.website === null || typeof company.website === "string") &&
    (company.industry === null || typeof company.industry === "string");

  return valid ? { company } : { error: NextResponse.json({ error: "A complete, valid company is required." }, { status: 400 }) };
}

export async function GET(request: NextRequest) {
  const teamId = getWorkspaceId(request);
  if (!teamId) return NextResponse.json({ error: "An active organization is required." }, { status: 400 });

  try {
    const { data, error } = await getSupabaseAdmin().from("companies").select("*").eq("teamId", teamId).order("updatedAt", { ascending: false });
    if (error) throw new Error(error.message);
    const companies: Company[] = (data ?? []).map((row: any) => ({
      id: row.id, teamId: row.teamId, name: row.name, website: row.website,
      industry: row.industry, notes: row.notes, phase: row.phase,
      createdAt: row.createdAt, updatedAt: row.updatedAt,
    }));
    return NextResponse.json({ companies });
  } catch (error: any) {
    console.error("Failed to fetch companies:", error);
    return NextResponse.json({ error: "Failed to load companies." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const teamId = getWorkspaceId(request);
  if (!teamId) return NextResponse.json({ error: "An active organization is required." }, { status: 400 });
  const { company, error } = requireCompanyBody(await request.json().catch(() => null));
  if (error) return error;

  try {
    await ensureWorkspaceTeam(request);
    const { data, error: insertError } = await getSupabaseAdmin().from("companies").insert({ ...company, teamId, updatedAt: new Date().toISOString() }).select().single();
    if (insertError) throw new Error(insertError.message);
    return NextResponse.json({ ok: true, company: data });
  } catch (error: any) {
    console.error("Failed to save company:", error);
    return NextResponse.json({ error: "Failed to save company." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const teamId = getWorkspaceId(request);
  if (!teamId) return NextResponse.json({ error: "An active organization is required." }, { status: 400 });
  const { company, error } = requireCompanyBody(await request.json().catch(() => null));
  if (error) return error;

  try {
    const { data, error: updateError } = await getSupabaseAdmin().from("companies")
      .update({ ...company, teamId, updatedAt: new Date().toISOString() })
      .eq("id", company!.id).eq("teamId", teamId).select().single();
    if (updateError) throw new Error(updateError.message);
    return NextResponse.json({ ok: true, company: data });
  } catch (error: any) {
    console.error("Failed to update company:", error);
    return NextResponse.json({ error: "Failed to update company." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const teamId = getWorkspaceId(request);
  const companyId = new URL(request.url).searchParams.get("companyId");
  if (!teamId || !companyId) return NextResponse.json({ error: "An active organization and companyId are required." }, { status: 400 });

  try {
    const { error } = await getSupabaseAdmin().from("companies").delete().eq("id", companyId).eq("teamId", teamId);
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Failed to delete company:", error);
    return NextResponse.json({ error: "Failed to delete company." }, { status: 500 });
  }
}
