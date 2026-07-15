import { NextResponse, type NextRequest } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { adminAuth } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { userId, orgId, orgRole } = getAuth(req);

  if (!userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const additionalClaims = {
    orgId: orgId || null,
    orgRole: orgRole || null,
  };

  const token = await adminAuth.createCustomToken(userId, additionalClaims);

  return NextResponse.json({ token });
}
