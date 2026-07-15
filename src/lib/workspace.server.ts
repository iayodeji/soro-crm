import { getAuth } from "@clerk/nextjs/server";
import type { NextRequest } from "next/server";
import { WORKSPACE_ID } from "./workspace";

export async function getWorkspaceId(req: NextRequest): Promise<string> {
  try {
    const { orgId } = getAuth(req);
    if (orgId) return orgId;
  } catch {
    // Session missing or invalid — fall through to fallback.
  }
  return WORKSPACE_ID;
}
