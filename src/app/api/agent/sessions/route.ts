export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getSessionsByTeam } from "@/features/agent/server/sessionService";
import { WORKSPACE_ID } from "@/lib/workspace";

export async function GET() {
  try {
    const sessions = await getSessionsByTeam(WORKSPACE_ID, 20);
    return NextResponse.json({ sessions });
  } catch (error: any) {
    console.error("Failed to fetch sessions:", error);
    return NextResponse.json({ error: "Failed to fetch sessions." }, { status: 500 });
  }
}
