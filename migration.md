# App.tsx → Feature-Based Next.js Structure — Migration Guide

This documents the decomposition of the monolithic `App.tsx` (Soro CRM dashboard) into a
modular, feature-based structure under the Next.js App Router. It covers what moved,
what's genuinely new, what changed behaviorally, and what still needs your input.

---

## 1. Final file tree

```
app/
  (dashboard)/
    layout.tsx                      NEW — wraps children in WorkspaceProvider + DashboardShell
    page.tsx                        NEW — the kanban list view (was the default App.tsx render)
    leads/[id]/page.tsx             NEW — lead detail as a real route (was conditional render)
  api/parse-lead/route.ts           UNCHANGED (part of the server.ts rewrite, still pending)

components/
  layout/
    TopBar.tsx                      MOVED as-is (no code changes)
    DashboardShell.tsx              NEW — app shell chrome: TopBar, toasts, modals, {children}

providers/
  WorkspaceProvider.tsx             NEW — single context feeding both dashboard routes

features/
  auth/
    hooks/useAuth.ts                NEW — wraps initAuth/googleSignIn/logout
  activity-feed/
    hooks/useActivityLog.ts         NEW — activityLogs + toasts + logActivity + sound
    hooks/useFcmPush.ts             NEW — fcmEnabled, simulated push notifications
    hooks/useActivityFeed.ts        NEW — composes the two above + toggleFcm/toggleSound/dispatchTestPush
    components/ToastStack.tsx       NEW (extracted JSX)
    components/FcmPushStack.tsx     NEW (extracted JSX)
    components/ActivityLedger.tsx   NEW (extracted JSX)
  teams/
    hooks/useTeamWorkspace.ts       NEW — myTeams, currentTeam, invite-token handling, switching
    hooks/useTeamPresence.ts        NEW — teamMembers subscription + presence/idle heartbeat
    components/TeamManagementModal.tsx   MOVED as-is
  leads/
    hooks/useLeads.ts               NEW — leads, CRUD, AI parse, CSV export
    utils/leadStats.ts              NEW — pure stat computation, shared by header + stat cards
    components/KanbanBoard.tsx      MOVED as-is (prop changes — see §4)
    components/OmniInput.tsx        MOVED as-is
    components/LeadDetailView.tsx   MOVED as-is (still uses legacy log signature — see §4)
    components/DeleteLeadModal.tsx  NEW (extracted JSX)
  dashboard/
    components/DashboardHeader.tsx            NEW (extracted JSX)
    components/NotificationEngineControls.tsx NEW (extracted JSX)
    components/StatsCards.tsx                 NEW (extracted JSX)

hooks/
  useNetworkStatus.ts               NEW — generic, not owned by any one feature

lib/
  getUserId.ts                      NEW — centralizes the "demo-founder-123" fallback
  firebase.ts, teamService.ts       UNCHANGED

utils/
  csvExport.ts                      NEW — pure CSV builder + download trigger, extracted from App.tsx
  audio.ts                          UNCHANGED

types/
  activity.ts                       NEW — ActivityEventType, ToastMessage, FcmNotification, LogActivityInput
  (existing types.ts)                UNCHANGED
```

**Rule of thumb used throughout:** `components/` only holds things genuinely shared across
every route (app shell chrome). Everything else lives inside the `features/` folder it
belongs to — hooks and components for one concern sit next to each other.

---

## 2. Manual steps to actually do the migration

1. Create the folders above.
2. Move `TopBar.tsx` → `components/layout/TopBar.tsx` (no code changes needed).
3. Move `KanbanBoard.tsx`, `OmniInput.tsx`, `LeadDetailView.tsx` → `features/leads/components/`.
4. Move `TeamManagementModal.tsx` → `features/teams/components/`.
5. Update every import path across the codebase that referenced the old `@/components/X`
   locations for the four files above (find/replace by import path is fastest).
6. Create all the new files listed as **NEW** above using the code provided in this
   conversation.
7. Delete the old `App.tsx` once `app/(dashboard)/page.tsx` and
   `app/(dashboard)/leads/[id]/page.tsx` are wired up and tested.
8. Update `types/types.ts` (or wherever `ActivityLog`, `Lead`, `Team`, `TeamMember` live) —
   no changes required, just confirm `types/activity.ts` doesn't collide with anything
   already exported from there.

---

## 3. Behavior changes (intentional, requested by you)

