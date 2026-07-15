export const dynamic = "force-dynamic";
import { NextResponse, type NextRequest } from "next/server";
import { getSessionsByTeam } from "@/features/agent/server/sessionService";
import { getWorkspaceId } from "@/lib/workspace.server";

export async function GET(req: NextRequest) {
  try {
    const teamId = await getWorkspaceId(req);
    const sessions = await getSessionsByTeam(teamId, 20);
    return NextResponse.json({ sessions });
  } catch (error: any) {
    console.error("Failed to fetch sessions:", error);
    return NextResponse.json({ error: "Failed to fetch sessions." }, { status: 500 });
  }
}
