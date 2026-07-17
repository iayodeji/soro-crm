export const dynamic = "force-dynamic";
import { NextResponse, type NextRequest } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { validateParseLeadRequest, isInvalidParseLeadRequest } from "@/features/leads/server/validateParseLeadRequest";
import { parseLead } from "@/features/leads/server/parseLead";

export async function POST(request: NextRequest) {
  const { userId } = getAuth(request);
  if (!userId) return NextResponse.json({ error: "Sign in to use AI lead capture." }, { status: 401 });
  const body = await request.json().catch(() => null);
  const validation = validateParseLeadRequest(body);

  if (isInvalidParseLeadRequest(validation)) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  if (validation.data.rawText.length > 12_000) {
    return NextResponse.json({ error: "Please keep the text under 12,000 characters." }, { status: 400 });
  }

  try {
    const result = await parseLead(validation.data);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Critical fallback failure:", error);
    return NextResponse.json({ error: "Heuristic fallback parsing failed." }, { status: 500 });
  }
}
