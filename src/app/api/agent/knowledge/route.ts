export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getTeamKnowledge, saveTeamKnowledge } from "@/features/agent/server/sessionService";
import { getAuthUser } from "@/lib/serverAuth";

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

  try {
    const knowledge = await getTeamKnowledge(teamId);
    return NextResponse.json({ knowledge });
  } catch (error: any) {
    console.error("Failed to fetch team knowledge:", error);
    return NextResponse.json({ error: "Failed to fetch team knowledge." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body.teamId !== "string") {
    return NextResponse.json({ error: "teamId is required." }, { status: 400 });
  }

  try {
      const knowledge = await saveTeamKnowledge({
        teamId: body.teamId,
        salesProcess: body.salesProcess,
        leadScoringCriteria: body.leadScoringCriteria,
        commonObjections: body.commonObjections,
        customInstructions: body.customInstructions,
        pastDecisions: Array.isArray(body.pastDecisions) ? body.pastDecisions : [],
        updatedAt: new Date().toISOString(),
      });
    return NextResponse.json({ knowledge });
  } catch (error: any) {
    console.error("Failed to save team knowledge:", error);
    return NextResponse.json({ error: "Failed to save team knowledge." }, { status: 500 });
  }
}
