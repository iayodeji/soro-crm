"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Header } from "@/components/layout/Header";
import { Profile } from "@/app/dashboard/profile";
import { useClerkSync } from "@/hooks/useClerkSync";

export default function DashboardSetupPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn, user } = useUser();
  const { isReady, hasProfile } = useClerkSync();

  useEffect(() => {
    if (isLoaded && isSignedIn && hasProfile) {
      router.replace("/crm");
    }
  }, [isLoaded, isSignedIn, hasProfile, router]);

  const goToCrm = () => router.replace("/crm");

  return (
    <div className="min-h-screen bg-[#FDFBF2] text-[#1F1612] font-sans antialiased flex flex-col">
      <Header />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
        <section className="space-y-2">
          <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#1F1612]/50">
            Setup
          </p>
          <h1 className="font-serif font-bold italic text-3xl sm:text-4xl tracking-tight">
            Welcome{user?.firstName ? `, ${user.firstName}` : ""}.
          </h1>
          <p className="text-sm text-[#1F1612]/60">
            {hasProfile
              ? "Your profile is already synced. Taking you to your workspace..."
              : "Sync your profile to unlock your CRM workspace."}
          </p>
        </section>

        {!hasProfile && isLoaded && isSignedIn && (
          <div className="mt-8">
            <Profile onSaved={goToCrm} />
          </div>
        )}
      </main>
    </div>
  );
}
