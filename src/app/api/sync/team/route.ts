import { NextResponse, type NextRequest } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { createClerkClient } from "@clerk/backend";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

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

    const organization = await client.organizations.getOrganization({ organizationId: orgId });
    const membersResult = await client.organizations.getOrganizationMembershipList({ organizationId: orgId });
    const membersCount = membersResult.data?.length ?? 0;

    const teamData = {
      id: organization.id,
      name: organization.name,
      ownerId: organization.createdBy || userId,
      createdAt: organization.createdAt ? new Date(organization.createdAt).toISOString() : new Date().toISOString(),
      membersCount,
      slug: organization.slug || null,
      imageUrl: organization.imageUrl || null,
    };

    const { error } = await getSupabaseAdmin()
      .from("teams")
      .upsert(teamData);

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ success: true, team: teamData });
  } catch (err) {
    console.error("Failed to sync team:", err);
    return NextResponse.json(
      { error: "Failed to sync team" },
      { status: 500 }
    );
  }
}
