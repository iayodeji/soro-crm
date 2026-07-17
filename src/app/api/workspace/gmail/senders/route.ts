export const dynamic = "force-dynamic";

import { NextResponse, type NextRequest } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getGoogleWorkspaceToken, GOOGLE_WORKSPACE_SCOPES, googleErrorMessage } from "@/lib/googleWorkspace";

type GmailSender = { sendAsEmail: string; displayName?: string; isPrimary?: boolean; isDefault?: boolean; verificationStatus?: string };
type SenderResult = { senders: GmailSender[] } | { error: string; status: number };

async function loadSenders(request: NextRequest): Promise<SenderResult> {
  const connection = await getGoogleWorkspaceToken(request, GOOGLE_WORKSPACE_SCOPES.gmailSettingsBasic);
  if ("error" in connection) return { error: connection.error, status: connection.status };
  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/settings/sendAs", {
    headers: { Authorization: `Bearer ${connection.token}` },
  });
  if (!response.ok) return { error: googleErrorMessage(await response.json().catch(() => null), "Gmail could not load your sender addresses."), status: response.status } as const;
  const data = await response.json() as { sendAs?: GmailSender[] };
  return {
    senders: (data.sendAs ?? []).filter((sender) => sender.verificationStatus === "accepted" || sender.isPrimary),
  } as const;
}

export async function GET(request: NextRequest) {
  const { userId } = getAuth(request);
  if (!userId) return NextResponse.json({ error: "Sign in before connecting Google Workspace." }, { status: 401 });
  const senderResult = await loadSenders(request);
  if ("error" in senderResult) return NextResponse.json({ error: senderResult.error }, { status: senderResult.status });

  const { data } = await getSupabaseAdmin().from("user_mail_preferences").select("fromEmail").eq("userId", userId).maybeSingle();
  const savedAddress = data?.fromEmail;
  const preferred = senderResult.senders.find((sender) => sender.sendAsEmail === savedAddress)?.sendAsEmail
    ?? senderResult.senders.find((sender) => sender.isDefault)?.sendAsEmail
    ?? senderResult.senders[0]?.sendAsEmail
    ?? null;
  return NextResponse.json({ senders: senderResult.senders, preferred });
}

export async function POST(request: NextRequest) {
  const { userId } = getAuth(request);
  const body = await request.json().catch(() => null) as { fromEmail?: string } | null;
  if (!userId || !body?.fromEmail) return NextResponse.json({ error: "A sender address is required." }, { status: 400 });
  const senderResult = await loadSenders(request);
  if ("error" in senderResult) return NextResponse.json({ error: senderResult.error }, { status: senderResult.status });
  if (!senderResult.senders.some((sender) => sender.sendAsEmail === body.fromEmail)) {
    return NextResponse.json({ error: "Choose an address verified in Gmail." }, { status: 400 });
  }

  const { error } = await getSupabaseAdmin().from("user_mail_preferences").upsert({ userId, fromEmail: body.fromEmail, updatedAt: new Date().toISOString() });
  if (error) return NextResponse.json({ error: "Could not save your sender preference." }, { status: 500 });
  return NextResponse.json({ ok: true, preferred: body.fromEmail });
}
