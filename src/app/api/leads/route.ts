export const dynamic = "force-dynamic";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { ensureWorkspaceTeam, getWorkspaceId } from "@/lib/workspace.server";
import type { Lead, CreateLeadInput } from "@/types";

const PHASES = new Set(["lead_found", "prospect_engaged", "client_closed"]);

function requireLeadBody(body: unknown) {
  const lead = (body as { lead?: CreateLeadInput } | null)?.lead;
  const valid =
    lead &&
    typeof lead.id === "string" && lead.id.trim() &&
    typeof lead.name === "string" && lead.name.trim() &&
    typeof lead.company_name === "string" && lead.company_name.trim() &&
    typeof lead.notes === "string" &&
    typeof lead.createdAt === "string" &&
    typeof lead.updatedAt === "string" &&
    PHASES.has(lead.phase) &&
    (lead.email === null || typeof lead.email === "string") &&
    (lead.phone === null || typeof lead.phone === "string") &&
    (lead.linkedinUrl === undefined || lead.linkedinUrl === null || typeof lead.linkedinUrl === "string") &&
    (lead.companyWebsite === undefined || lead.companyWebsite === null || typeof lead.companyWebsite === "string");

  if (!valid) {
    return { error: NextResponse.json({ error: "A complete, valid lead is required." }, { status: 400 }) };
  }
  return { lead };
}

export async function GET(req: NextRequest) {
  const teamId = getWorkspaceId(req);
  if (!teamId) {
    return NextResponse.json({ error: "An active organization is required." }, { status: 400 });
  }

  try {
    const { data, error } = await getSupabaseAdmin()
      .from("leads")
      .select("*")
      .eq("teamId", teamId);

    if (error) {
      throw new Error(error.message);
    }

    const leads: Lead[] = (data ?? []).map((row: any) => ({
      id: row.id,
      teamId: row.teamId,
      name: row.name,
      company_name: row.company_name,
      email: row.email,
      phone: row.phone,
      notes: row.notes,
      phase: row.phase,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      marketFitThesis: row.marketFitThesis,
      momTestQuestions: row.momTestQuestions,
      linkedinUrl: row.linkedinUrl,
      companyWebsite: row.companyWebsite,
      gmailSent: row.gmailSent,
      calendarScheduled: row.calendarScheduled,
      sheetsSynced: row.sheetsSynced,
      tasksCreated: row.tasksCreated,
    }));

    return NextResponse.json({ leads });
  } catch (error: any) {
    console.error("Failed to fetch leads:", error);
    return NextResponse.json({ error: "Failed to load leads." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const teamId = getWorkspaceId(request);
  if (!teamId) {
    return NextResponse.json({ error: "An active organization is required." }, { status: 400 });
  }
  const body = await request.json().catch(() => null);
  const { lead, error } = await requireLeadBody(body);
  if (error) return error;

  try {
    await ensureWorkspaceTeam(request);

    const { data, error: insertError } = await getSupabaseAdmin()
      .from("leads")
      .insert({
        ...lead,
        teamId,
        updatedAt: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(insertError.message);
    }

    return NextResponse.json({ ok: true, lead: data });
  } catch (error: any) {
    console.error("Failed to save lead:", error);
    return NextResponse.json({ error: "Failed to save lead." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const teamId = getWorkspaceId(request);
  if (!teamId) {
    return NextResponse.json({ error: "An active organization is required." }, { status: 400 });
  }
  const body = await request.json().catch(() => null);
  const { lead, error } = await requireLeadBody(body);
  if (error) return error;

  try {
    const { data: existing, error: lookupError } = await getSupabaseAdmin()
      .from("leads")
      .select("teamId")
      .eq("id", lead!.id)
      .maybeSingle();

    if (lookupError) throw new Error(lookupError.message);

    if (existing && existing.teamId !== teamId) {
      return NextResponse.json({ error: "Lead belongs to another workspace." }, { status: 403 });
    }
    if (!existing) {
      return NextResponse.json({ error: "Lead not found in this workspace." }, { status: 404 });
    }

    const { data, error: updateError } = await getSupabaseAdmin()
      .from("leads")
      .update({
        ...lead,
        teamId,
        updatedAt: new Date().toISOString(),
      })
      .eq("id", lead!.id)
      .eq("teamId", teamId)
      .select()
      .single();

    if (updateError) {
      throw new Error(updateError.message);
    }

    return NextResponse.json({ ok: true, lead: data });
  } catch (error: any) {
    console.error("Failed to update lead:", error);
    return NextResponse.json({ error: "Failed to update lead." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const teamId = getWorkspaceId(request);
  if (!teamId) {
    return NextResponse.json({ error: "An active organization is required." }, { status: 400 });
  }
  const { searchParams } = new URL(request.url);
  const leadId = searchParams.get("leadId");
  if (!leadId) {
    return NextResponse.json({ error: "leadId is required." }, { status: 400 });
  }

  try {
    const { data: existing } = await getSupabaseAdmin()
      .from("leads")
      .select("teamId")
      .eq("id", leadId)
      .single();

    if (!existing || existing.teamId !== teamId) {
      return NextResponse.json({ error: "Lead not found in this workspace." }, { status: 404 });
    }

    const { error } = await getSupabaseAdmin()
      .from("leads")
      .delete()
      .eq("id", leadId);

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Failed to delete lead:", error);
    return NextResponse.json({ error: "Failed to delete lead." }, { status: 500 });
  }
}
