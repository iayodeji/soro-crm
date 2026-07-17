export const dynamic = "force-dynamic";

import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getWorkspaceId } from "@/lib/workspace.server";
import { getAuth } from "@clerk/nextjs/server";
import { getGoogleWorkspaceToken, GOOGLE_WORKSPACE_SCOPES, googleErrorMessage } from "@/lib/googleWorkspace";
import { createCrmActivity } from "@/features/activities/server/activityService";

export async function POST(request: NextRequest) {
  const teamId = getWorkspaceId(request);
  const { userId } = getAuth(request);
  const body = await request.json().catch(() => null) as { leadId?: string; title?: string; description?: string; startAt?: string; endAt?: string } | null;
  const start = body?.startAt ? new Date(body.startAt) : null;
  const end = body?.endAt ? new Date(body.endAt) : null;
  if (!teamId || !userId || !body?.leadId || !body.title?.trim() || !start || !end || Number.isNaN(start.valueOf()) || Number.isNaN(end.valueOf()) || end <= start) {
    return NextResponse.json({ error: "Choose a title and a valid start and end time." }, { status: 400 });
  }

  const { data: lead, error: leadError } = await getSupabaseAdmin().from("leads")
    .select("id, name, email").eq("id", body.leadId).eq("teamId", teamId).maybeSingle();
  if (leadError || !lead) return NextResponse.json({ error: "Lead not found in this workspace." }, { status: 404 });

  const connection = await getGoogleWorkspaceToken(request, GOOGLE_WORKSPACE_SCOPES.calendarEvents);
  if ("error" in connection) return NextResponse.json({ error: connection.error }, { status: connection.status });

  const response = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all", {
    method: "POST",
    headers: { Authorization: `Bearer ${connection.token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      summary: body.title.trim(), description: body.description?.trim() || undefined,
      start: { dateTime: start.toISOString() }, end: { dateTime: end.toISOString() },
      attendees: lead.email ? [{ email: lead.email }] : undefined,
    }),
  });
  if (!response.ok) {
    return NextResponse.json({ error: googleErrorMessage(await response.json().catch(() => null), "Google Calendar could not create this event.") }, { status: response.status });
  }

  await getSupabaseAdmin().from("leads").update({ calendarScheduled: true, updatedAt: new Date().toISOString() }).eq("id", lead.id).eq("teamId", teamId);
  await createCrmActivity(teamId, userId, { leadId: lead.id, type: "meeting", outcome: "scheduled", summary: `Scheduled ${body.title.trim()}`, notes: body.description, occurredAt: start.toISOString() });
  const event = await response.json();
  return NextResponse.json({ ok: true, eventId: event.id, eventUrl: event.htmlLink });
}
