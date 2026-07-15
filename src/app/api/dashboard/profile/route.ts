import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const clerkUserId = req.nextUrl.searchParams.get("clerkUserId");
  if (!clerkUserId) {
    return NextResponse.json({ error: "clerkUserId is required." }, { status: 400 });
  }

  try {
    const { data, error } = await getSupabaseAdmin()
      .from("users")
      .select("*")
      .eq("clerkUserId", clerkUserId)
      .single();

    if (error || !data) {
      return NextResponse.json({ exists: false });
    }

    return NextResponse.json({ exists: true, profile: data });
  } catch (err) {
    return NextResponse.json({ exists: false });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clerkUserId, email, firstName, lastName, imageUrl } = body;

    if (!clerkUserId) {
      return NextResponse.json({ error: "clerkUserId is required." }, { status: 400 });
    }

    const { error } = await getSupabaseAdmin()
      .from("users")
      .upsert({
        clerkUserId,
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
  } catch (err: any) {
    console.error("Failed to save profile:", err);
    return NextResponse.json({ error: "Failed to save profile." }, { status: 500 });
  }
}
