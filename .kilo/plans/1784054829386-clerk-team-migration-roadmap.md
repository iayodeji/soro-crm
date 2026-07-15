# Migrate Team Management & Auth from Firebase to Clerk

## Context (verified against the codebase)

Soro-CRM is a Next.js 15 / React 19 app. Today:
- **Auth** = Firebase Auth (Google popup, client SDK in `src/lib/firebase.ts`).
- **Team management** = hand-rolled Firestore collections (`teams`, `team_memberships`, `invitations`) with bespoke security rules in `firestore.rules`.
- **Leads / sessions / team_knowledge** = Firestore, team-scoped, with isolation enforced *client-side* by Firestore rules via `isTeamMember(teamId)` which reads `team_memberships/{uid}_{teamId}`.

### Root-cause of the "invitation failures"
The claimed "invitation email workflow" is actually **link-based, not email-based**. `createInvitation` (`src/lib/teamService.ts:136`) writes a token doc; `TeamManagementModal.handleGenerateInvite` (`TeamManagementModal.tsx:75`) only builds a `/?inviteToken=` URL and copies it to the clipboard — **no email provider exists**. The real fragility is in `firestore.rules`: the invite `create` rule requires `isTeamAdminOrOwner` and the join transaction's `create` rule requires `hasPendingInvitation(...)`, which matches `request.auth.token.email` to the invite email (`firestore.rules:27-47, 81-88`). Any mismatch (recipient signed in with a different Google account, case differences, open vs targeted invite) surfaces as an opaque `permission-denied`. This entire rule class is eliminated by moving teams to Clerk Organizations.

### Decisions locked with the user
1. **Scope:** Move **auth + team management entirely to Clerk**. Leads/sessions/knowledge stay in Firestore but are accessed **server-side only** (Admin SDK); client-direct Firestore access is removed and rule-based isolation is replaced by server-side org-membership checks.
2. **User transition:** **Hard cutover** — existing Firebase users re-authenticate in Clerk. Teams are re-attached automatically via a migration map + webhook (not "seamless", but smooth).
3. **Invites:** **Clerk-hosted email invitations** (Clerk sends the email; first real email delivery for this product).
4. **Google Workspace:** Clerk **must** return Google OAuth access tokens (Sheets/Gmail/Calendar scopes) to keep the existing sync features working.

---

## Target Architecture

```
Browser (Clerk <SignIn/>, useUser/useOrganization)
   │
   ├─ Auth/session ──────────────► Clerk (hosted UI, JWT, Google connection)
   │
   ├─ Team ops (list/create/switch/invite/role/remove/delete)
   │       ── Clerk React hooks + Clerk Backend SDK (org invitations send email)
   │
   ├─ Leads / sessions / knowledge / presence
   │       ── Next.js API routes (/api/teams/*, /api/leads/*, /api/presence/*, /api/agent/*)
   │              ├─ auth(): verify Clerk session (NOT Identity Toolkit)
   │              ├─ clerkClient.organizations: confirm caller is member of org == lead.teamId
   │              └─ adminDb (Firebase Admin SDK): read/write Firestore
   │
   └─ Presence (active/away/offline, editing/viewing/idle)
           ── POST /api/presence  +  SSE /api/presence/stream?orgId  (server-owned Firestore `presence` coll)
```

### What is removed vs kept
- **Removed:** client `firebase` SDK auth + client `db`; `firestore.rules` team-gated logic; `teams`/`team_memberships`/`invitations` collections (archive to backup first); `src/lib/teamService.ts` team functions; `src/lib/serverAuth.ts` (Identity Toolkit); `src/lib/teamAccess.ts`; `src/lib/getUserId.ts` (`.uid`).
- **Kept:** `src/lib/firebaseAdmin.ts` (Admin SDK for Firestore server access); leads/sessions/knowledge data; agent routes (re-auth only).
- **`firestore.rules`:** rewrite to `allow read, write: if false;` for all client-readable collections (only the server/Admin SDK touches Firestore now). This is a net security improvement.

---

## Role Mapping (Clerk custom roles)

Clerk orgs ship `org:admin`/`org:member` only; define **custom roles** to preserve the app's 5-level model and owner-only delete:

| App role | Clerk role | Notes |
|---|---|---|
| `owner` | `org:owner` (custom) | Only role allowed to delete the org; stored on the creator's membership |
| `admin` | `org:admin` (custom) | Can manage members + send invites |
| `editor` | `org:editor` (custom) | Read/write leads |
| `viewer` | `org:viewer` (custom) | Read-only (drives `isViewer` in `WorkspaceProvider`) |
| `member` | `org:member` (custom) | Standard contributor |

