import { NextResponse, type NextRequest } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { createClerkClient } from "@clerk/backend";

export const dynamic = "force-dynamic";

interface MemberResponse {
  id: string;
  userId: string;
  email: string;
  name: string;
  imageUrl?: string;
  role: string;
}

function mapMembership(membership: any): MemberResponse {
  const publicUserData = membership.publicUserData;
  const firstName = publicUserData?.firstName ?? "";
  const lastName = publicUserData?.lastName ?? "";
  const identifier = publicUserData?.identifier ?? "";
  const imageUrl = publicUserData?.imageUrl;

  const name = [firstName, lastName].filter(Boolean).join(" ").trim() || identifier || "Unnamed User";

  return {
    id: membership.id,
    userId: membership.publicUserData?.userId ?? membership.userId ?? "",
    email: identifier,
    name,
    imageUrl,
    role: membership.role,
  };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const { userId, orgId: activeOrgId } = getAuth(req);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orgId } = await params;

  if (activeOrgId !== orgId) {
    return NextResponse.json(
      { error: "Forbidden - not a member of this organization" },
      { status: 403 }
    );
  }

  try {
    const secretKey = process.env.CLERK_SECRET_KEY;
    if (!secretKey) {
      return NextResponse.json({ error: "Server misconfigured: CLERK_SECRET_KEY is missing." }, { status: 500 });
    }

    const client = createClerkClient({ secretKey });
    const result = await client.organizations.getOrganizationMembershipList({ organizationId: orgId });
    const members: MemberResponse[] = result.data.map(mapMembership);
    return NextResponse.json(members);
  } catch (err) {
    console.error("Failed to fetch organization members:", err);
    return NextResponse.json(
      { error: "Failed to fetch organization members" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const { userId, orgId: activeOrgId } = getAuth(req);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orgId } = await params;

  if (activeOrgId !== orgId) {
    return NextResponse.json(
      { error: "Forbidden - not a member of this organization" },
      { status: 403 }
    );
  }

  try {
    const secretKey = process.env.CLERK_SECRET_KEY;
    if (!secretKey) {
      return NextResponse.json({ error: "Server misconfigured: CLERK_SECRET_KEY is missing." }, { status: 500 });
    }

    const { email, role } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const client = createClerkClient({ secretKey });
    const invitation = await client.organizations.createOrganizationInvitation({
      organizationId: orgId,
      emailAddress: email.trim(),
      role: role || "basic_member",
    });

    return NextResponse.json(invitation);
  } catch (err) {
    console.error("Failed to invite member:", err);
    return NextResponse.json(
      { error: "Failed to invite member" },
      { status: 500 }
    );
  }
}
