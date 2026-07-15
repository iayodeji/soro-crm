import { NextResponse, type NextRequest } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { createClerkClient } from "@clerk/backend";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface TeamMembership {
  id: string;
  userId: string;
  teamId: string;
  name: string;
  email: string;
  avatarUrl?: string;
  status: "active" | "away" | "offline";
  activity: "viewing" | "editing" | "idle";
  role: string;
  lastActiveAt: string;
}

function mapClerkMembershipToBlueprint(membership: any, teamId: string): TeamMembership {
  const publicUserData = membership.publicUserData;
  const firstName = publicUserData?.firstName ?? "";
  const lastName = publicUserData?.lastName ?? "";
  const identifier = publicUserData?.identifier ?? "";
  const imageUrl = publicUserData?.imageUrl;

  const name = [firstName, lastName].filter(Boolean).join(" ").trim() || identifier || "Unnamed User";

  return {
    id: membership.id,
    userId: publicUserData?.userId ?? membership.userId ?? "",
    teamId,
    name,
    email: identifier,
    avatarUrl: imageUrl,
    status: "active",
    activity: "idle",
    role: membership.role,
    lastActiveAt: new Date().toISOString(),
  };
}

export async function POST(req: NextRequest) {
  const { userId, orgId } = getAuth(req);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!orgId) {
    return NextResponse.json({ error: "No active organization" }, { status: 400 });
  }

  try {
    const secretKey = process.env.CLERK_SECRET_KEY;
    if (!secretKey) {
      return NextResponse.json({ error: "Server misconfigured: CLERK_SECRET_KEY is missing." }, { status: 500 });
    }

    const client = createClerkClient({ secretKey });
    const result = await client.organizations.getOrganizationMembershipList({ organizationId: orgId });

    const memberships: TeamMembership[] = [];
    for (const membership of result.data ?? []) {
      const mapped = mapClerkMembershipToBlueprint(membership, orgId);
      memberships.push(mapped);
    }

    const { error } = await getSupabaseAdmin()
      .from("team_memberships")
      .upsert(memberships);

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ success: true, memberships, count: memberships.length });
  } catch (err) {
    console.error("Failed to sync members:", err);
    return NextResponse.json(
      { error: "Failed to sync members" },
      { status: 500 }
    );
  }
}
