import { NextResponse } from "next/server";

// Lightweight endpoint used by useNetworkStatus to verify *real* reachability
// of the backend (not just the browser's local link state). Never cache it.
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ ok: true, timestamp: Date.now() });
}
