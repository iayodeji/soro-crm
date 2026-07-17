import { getAuth } from "@clerk/nextjs/server";
import { createClerkClient } from "@clerk/backend";
import type { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

/** Returns the active Clerk organization that owns this request's workspace. */
export function getWorkspaceId(req: NextRequest): string | null {
  const { userId, orgId } = getAuth(req);
  return userId && orgId ? orgId : null;
}

/** Ensures the active Clerk organization exists before a dependent record is created. */
export async function ensureWorkspaceTeam(req: NextRequest): Promise<string> {
  const { userId, orgId } = getAuth(req);
  if (!userId || !orgId) throw new Error("An active organization is required.");

  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) throw new Error("CLERK_SECRET_KEY is missing.");

  const client = createClerkClient({ secretKey });
  const [organization, membersResult] = await Promise.all([
    client.organizations.getOrganization({ organizationId: orgId }),
    client.organizations.getOrganizationMembershipList({ organizationId: orgId }),
  ]);

  const { error } = await getSupabaseAdmin().from("teams").upsert({
    id: organization.id,
    name: organization.name,
    ownerId: organization.createdBy || userId,
    createdAt: organization.createdAt ? new Date(organization.createdAt).toISOString() : new Date().toISOString(),
    membersCount: membersResult.data?.length ?? 0,
    slug: organization.slug || null,
    imageUrl: organization.imageUrl || null,
  });
  if (error) throw new Error(`Failed to sync workspace: ${error.message}`);

  return orgId;
}
