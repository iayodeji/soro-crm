import { getAuth } from "@clerk/nextjs/server";
import type { NextRequest } from "next/server";

/** Returns the active Clerk organization that owns this request's workspace. */
export function getWorkspaceId(req: NextRequest): string | null {
  const { userId, orgId } = getAuth(req);
  return userId && orgId ? orgId : null;
}
