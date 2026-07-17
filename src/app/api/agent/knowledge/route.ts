export const dynamic = "force-dynamic";
import { NextResponse, type NextRequest } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { getTeamKnowledge, saveTeamKnowledge } from "@/features/agent/server/sessionService";
import { getWorkspaceId } from "@/lib/workspace.server";

export async function GET(req: NextRequest) {
  try {
    const teamId = getWorkspaceId(req);
    if (!teamId) {
      return NextResponse.json({ error: "An active organization is required." }, { status: 400 });
    }
    const knowledge = await getTeamKnowledge(teamId);
    return NextResponse.json({ knowledge });
  } catch (error: any) {
    console.error("Failed to fetch team knowledge:", error);
    return NextResponse.json({ error: "Failed to fetch team knowledge." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const teamId = getWorkspaceId(request);
  const { userId } = getAuth(request);
  if (!teamId || !userId) {
    return NextResponse.json({ error: "An active organization is required." }, { status: 400 });
  }
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "A request body is required." }, { status: 400 });
  }

  try {
    const knowledge = await saveTeamKnowledge({
      teamId,
      salesProcess: body.salesProcess,
      leadScoringCriteria: body.leadScoringCriteria,
      commonObjections: body.commonObjections,
      customInstructions: body.customInstructions,
      pastDecisions: Array.isArray(body.pastDecisions)
        ? body.pastDecisions
            .filter((decision): decision is { topic: string; decision: string } =>
              typeof decision?.topic === "string" && typeof decision?.decision === "string",
            )
            .map((decision) => ({
              topic: decision.topic.trim(),
              decision: decision.decision.trim(),
              decidedAt: new Date().toISOString(),
              decidedBy: userId,
            }))
        : [],
      updatedAt: new Date().toISOString(),
    });
    return NextResponse.json({ knowledge });
  } catch (error: any) {
    console.error("Failed to save team knowledge:", error);
    return NextResponse.json({ error: "Failed to save team knowledge." }, { status: 500 });
  }
}