| Area | Before | After |
|---|---|---|
| Lead detail view | Conditional render inside `App.tsx` (`if (selectedLead) return <LeadDetailView />`) | Real route: `/leads/[id]`. Browser back/forward and refresh now work correctly on a lead's page. |
| FCM push triggers | Fired by string-matching on `action` text inside `logActivity` (e.g. `action.includes("Google Tasks")`) — fragile, breaks silently if wording changes | Fired by an explicit `ActivityEventType` passed alongside the log entry. Copy for each push type lives in one lookup table (`PUSH_COPY` in `useActivityFeed.ts`). |

## 4. Things NOT changed but worth knowing

- **`onLogActivity` legacy signature**: `LeadDetailView` and `TeamManagementModal` weren't
  pasted into this conversation, so I don't know their exact `onLogActivity` call sites.
  `useActivityFeed` exposes `legacyLogActivity(action, details, type)` — a bridge that
  re-derives the explicit event type from the same string-matching the original code used,
  so those two components keep working **unmigrated**. Once you paste them, their call
  sites should move to the structured `logActivity({ eventType, action, details, level })`
  form and the bridge can be deleted.
- **`KanbanBoard` prop assumptions**: `onSelectLead` is now assumed to call
  `router.push(\`/leads/${lead.id}\`)` instead of `setSelectedLead(lead)`, and the
  `selectedLeadId` prop (used for highlighting the open card) was dropped since there's no
  concept of "currently selected" once detail view is its own route. If `KanbanBoard`'s
  actual prop signature differs, this needs a follow-up pass — paste that file to confirm.
- **`"demo-founder-123"` fallback user ID**: previously duplicated in three places inside
  `App.tsx`. Centralized into `lib/getUserId.ts`. No behavior change, just one source of
  truth.

## 5. Race condition fixed during the split

The original code had no guard against navigating to a lead that hadn't loaded yet — not
an issue when it was a same-page conditional render (state was already in memory), but
would be a real bug once `/leads/[id]` is a route someone can hard-refresh or deep-link
into. `useLeads` now exposes `leadsLoaded`, and `leads/[id]/page.tsx` only redirects back
to `/` once `leadsLoaded && !lead` — i.e. once we're sure the team's leads have finished
loading and the id genuinely doesn't exist, not just "hasn't arrived yet."

## 6. Still pending

- **Verify `KanbanBoard`, `OmniInput`, `LeadDetailView`, `TeamManagementModal` prop
  signatures** against the assumptions in §4 once those files are available.
- **Decide** whether you want the old card-highlight behavior (`selectedLeadId`) restored
  via `usePathname()` matching on the leads list page.

---

## 7. `server.ts` → App Router API decomposition

`server.ts` (Express + Vite dev server) was split into thin route handlers plus a
`features/leads/server/` module — same behavior, no Vite/Express/dotenv needed.

```
app/
  api/
    parse-lead/route.ts        thin POST handler
    health/route.ts            thin GET handler

features/leads/server/
  types.ts                       ParseLeadRequestBody, ParsedLead, ParseLeadResult
  validateParseLeadRequest.ts    request validation (returns discriminated union)
  modelSelection.ts              modelPreset → Gemini model string
  geminiClient.ts                lazy singleton GoogleGenAI client
  parseLeadSchema.ts             system instruction + response schema
  parseLeadWithAI.ts             Gemini call + JSON extraction
  heuristicParser.ts             regex/keyword fallback, split into named functions
  parseLead.ts                   orchestrator: try AI, catch → fallback
```

**Dropped (no Next.js equivalent):** `express`, `app.listen`, `PORT`, the Vite
dev-middleware setup, and the `dist/` static-file serving branch. `dotenv.config()`
was removed — Next.js loads `.env.local` automatically (already present). `dotenv`
was dropped from `dependencies` since nothing else used it.

**Behavior changes:**
- Gemini client is now a lazy singleton (`getGeminiClient()`). A missing
  `GEMINI_API_KEY` surfaces as a caught error inside `parseLead()` and triggers the
  same heuristic fallback path — it no longer crashes at import time. Response shape
  is unchanged.
- `validateParseLeadRequest` returns a discriminated union; the route uses the
  `isInvalidParseLeadRequest` type-guard predicate to narrow reliably.

**Result:** both routes are thin dispatchers. The frontend `fetch("/api/parse-lead")`
call keeps working unchanged — same request shape, same response shape, same
fallback behavior. `server.ts` was deleted.

Remaining open items are all in your court: confirming `KanbanBoard`/`LeadDetailView`/
`TeamManagementModal` real prop shapes, and deciding on the card-highlight behavior.