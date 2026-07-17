export const dynamic = "force-dynamic";
import { NextResponse, type NextRequest } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getWorkspaceId } from "@/lib/workspace.server";
import { ACTIVITY_TYPES, type CreateCrmActivityInput } from "@/types";
import { createCrmActivity } from "@/features/activities/server/activityService";

const OUTCOMES = new Set(["sent", "replied", "no_answer", "completed", "scheduled", "no_show", "bounced", "left_voicemail", "other"]);
function valid(input: any): input is CreateCrmActivityInput {
  return input && (typeof input.leadId === "string" || typeof input.companyId === "string") && ACTIVITY_TYPES.includes(input.type) && typeof input.summary === "string" && input.summary.trim() && (!input.outcome || OUTCOMES.has(input.outcome));
}
async function targetsBelongToTeam(teamId: string, input: CreateCrmActivityInput) {
  const db = getSupabaseAdmin();
  const checks = [];
  if (input.leadId) checks.push(db.from("leads").select("id").eq("id", input.leadId).eq("teamId", teamId).maybeSingle());
  if (input.companyId) checks.push(db.from("companies").select("id").eq("id", input.companyId).eq("teamId", teamId).maybeSingle());
  const results = await Promise.all(checks);
  return results.every(({ data, error }) => !error && data);
}
export async function GET(request: NextRequest) {
  const teamId = getWorkspaceId(request);
  if (!teamId) return NextResponse.json({ error: "An active organization is required." }, { status: 400 });
  const { searchParams } = new URL(request.url); const leadId = searchParams.get("leadId"); const companyId = searchParams.get("companyId");
  if (!leadId && !companyId) return NextResponse.json({ error: "A person or company is required." }, { status: 400 });
  let query = getSupabaseAdmin().from("crm_activities").select("*").eq("teamId", teamId).is("deletedAt", null).order("occurredAt", { ascending: false });
  query = leadId && companyId ? query.or(`leadId.eq.${leadId},companyId.eq.${companyId}`) : leadId ? query.eq("leadId", leadId) : query.eq("companyId", companyId!);
  const { data, error } = await query; if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const ids = [...new Set((data ?? []).flatMap((item: any) => [item.createdBy, item.updatedBy]))];
  const { data: members } = ids.length ? await getSupabaseAdmin().from("team_memberships").select("userId,name").eq("teamId", teamId).in("userId", ids) : { data: [] };
  const leadIds = [...new Set((data ?? []).map((item: any) => item.leadId).filter(Boolean))];
  const companyIds = [...new Set((data ?? []).map((item: any) => item.companyId).filter(Boolean))];
  const [{ data: leads }, { data: companies }] = await Promise.all([
    leadIds.length ? getSupabaseAdmin().from("leads").select("id,name").eq("teamId", teamId).in("id", leadIds) : Promise.resolve({ data: [] }),
    companyIds.length ? getSupabaseAdmin().from("companies").select("id,name").eq("teamId", teamId).in("id", companyIds) : Promise.resolve({ data: [] }),
  ]);
  const names = new Map((members ?? []).map((m: any) => [m.userId, m.name]));
  const leadNames = new Map((leads ?? []).map((lead: any) => [lead.id, lead.name]));
  const companyNames = new Map((companies ?? []).map((company: any) => [company.id, company.name]));
  return NextResponse.json({ activities: (data ?? []).map((a: any) => ({ ...a, actorName: names.get(a.createdBy) || "Team member", editorName: names.get(a.updatedBy) || "Team member", leadName: a.leadId ? leadNames.get(a.leadId) : null, companyName: a.companyId ? companyNames.get(a.companyId) : null })) });
}
export async function POST(request: NextRequest) {
  const teamId = getWorkspaceId(request); const { userId } = getAuth(request); const activity = await request.json().catch(() => null);
  if (!teamId || !userId) return NextResponse.json({ error: "Sign in to log progress." }, { status: 401 });
  if (!valid(activity) || !(await targetsBelongToTeam(teamId, activity))) return NextResponse.json({ error: "A valid activity and workspace records are required." }, { status: 400 });
  try { return NextResponse.json({ activity: await createCrmActivity(teamId, userId, activity) }); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
export async function PATCH(request: NextRequest) {
  const teamId = getWorkspaceId(request); const { userId } = getAuth(request); const body = await request.json().catch(() => null); const activity = body?.activity;
  if (!teamId || !userId || !body?.id || !valid(activity) || !(await targetsBelongToTeam(teamId, activity))) return NextResponse.json({ error: "A valid activity is required." }, { status: 400 });
  const { data, error } = await getSupabaseAdmin().from("crm_activities").update({ leadId: activity.leadId || null, companyId: activity.companyId || null, type: activity.type, outcome: activity.outcome || null, summary: activity.summary.trim(), notes: activity.notes?.trim() || null, occurredAt: activity.occurredAt, nextStep: activity.nextStep?.trim() || null, followUpAt: activity.followUpAt || null, updatedBy: userId, updatedAt: new Date().toISOString() }).eq("id", body.id).eq("teamId", teamId).is("deletedAt", null).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 }); return NextResponse.json({ activity: data });
}
export async function DELETE(request: NextRequest) {
  const teamId = getWorkspaceId(request); const { userId } = getAuth(request); const id = new URL(request.url).searchParams.get("id");
  if (!teamId || !userId || !id) return NextResponse.json({ error: "An activity is required." }, { status: 400 });
  const { error } = await getSupabaseAdmin().from("crm_activities").update({ deletedAt: new Date().toISOString(), deletedBy: userId, updatedBy: userId, updatedAt: new Date().toISOString() }).eq("id", id).eq("teamId", teamId).is("deletedAt", null);
  return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ ok: true });
}
