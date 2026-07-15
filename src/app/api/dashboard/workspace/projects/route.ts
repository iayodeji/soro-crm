import { NextResponse, type NextRequest } from "next/server";
import { getWorkspaceId } from "@/lib/workspace.server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const teamId = await getWorkspaceId(req);
  const body = await req.json().catch(() => null);
  const { name } = body ?? {};

  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Project name is required." }, { status: 400 });
  }

  try {
    const { data, error } = await getSupabaseAdmin()
      .from("projects")
      .insert({
        teamId,
        name: name.trim(),
        createdBy: teamId,
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ ok: true, project: data });
  } catch (err: any) {
    console.error("Failed to create project:", err);
    return NextResponse.json({ error: "Failed to create project." }, { status: 500 });
  }
}
