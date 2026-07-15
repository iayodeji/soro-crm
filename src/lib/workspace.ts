// Client-side fallback workspace identifier.
//
// In multi-tenant mode, the active workspace is derived from Clerk's active
// organization (`orgId`) on the client via `useAuth()`. When no org is active,
// fall back to the env-configured id or "default-workspace".
export const WORKSPACE_ID = process.env.NEXT_PUBLIC_WORKSPACE_ID ?? "default-workspace";
