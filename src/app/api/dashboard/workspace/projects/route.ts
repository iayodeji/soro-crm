import { getAuth } from "@clerk/nextjs/server";
import { randomUUID } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { getWorkspaceId } from "@/lib/workspace.server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const teamId = getWorkspaceId(req);
  const { userId } = getAuth(req);
  if (!teamId || !userId) {
    return NextResponse.json({ error: "An active organization is required." }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const { name } = body ?? {};
  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Project name is required." }, { status: 400 });
  }

  try {
    const { data, error } = await getSupabaseAdmin()
      .from("projects")
      .insert({
        id: randomUUID(),
        teamId,
        name: name.trim(),
        createdBy: userId,
        createdAt: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true, project: data });
  } catch (err: unknown) {
    console.error("Failed to create project:", err);
    return NextResponse.json({ error: "Failed to create project." }, { status: 500 });
  }
}
