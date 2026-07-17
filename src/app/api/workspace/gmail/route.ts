export const dynamic = "force-dynamic";

import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getAuth } from "@clerk/nextjs/server";
import { getWorkspaceId } from "@/lib/workspace.server";
import { getGoogleWorkspaceToken, GOOGLE_WORKSPACE_SCOPES, googleErrorMessage, safeMailHeader, toBase64Url } from "@/lib/googleWorkspace";
import { createCrmActivity } from "@/features/activities/server/activityService";

export async function POST(request: NextRequest) {
  const teamId = getWorkspaceId(request);
  const { userId } = getAuth(request);
  const body = await request.json().catch(() => null) as { leadId?: string; subject?: string; body?: string } | null;
  if (!teamId || !userId || !body?.leadId || !body.subject?.trim() || !body.body?.trim()) {
    return NextResponse.json({ error: "A lead, subject, and message are required." }, { status: 400 });
  }

  const { data: lead, error: leadError } = await getSupabaseAdmin().from("leads")
    .select("id, name, email").eq("id", body.leadId).eq("teamId", teamId).maybeSingle();
  if (leadError || !lead?.email) return NextResponse.json({ error: "This lead needs an email address before you can send mail." }, { status: 400 });

  const connection = await getGoogleWorkspaceToken(request, GOOGLE_WORKSPACE_SCOPES.gmailSend);
  if ("error" in connection) return NextResponse.json({ error: connection.error }, { status: connection.status });
  const { data: preference } = await getSupabaseAdmin().from("user_mail_preferences").select("fromEmail").eq("userId", userId).maybeSingle();

  const mime = [
    `To: ${safeMailHeader(lead.email)}`,
    ...(preference?.fromEmail ? [`From: ${safeMailHeader(preference.fromEmail)}`] : []),
    `Subject: ${safeMailHeader(body.subject)}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "",
    body.body.trim(),
  ].join("\r\n");

  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${connection.token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ raw: toBase64Url(mime) }),
  });
  if (!response.ok) {
    return NextResponse.json({ error: googleErrorMessage(await response.json().catch(() => null), "Gmail could not send this message.") }, { status: response.status });
  }

  await getSupabaseAdmin().from("leads").update({ gmailSent: true, updatedAt: new Date().toISOString() }).eq("id", lead.id).eq("teamId", teamId);
  await createCrmActivity(teamId, userId, { leadId: lead.id, type: "email", outcome: "sent", summary: `Sent email to ${lead.name}`, notes: body.subject });
  const sent = await response.json();
  return NextResponse.json({ ok: true, messageId: sent.id });
}
