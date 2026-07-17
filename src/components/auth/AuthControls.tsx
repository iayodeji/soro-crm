"use client";

import Link from "next/link";
import { LayoutDashboard } from "lucide-react";
import { SignInButton, SignUpButton, Show, UserButton } from "@clerk/nextjs";

/**
 * Single source of truth for auth-aware header controls.
 *
 * - Signed out: Sign in + Sign up.
 * - Signed in:  Dashboard link + Clerk UserButton.
 *
 * Shared by every header/nav so the auth affordances never drift.
 */
export function AuthControls() {
  return (
    <div className="flex items-center gap-2">
      <Show when="signed-out">
        <SignInButton mode="modal">
          <button className="text-[11px] sm:text-xs font-mono font-semibold tracking-wider text-[#1F1612]/70 uppercase px-2.5 py-1.5 rounded-full hover:bg-[#1F1612]/5 transition-colors">
            Sign in
          </button>
        </SignInButton>
        <SignUpButton mode="modal">
          <button className="text-[11px] sm:text-xs font-mono font-semibold tracking-wider text-white uppercase px-3 py-1.5 rounded-full bg-[#B74A26] hover:bg-[#a03f20] transition-colors">
            Sign up
          </button>
        </SignUpButton>
      </Show>

      <Show when="signed-in">
        <Link
          href="/dashboard"
          className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono font-semibold tracking-wider text-[#1F1612]/70 hover:text-[#1F1612] uppercase px-2.5 py-1.5 rounded-full hover:bg-[#1F1612]/5 transition-colors"
        >
          <LayoutDashboard className="w-3.5 h-3.5" />
          Dashboard
        </Link>
        <UserButton
          userProfileProps={{
            additionalOAuthScopes: {
              google: [
                "https://www.googleapis.com/auth/gmail.send",
                "https://www.googleapis.com/auth/gmail.settings.basic",
                "https://www.googleapis.com/auth/calendar.events",
              ],
            },
          }}
        />
      </Show>
    </div>
  );
}
