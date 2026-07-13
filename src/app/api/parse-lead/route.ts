export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { validateParseLeadRequest, isInvalidParseLeadRequest } from "@/features/leads/server/validateParseLeadRequest";
import { parseLead } from "@/features/leads/server/parseLead";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const validation = validateParseLeadRequest(body);

  if (isInvalidParseLeadRequest(validation)) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  try {
    const result = await parseLead(validation.data);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Critical fallback failure:", error);
    return NextResponse.json({ error: "Heuristic fallback parsing failed." }, { status: 500 });
  }
}
