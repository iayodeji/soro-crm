"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser, SignInButton } from "@clerk/nextjs";

export default function LandingPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();

  // Signed-in users skip the marketing landing and go to setup/workspace.
  useEffect(() => {
    if (isLoaded && isSignedIn) router.replace("/dashboard");
  }, [isLoaded, isSignedIn, router]);

  return (
    <div className="min-h-screen bg-[#FDFBF2] text-[#1F1612] font-sans antialiased flex flex-col items-center justify-center px-4">
      <div className="text-center space-y-6">
        <h1 className="text-5xl sm:text-6xl font-serif font-bold italic tracking-tight flex items-center justify-center gap-2">
          Soro
          <span className="text-[#B74A26] font-sans text-xs sm:text-sm font-bold tracking-widest px-2.5 py-1 rounded-full bg-[#B74A26]/10 uppercase">
            CRM
          </span>
        </h1>
        <p className="text-sm sm:text-base text-[#1F1612]/60 max-w-md mx-auto">
          Customer discovery and lead intelligence for modern teams. Sign in to
          sync your profile and open your workspace.
        </p>

        {isLoaded && !isSignedIn && (
          <SignInButton mode="modal">
            <button className="text-xs font-mono font-semibold tracking-wider text-white uppercase px-6 py-3 rounded-full bg-[#B74A26] hover:bg-[#a03f20] transition-colors">
              Sign in
            </button>
          </SignInButton>
        )}
      </div>
    </div>
  );
}
