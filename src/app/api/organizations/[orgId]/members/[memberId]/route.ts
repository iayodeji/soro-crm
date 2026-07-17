import { NextResponse, type NextRequest } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { createClerkClient } from "@clerk/backend";

export const dynamic = "force-dynamic";

function canManageMembers(orgRole: string | null | undefined): boolean {
  return orgRole === "org:admin" || orgRole === "admin";
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string; memberId: string }> }
) {
  const { userId, orgId: activeOrgId, orgRole } = getAuth(req);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orgId, memberId } = await params;

  if (activeOrgId !== orgId) {
    return NextResponse.json(
      { error: "Forbidden - not a member of this organization" },
      { status: 403 }
    );
  }
  if (!canManageMembers(orgRole)) {
    return NextResponse.json({ error: "Only organization administrators can remove members." }, { status: 403 });
  }

  try {
    const secretKey = process.env.CLERK_SECRET_KEY;
    if (!secretKey) {
      return NextResponse.json({ error: "Server misconfigured: CLERK_SECRET_KEY is missing." }, { status: 500 });
    }

    const client = createClerkClient({ secretKey });
    await client.organizations.deleteOrganizationMembership({
      organizationId: orgId,
      userId: memberId,
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Failed to remove member:", err);
    return NextResponse.json(
      { error: "Failed to remove member" },
      { status: 500 }
    );
  }
}
