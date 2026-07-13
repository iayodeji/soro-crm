import { NextResponse } from "next/server";
import { getSessionsByTeam } from "@/features/agent/server/sessionService";
import { getAuthUser } from "@/lib/serverAuth";
import { isUserTeamMember } from "@/lib/teamAccess";

export async function GET(request: Request) {
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const teamId = searchParams.get("teamId");

  if (!teamId) {
    return NextResponse.json({ error: "teamId is required." }, { status: 400 });
  }

  const isMember = await isUserTeamMember(teamId, authUser.uid);
  if (!isMember) {
    return NextResponse.json({ error: "You do not have access to this team." }, { status: 403 });
  }

  try {
    const sessions = await getSessionsByTeam(teamId, 20);
    return NextResponse.json({ sessions });
  } catch (error: any) {
    console.error("Failed to fetch sessions:", error);
    return NextResponse.json({ error: "Failed to fetch sessions." }, { status: 500 });
  }
}