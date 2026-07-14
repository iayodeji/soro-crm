// Single default workspace identifier.
//
// This replaces the auth-derived Clerk org id / Firebase teamId that previously
// scoped every lead, session, and knowledge doc. With authentication removed,
// the app is single-tenant and reads/writes Firestore under this one id.
//
// To point the app at your existing Firestore data, either:
//   - set NEXT_PUBLIC_WORKSPACE_ID to the teamId your leads/sessions use, or
//   - change the fallback below.
// When you add your own auth later, swap this constant for an auth-derived id.
export const WORKSPACE_ID = process.env.NEXT_PUBLIC_WORKSPACE_ID ?? "default-workspace";