Define these in the Clerk Dashboard (or via `clerkClient` at provisioning). Map old `ownerId` → `org:owner`; old `role` → matching custom role.

---

## Implementation Steps (ordered)

### Phase 0 — Prep & parity
1. Add `@clerk/nextjs` + `@clerk/backend`; configure `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, Clerk domain, Google connection **with** `https://www.googleapis.com/auth/spreadsheets`, `.../gmail.send`, `.../calendar.events`, `offline_access`.
2. Verify Clerk can return a Google access token for a signed-in user (research `session.getToken()` / `clerkClient.users.getUserOauthAccessToken(userId,'oauth_google')` + token template). This is a **blocker to confirm before build**.
3. Define the 5 custom org roles + permissions in Clerk.
4. Create `middleware.ts` wrapping `(dashboard)` routes with `clerkMiddleware()`.

### Phase 1 — Auth
5. Replace `src/features/auth/hooks/useAuth.ts` with Clerk `useUser` + `useClerk().signOut()` + a Google sign-in action; expose `user.id` and a lazy `googleAccessToken` (fetched on demand for Workspace sync).
6. Update `WorkspaceProvider.tsx`: drop `getUserId`/`isFirebaseConfigured`; use `userId` from Clerk; populate `accessToken` from Clerk's Google token; `isViewer` derived from the caller's org role (`org:viewer`).

### Phase 2 — Team management via Clerk
7. New `src/lib/clerkTeams.ts` (server) + `src/features/teams/hooks/useClerkTeams.ts` (client, using `useOrganization`/`useOrganizationList`/`useInvitation`):
   - `fetchUserTeams` → `useOrganizationList` / `clerkClient.users.getOrganizationMembershipList`.
   - `createTeam` → `clerkClient.organizations.createOrganization({ name, createdBy, publicMetadata: { firebaseTeamId } })`; set creator role `org:owner`.
   - `createInvitation` → `clerkClient.organizations.createOrganizationInvitation({ organizationId, emailAddress, role, redirectUrl })` — **Clerk sends the email** (replaces the copy-link flow).
   - `changeMemberRole` / `removeTeamMember` / `deleteTeamWorkspace` → corresponding `clerkClient.organizations.*` calls, gated by caller role (owner-only delete).
8. Rewrite `TeamManagementModal.tsx`: use Clerk org hooks; the invite tab now triggers a real email (no clipboard link); role dropdown uses Clerk roles; danger zone calls `deleteOrganization`.
9. Rewrite `useTeamWorkspace.ts`: load orgs from Clerk; auto-create a default org on first sign-in if none; consume invite via Clerk's `acceptOrganizationInvitation` (the email link lands on Clerk's accept URL, then redirects back).

### Phase 3 — Leads/sessions/knowledge server-side
10. New `src/app/api/leads/route.ts` (GET list by org, POST create, PATCH update, DELETE) and `/api/teams/members` (GET member directory + roles). Each handler: `auth()` → resolve active org id → confirm membership via `clerkClient` → `adminDb` read/write keyed by `firebaseTeamId` (stored in org `publicMetadata`).
11. Replace `useLeads.ts` Firestore calls with fetches to `/api/leads`. Keep optimistic UI + activity logging unchanged.
12. Update `src/lib/serverAuth.ts` → use Clerk (`auth().userId` / verify JWT). Update `src/lib/teamAccess.ts` → `clerkClient.organizations.getOrganizationMembershipList` / membership lookup. Update `/api/agent/*`, `/api/agent/knowledge/*`, `/api/agent/sessions/*`, `/api/parse-lead/*` to authenticate via Clerk and authorize by org membership.
13. `sessionService.ts`: keep Admin SDK access; add org-membership check before reading/writing `sessions`/`team_knowledge`.

### Phase 4 — Presence
14. New `POST /api/presence` (writes `presence/{orgId}` via Admin SDK) + `GET /api/presence/stream?orgId` (SSE pushing member list + statuses). Replace `useTeamPresence.ts` `onSnapshot`/`updatePresence` with `fetch` + `EventSource` subscription. Member directory comes from Clerk; presence overlay from the SSE stream.

