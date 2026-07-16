import { NextResponse, type NextRequest } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { createClerkClient } from "@clerk/backend";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { userId, orgId, orgRole } = getAuth(req);

  if (!userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const secretKey = process.env.CLERK_SECRET_KEY;
    if (!secretKey) {
      return NextResponse.json(
        { error: "Server misconfigured: CLERK_SECRET_KEY is missing." },
        { status: 500 },
      );
    }

    const clerk = createClerkClient({ secretKey });
    const clerkUser = await clerk.users.getUser(userId);
    const email =
      clerkUser.primaryEmailAddress?.emailAddress ??
      `${userId}@clerk.local`;

    const supabase = getSupabaseAdmin();

    const { data: existing } = await supabase.auth.admin.getUserById(userId);

    let dbUser = existing?.user;
    if (!dbUser) {
      const { data: created, error } = await supabase.auth.admin.createUser({
        id: userId,
        email,
        email_confirm: true,
        user_metadata: { clerkUserId: userId, orgId, orgRole },
      });
      if (error) throw error;
      dbUser = created.user;
    }

    const { data: linkData, error: linkError } =
      await supabase.auth.admin.generateLink({
        type: "magiclink",
        email: dbUser.email ?? email,
      });
    if (linkError) throw linkError;

    const { data: sessionData, error: sessionError } =
      await supabase.auth.verifyOtp({
        email: dbUser.email ?? email,
        token: linkData.properties.hashed_token,
        type: "magiclink",
      });
    if (sessionError) throw sessionError;

    return NextResponse.json({ session: sessionData.session });
  } catch (err) {
    console.error("Supabase token exchange failed:", err);
    return NextResponse.json(
      { error: "Failed to exchange Supabase session." },
      { status: 500 },
    );
  }
}
