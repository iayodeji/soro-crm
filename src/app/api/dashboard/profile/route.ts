import { getAuth } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { userId } = getAuth(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { data, error } = await getSupabaseAdmin()
      .from("users")
      .select("*")
      .eq("clerkUserId", userId)
      .single();

    if (error || !data) {
      return NextResponse.json({ exists: false });
    }

    return NextResponse.json({ exists: true, profile: data });
  } catch {
    return NextResponse.json({ exists: false });
  }
}

export async function POST(request: NextRequest) {
  const { userId } = getAuth(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { email, firstName, lastName, imageUrl } = body;

    const { error } = await getSupabaseAdmin()
      .from("users")
      .upsert({
        clerkUserId: userId,
        email,
        firstName,
        lastName,
        imageUrl,
        updatedAt: new Date().toISOString(),
      });

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    console.error("Failed to save profile:", err);
    return NextResponse.json({ error: "Failed to save profile." }, { status: 500 });
  }
}