### Phase 5 — Data migration (hard cutover)
15. **Export (script, Admin SDK):** read all `teams` + `team_memberships`; build `email → [{ firebaseTeamId, role }]` map. Persist the map in a **server-only** `migration_map` Firestore collection (or secure secret) — never client-exposed.
16. **Org provisioning:** create Clerk orgs lazily on first sign-in (webhook `user.created`): for the user's email, for each entry create/join the org (`publicMetadata.firebaseTeamId` set), assign the mapped role. Mark `publicMetadata.migrated=true`.
17. **Lead continuity:** leads keep their old `teamId`; the server resolves the active Clerk org's `firebaseTeamId` from `publicMetadata` and queries Firestore by it — **zero lead rewrites**.
18. **Cutover:** deploy Clerk middleware + sign-in; remove Firebase client SDK; flip `firestore.rules` to deny-all client. Keep a read-only Firebase project/snapshot for rollback.
19. **Cleanup:** archive & delete `teams`/`team_memberships`/`invitations`; delete `teamService.ts` team functions, `serverAuth.ts`, `teamAccess.ts`, `getUserId.ts`, client `firebase.ts` auth/`db`.

---

## Affected Files (summary)
- Add: `middleware.ts`, `src/lib/clerkTeams.ts`, `src/features/teams/hooks/useClerkTeams.ts`, `src/app/api/leads/route.ts`, `src/app/api/teams/members/route.ts`, `src/app/api/presence/route.ts` (+ `/stream`), `scripts/migrate-to-clerk.ts`.
- Rewrite: `src/features/auth/hooks/useAuth.ts`, `src/providers/WorkspaceProvider.tsx`, `src/features/teams/hooks/useTeamWorkspace.ts`, `src/features/teams/hooks/useTeamPresence.ts`, `src/features/teams/components/TeamManagementModal.tsx`, `src/features/leads/hooks/useLeads.ts`, `src/lib/serverAuth.ts`, `src/lib/teamAccess.ts`, `src/features/agent/server/sessionService.ts`, `/api/agent/*`.
- Delete after cutover: `src/lib/teamService.ts` (team fns), `src/lib/getUserId.ts`, client `firebase.ts` auth/`db` usage, `firestore.rules` logic.
- Config: `package.json` (add Clerk), `.env.local` (Clerk keys + Google scopes), `firestore.rules` (deny-all client).

---

## Risks & Failure Modes
- **Google token retrieval:** Clerk's method for returning Google access tokens differs from the old popup `credential.accessToken`. Must be proven in Phase 0 before any build — **blocker**.
- **Hard cutover is not truly seamless:** users must re-auth; anyone whose Clerk Google email ≠ their Firebase email will **not** auto-join orgs. Mitigation: a self-serve "claim my workspace" fallback (verify old email via Clerk magic link) — out of scope unless requested; note in comms.
- **Email mapping gaps:** invited (never-signed-in) users with no Firebase record: create their org memberships via Clerk invitations at cutover so the email still works.
- **Clerk plan limits:** org count, members/org, custom roles — confirm plan covers current team sizes.
- **Presence rewrite:** SSE vs polling vs third-party (Ably/Pusher). Recommended SSE (no new infra); validate behind proxy/SSR.
- **Rollback:** keep Firebase read-only snapshot; since leads are untouched server-side, reverting = redeploy old client + restore `firestore.rules`.

---

## Validation
- **Unit/integration:** org membership resolution; role-based guards (viewer can't delete, non-member can't read org leads via `/api/leads`); invite creation triggers a Clerk email (dev/test mode).
- **E2E:** existing user signs in via Clerk → auto-joined to correct orgs with correct role → leads load (resolved via `firebaseTeamId`) → invite email received → recipient accepts → appears in member directory → presence updates over SSE.
- **Security:** confirm `firestore.rules` deny-all blocks any direct client read/write; confirm `/api/*` rejects requests without a valid Clerk session or with mismatched org.
- **Rollback drill:** flip back to Firebase client build + restore rules; verify leads still present.

---

## Open Questions (resolve before Phase 0 build)
1. Is proving Clerk Google access-token retrieval acceptable as a spike first, or should we assume it works? (Recommend spike — it is the biggest unknown.)
2. For emails that don't match at cutover, do we invest in a "claim workspace" self-serve flow, or accept that those users start fresh?
3. Confirm the Clerk plan tier supports the needed custom roles + org/member counts for current data.
4. Presence: SSE (recommended, no infra) vs a managed realtime service — any preference?
