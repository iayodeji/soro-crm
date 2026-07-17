import { clerkClient, getAuth } from "@clerk/nextjs/server";
import type { NextRequest } from "next/server";

export const GOOGLE_WORKSPACE_SCOPES = {
  gmailSend: "https://www.googleapis.com/auth/gmail.send",
  gmailSettingsBasic: "https://www.googleapis.com/auth/gmail.settings.basic",
  calendarEvents: "https://www.googleapis.com/auth/calendar.events",
} as const;

export async function getGoogleWorkspaceToken(request: NextRequest, requiredScope: string) {
  const { userId } = getAuth(request);
  if (!userId) return { error: "Sign in before connecting Google Workspace.", status: 401 } as const;

  const client = await clerkClient();
  const tokens = await client.users.getUserOauthAccessToken(userId, "google");
  const token = tokens.data[0];
  if (!token?.token) {
    return { error: "Connect your Google account from the profile menu, then try again.", status: 403 } as const;
  }
  if (!token.scopes?.includes(requiredScope)) {
    return { error: "Reconnect Google from the profile menu and approve Mail and Calendar access.", status: 403 } as const;
  }
  return { token: token.token } as const;
}

export function googleErrorMessage(body: unknown, fallback: string) {
  const message = (body as { error?: { message?: string } } | null)?.error?.message;
  return message || fallback;
}

export function toBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

export function safeMailHeader(value: string) {
  return value.replace(/[\r\n]+/g, " ").trim();
}
