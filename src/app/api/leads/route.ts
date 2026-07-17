export const dynamic = "force-dynamic";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getWorkspaceId } from "@/lib/workspace.server";
import type { Lead, CreateLeadInput } from "@/types";

async function requireLeadBody(body: any) {
  const lead = body?.lead as CreateLeadInput | undefined;
  if (!lead?.id) {
    return { error: NextResponse.json({ error: "lead.id is required." }, { status: 400 }) };
  }
  return { lead };
}

export async function GET(req: NextRequest) {
  try {
    const teamId = await getWorkspaceId(req);
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
  const teamId = await getWorkspaceId(request);
  const body = await request.json().catch(() => null);
  const { lead, error } = await requireLeadBody(body);
  if (error) return error;

  try {
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
  const teamId = await getWorkspaceId(request);
  const body = await request.json().catch(() => null);
  const { lead, error } = await requireLeadBody(body);
  if (error) return error;

  try {
    // 1. Check if it exists (using maybeSingle so it doesn't throw if not found)
    const { data: existing } = await getSupabaseAdmin()
      .from("leads")
      .select("teamId")
      .eq("id", lead!.id)
      .maybeSingle();

    // 2. If it DOES exist but belongs to another workspace, deny access
    if (existing && existing.teamId !== teamId) {
      return NextResponse.json({ error: "Lead belongs to another workspace." }, { status: 403 });
    }

    // 3. Upsert the lead (Creates it if new, Updates it if existing)
    const { data, error: upsertError } = await getSupabaseAdmin()
      .from("leads")
      .upsert({
        ...lead,
        teamId, // Force assignment to current workspace
        updatedAt: new Date().toISOString(),
      }, {
        onConflict: 'id'
      })
      .select()
      .single();

    if (upsertError) {
      throw new Error(upsertError.message);
    }

    return NextResponse.json({ ok: true, lead: data });
  } catch (error: any) {
    console.error("Failed to update lead:", error);
    return NextResponse.json({ error: "Failed to update lead." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const teamId = await getWorkspaceId(request);
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