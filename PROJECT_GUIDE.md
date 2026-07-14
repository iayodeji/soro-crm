# Soro-CRM — Project Documentation

## What Is This?

Soro-CRM is a multi-tenant customer discovery CRM built on Next.js 15 + React 19 + Firebase. Its purpose is to help early-stage founders manage a pipeline of discovery leads through three stages (Lead Found → Prospect Engaged → Client Closed), with AI-assisted lead parsing, Mom Test–style discovery questions, and Google Workspace integration (Sheets, Gmail, Calendar, Tasks).

---

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **UI:** React 19, Tailwind CSS v4, Lucide icons, Motion (Framer Motion)
- **Backend:** Firebase (Auth + Firestore), Firebase Admin SDK (server-side)
- **AI:** Google Gemini (primary) + Groq (fallback)
- **Notifications:** Browser Notification API + simulated FCM push stack

---

## Data Model (The Core)

### `Lead` — A discovery target / prospect
- **Location:** `src/types.ts:3`
- Fields: `id`, `name`, `company_name`, `email`, `phone`, `notes`, `phase`, `createdAt`, `updatedAt`, `marketFitThesis`, `momTestQuestions`, `gmailSent`, `calendarScheduled`, `sheetsSynced`, `tasksCreated`
- **Phase:** `"lead_found" | "prospect_engaged" | "client_closed"` (type `Phase`)

### `Team` — A multi-tenant workspace
- **Location:** `src/types.ts:42`
- Fields: `id`, `name`, `ownerId`, `createdAt`
- Each team has isolated leads, members, and agent sessions.

### `TeamMember` — A user inside a team
- **Location:** `src/types.ts:31`
- Roles: `"owner" | "admin" | "editor" | "viewer" | "member"`
- Presence: `"active" | "away" | "offline"`, activity: `"viewing" | "editing" | "idle"`

### `Session` / `TeamKnowledge` — Agent conversation memory
- **Location:** `src/types.ts:72`, `src/types.ts:90`
- Sessions store message history + a rolling summary (old messages are summarized by AI).

---

## Architecture Overview

```
src/
├── app/
│   ├── layout.tsx                  # Root HTML shell
│   └── (dashboard)/
│       ├── layout.tsx              # Wraps dashboard in WorkspaceProvider + DashboardShell
│       ├── page.tsx                # Main kanban board page
│       └── leads/[id]/page.tsx     # Lead detail route (real URL, not modal)
│
├── api/                            # Next.js Server Actions / Route Handlers
│   ├── parse-lead/route.ts         # POST: AI or heuristic lead parsing
│   ├── health/route.ts             # GET: connectivity probe
│   └── agent/
│       ├── route.ts                # POST: AI agent planning (Gemini → Groq fallback)
│       ├── knowledge/route.ts      # GET/POST: team knowledge (agent context)
│       └── sessions/route.ts       # GET: list agent sessions for a team
│
├── providers/
│   └── WorkspaceProvider.tsx       # Master React context combining all workspace state
│
├── features/                       # Feature-based modules
│   ├── auth/                       # Google Sign-In / Firebase Auth
│   ├── activity-feed/              # Toasts, push notifications, activity logs
│   ├── agent/                      # AI Command Center (planning, sessions, knowledge)
│   ├── dashboard/                  # Header, stats, notification controls
│   ├── leads/                      # Kanban, lead detail, slideshow, AI parsing
│   └── teams/                      # Team switching, presence, workspace management
│
├── components/layout/              # Shared app shell (TopBar, DashboardShell)
├── hooks/                          # Generic hooks (network status)
├── lib/                            # Firebase clients, team CRUD, server auth
├── utils/                          # Audio synth, CSV export
└── types.ts / types/activity.ts    # Domain types
```

---

## File Reference

### Root Layout

| File | Purpose |
|---|---|
| `src/app/layout.tsx` | Root `<html>` shell. Sets page title to "Soro-CRM". Minimal. |
| `src/app/(dashboard)/layout.tsx` | Dashboard route wrapper. Composes `WorkspaceProvider` → `DashboardShell` → `{children}`. |
| `src/app/(dashboard)/page.tsx` | **Main dashboard.** Assembles the header, agent command bar, kanban board, notification controls, stats cards, activity ledger, and delete modal. Consumes `useWorkspace()`. |
| `src/app/(dashboard)/leads/[id]/page.tsx` | **Lead detail route.** Finds lead by `id`, redirects to `/` if not found after `leadsLoaded`. Passes lead + user context to `LeadDetailView`. |

### API Routes

| File | Purpose |
|---|---|
| `src/app/api/parse-lead/route.ts` | **POST** — Validates request, calls `parseLead()` (AI → heuristic fallback). Returns `{ parsed_lead, market_fit_thesis, mom_test_questions }`. |
| `src/app/api/health/route.ts` | **GET** — Returns `{ ok: true }` for network connectivity probing. Always `force-dynamic`. |
| `src/app/api/agent/route.ts` | **POST** — Core AI agent. Receives `{ prompt, leads, teamId, threadId }`. Builds system prompt with team knowledge + conversation summary. Calls Gemini first, Groq on failure. Returns `AgentPlan` with structured actions. Requires Bearer token auth. |
| `src/app/api/agent/knowledge/route.ts` | **GET/POST** — Fetches or saves team knowledge (sales process, scoring, objections, custom instructions, past decisions). Used by the "Knowledge" button in AgentCommandBar. |
| `src/app/api/agent/sessions/route.ts` | **GET** — Lists up to 20 sessions for a team. Used by AgentCommandBar to load conversation threads. |

### Providers

| File | Purpose |
|---|---|
| `src/providers/WorkspaceProvider.tsx` | **Master context.** Composes `useAuth`, `useTeamWorkspace`, `useTeamPresence`, `useLeads`, `useActivityFeed`, `useNetworkStatus`. Exposes everything the dashboard needs via `useWorkspace()`. |

### Features — Aut

| File | Purpose |
|---|---|
| `src/features/auth/hooks/useAuth.ts` | Wraps Firebase `initAuth`, `googleSignIn`, `logout`. Returns `{ user, accessToken, signIn, signOut }`. Triggers `onAuthSuccess` callback. |

### Features — Activity Feed

| File | Purpose |
|---|---|
| `src/features/activity-feed/hooks/useActivityLog.ts` | Core log state. Maintains `activityLogs` (last 30) and `toasts` (auto-dismiss after 4.5s). Plays sounds on log. |
| `src/features/activity-feed/hooks/useFcmPush.ts` | FCM push state. Manages `simulatedNotifications` stack, native `Notification` API trigger, auto-dismiss (7s). Requests permission. |
| `src/features/activity-feed/hooks/useActivityFeed.ts` | Composes `useActivityLog` + `useFcmPush`. Maps structured `ActivityEventType` → push notification copy. Exposes `logActivity` (structured), `legacyLogActivity` (string-based bridge), `toggleSound`, `toggleFcm`, `dispatchTestPush`. |
| `src/features/activity-feed/components/ActivityLedger.tsx` | Scrollable list of pipeline activity logs rendered in the dashboard. |
| `src/features/activity-feed/components/ToastStack.tsx` | Animated toast notifications (success/warning/info). Fixed bottom-left. |
| `src/features/activity-feed/components/FcmPushStack.tsx` | Animated push notification cards. Fixed top-left. Simulates FCM cloud push UI. |

### Features — Agent (AI Command Center)

| File | Purpose |
|---|---|
| `src/features/agent/types.ts` | `AgentActionType`, `AgentAction`, `AgentPlan`, `AgentLeadContext` types. |
| `src/features/agent/server/agentSchema.ts` | `AGENT_SYSTEM_INSTRUCTION` (Gemini prompt), `AGENT_RESPONSE_SCHEMA` (JSON schema), `AGENT_SYSTEM_INSTRUCTION_FOR_GROQ` (explicit JSON contract for Groq). |
| `src/features/agent/server/sessionService.ts` | Server-side session/team-knowledge CRUD using Admin Firestore. Creates sessions, adds messages (auto-summarizes messages >30 days old using Groq), fetches/saves team knowledge. |
| `src/features/agent/components/AgentCommandBar.tsx` | **The big one (~326 lines).** Two modes: "Ask Soro" (agent planning) and "Capture lead" (AI parsing). Manages thread switching, knowledge modal, plan review, and action application (create/update/move lead, send email, schedule meeting). Calls `/api/agent`, `/api/agent/knowledge`, `/api/agent/sessions`. |

### Features — Dashboard

| File | Purpose |
|---|---|
| `src/features/dashboard/components/DashboardHeader.tsx` | Title + stats summary (total leads, synced sheets, tracked tasks). |
| `src/features/dashboard/components/StatsCards.tsx` | 4-card grid: Lead Found, Prospect Engaged, Client Closed, AI Status. |
| `src/features/dashboard/components/NotificationEngineControls.tsx` | Export CSV, toggle FCM, toggle sound, test push. |

### Features — Leads

| File | Purpose |
|---|---|
| `src/features/leads/hooks/useLeads.ts` | Core lead state hook. `fetchLeadsByTeam` on team change, `updateLead` (optimistic local + Firestore write), `deleteLead`, `addNewLead`, `parseLead` (calls `/api/parse-lead`), `exportCsv`. Logs diagnostics for Firestore write failures. |
| `src/features/leads/utils/leadStats.ts` | Pure function: counts leads by phase + sync flags. |
| `src/features/leads/components/KanbanBoard.tsx` | 3-column kanban (Lead Found / Prospect Engaged / Client Closed). Compact `LeadSlideshow` preview per column + "See All" modal with search. Add/delete support. |
| `src/features/leads/components/LeadSlideshow.tsx` | Carousel of top 3 leads in a column with 3D stack background effect. |
| `src/features/leads/components/LeadDetailView.tsx` | **Full lead dossier (~879 lines).** Left: editable fields (name, company, email, phone, phase, notes). Right: AI coach insights (market-fit thesis, Mom Test questions). Bottom: workspace sync panel (Sheets, Gmail, Calendar, Tasks) with confirmation modals. |
| `src/features/leads/components/DeleteLeadModal.tsx` | Confirmation modal for lead deletion. |
| `src/features/leads/server/geminiClient.ts` | Lazy singleton `GoogleGenAI` client. Uses `GEMINI_API_KEY`. |
| `src/features/leads/server/groqClient.ts` | Groq API client with multi-key rotation, sliding-window rate limiting (5 req/60s), and 30s cooldown on exhaustion. |
| `src/features/leads/server/modelSelection.ts` | Maps presets (`low-latency`, `high-quality`, `deep-reasoning`) → Gemini or Groq model names. |
| `src/features/leads/server/parseLead.ts` | Orchestrator: tries `parseLeadWithAI`, catches and falls back to `buildHeuristicFallback`. |
| `src/features/leads/server/parseLeadWithAI.ts` | Calls Gemini with optional search grounding. Falls back to Groq if Gemini fails. Extracts JSON from response. |
| `src/features/leads/server/parseLeadSchema.ts` | System instructions + JSON schema for lead parsing. Separate Groq instruction with explicit JSON contract. |
| `src/features/leads/server/heuristicParser.ts` | Regex-based fallback: extracts name, company, email, phone. Resolves thesis + Mom Test questions from keyword templates. |
| `src/features/leads/server/types.ts` | `ParseLeadRequestBody`, `ParsedLead`, `ParseLeadResult` interfaces. |
| `src/features/leads/server/validateParseLeadRequest.ts` | Validates `rawText` is a non-empty string. Returns discriminated union. |

### Features — Teams

| File | Purpose |
|---|---|
| `src/features/teams/hooks/useTeamWorkspace.ts` | Loads user's teams on auth. Creates default team if none exist. Handles invite-token joining from URL. Exposes `switchTeam`, `addCreatedTeam`, `removeDeletedTeam`. |
| `src/features/teams/hooks/useTeamPresence.ts` | Subscribes to team memberships in real-time. Updates current user's presence (active/away/offline) + editing state. Idle timeout: 120s. |
| `src/features/teams/components/TeamManagementModal.tsx` | 3-tab modal: Members (role management, invites), Workspaces (list + create), Settings (billing simulation, danger zone delete). |

### Shared Layout Components

| File | Purpose |
|---|---|
| `src/components/layout/DashboardShell.tsx` | App chrome. Renders `TopBar`, `{children}`, `ToastStack`, `FcmPushStack`, and `TeamManagementModal`. |
| `src/components/layout/TopBar.tsx` | Logo, workspace dropdown, team avatar stack with presence indicators, network + sync status badges, Google Sign-In/Out button. |

### Lib (Shared Services)

| File | Purpose |
|---|---|
| `src/lib/firebase.ts` | **Client-side Firebase.** Initializes Auth + Firestore only if credentials are configured. Google Sign-In with Sheets/Gmail/Calendar scopes. Legacy `fetchLeads`/`saveLead`/`deleteLead` (userId-based, no team isolation). |
| `src/lib/firebaseAdmin.ts` | **Server-side Firebase Admin.** Initialized from service account env vars. Exposes `adminDb` and `adminAuth`. Must never be imported in client components. |
| `src/lib/firebaseConfig.ts` | Firebase config object (apiKey, authDomain, projectId, etc.). |
| `src/lib/serverAuth.ts` | Verifies Bearer token by calling Firebase Identity Toolkit `accounts:lookup`. Returns `{ uid, email }` or null. Used in API routes. |
| `src/lib/teamAccess.ts` | Checks if a `userId` is a member of a `teamId` by reading `team_memberships/{userId}_{teamId}`. |
| `src/lib/teamService.ts` | **Core multi-tenant CRUD (~380 lines).** Creates teams, generates invitation tokens (24h expiry), joins teams via invite transaction, fetches memberships, updates presence, changes roles, removes members. Lead operations are team-scoped: `fetchLeadsByTeam`, `saveLeadForTeam`, `deleteLeadForTeam`, `deleteTeamWorkspace` (cascading delete). |
| `src/lib/getUserId.ts` | Returns `user.uid` or throws. Centralizes the old "demo-founder-123" fallback logic. |

### Hooks

| File | Purpose |
|---|---|
| `src/hooks/useNetworkStatus.ts` | Probes `/api/health` to determine *real* connectivity (not just `navigator.onLine`). Probes on mount, `online` event, visibility change, and every 30s. Returns `"online" | "offline" | "checking"`. |

### Utils

| File | Purpose |
|---|---|
| `src/utils/audio.ts` | Web Audio API synthesizer. Functions: `playSuccessPop`, `playInfoTap`, `playFCMPushSound`, `playWarningChime`. |
| `src/utils/csvExport.ts` | Builds CSV from leads array and triggers browser download. |

### Types

| File | Purpose |
|---|---|
| `src/types.ts` | **Domain types:** `Lead`, `Phase`, `ActivityLog`, `Team`, `TeamMember`, `TeamInvitation`, `Session`, `SessionMessage`, `TeamKnowledge`, `GeminiParseResponse`. |
| `src/types/activity.ts` | `ActivityEventType` union (all possible event triggers), `ToastMessage`, `FcmNotification`, `LogActivityInput`. |
| `src/global.d.ts` | TypeScript declaration for `*.css` modules. |

---

## Key Data Flows

### 1. Lead Parsing (AI Capture)
1. User pastes raw text in AgentCommandBar → "Capture lead" mode.
2. Frontend calls `POST /api/parse-lead` with `{ rawText, useSearchGrounding, modelPreset }`.
3. Server validates → calls `parseLead()` → tries Gemini with search grounding → falls back to Groq → falls back to `buildHeuristicFallback()`.
4. Result creates a new `Lead` in Firestore (team-scoped) and appears in the Kanban board.

### 2. AI Agent Planning (Ask Soro)
1. User types natural language request in AgentCommandBar → "Ask Soro" mode.
2. Frontend calls `POST /api/agent` with `{ prompt, leads, teamId, threadId }`.
3. Server loads/creates session, fetches team knowledge, builds dynamic system prompt.
4. Calls Gemini → falls back to Groq → returns `AgentPlan` with structured actions.
5. User reviews plan → clicks "Apply plan" → actions execute (create/update/move lead, send Gmail, schedule Calendar).

### 3. Workspace Sync (Lead Actions)
1. In LeadDetailView, user clicks Sheets/Gmail/Calendar/Tasks button.
2. Confirmation modal → API call to Google Workspace using OAuth `accessToken`.
3. On success, updates lead flags (`sheetsSynced`, `gmailSent`, etc.) in Firestore.
4. Activity log + toast + optional FCM push fires.

### 4. Multi-Tenant Flow
1. User signs in with Google → `WorkspaceProvider` loads teams from Firestore.
2. If no teams exist, a default team is auto-created.
3. If `?inviteToken=` is in URL, joins team via invitation transaction.
4. Team switching reloads leads for the selected team.
5. All Firestore reads/writes are team-scoped via `teamId` queries.

---

## Important Patterns & Gotchas

### Server vs Client
- **Server-only:** `src/lib/firebaseAdmin.ts`, `src/app/api/*`, `src/features/*/server/*`. These use the Admin SDK or run only on the server.
- **Client components:** Anything with `"use client"` at the top. They cannot import `firebaseAdmin.ts`.

### Authentication
- Client: `initAuth` / `googleSignIn` from `src/lib/firebase.ts` (Firebase Auth client SDK).
- Server (API routes): `getAuthUser` from `src/lib/serverAuth.ts` (Identity Toolkit REST API). It verifies the Bearer token without needing Admin SDK initialization.

### State Management
- No Redux/Zustand. All state lives in React Context (`WorkspaceProvider`) composed from individual hooks.
- Lead updates are optimistic (local state updates immediately, Firestore write happens async with diagnostic logging).

### AI Fallbacks
- **Lead parsing:** Gemini → Groq → Heuristic regex parser.
- **Agent planning:** Gemini → Groq (no heuristic fallback — returns error if both fail).
- **Session summarization:** Groq only (low-latency preset).

### Firestore Collections
- `leads` — lead documents (team-scoped via `teamId` field).
- `teams` — team workspace definitions.
- `team_memberships` — `{userId}_{teamId}` as doc ID. Stores role, presence, activity.
- `sessions` — agent conversation sessions (team-scoped).
- `team_knowledge` — one doc per team with agent context.
- `invitations` — invite tokens with 24h expiry.

---

## Environment Variables

| Variable | Where Used | Purpose |
|---|---|---|
| `GEMINI_API_KEY` | `features/leads/server/geminiClient.ts` | Google Gemini API key |
| `GROQ_API_KEY` or `GROQ_API_KEYS` | `features/leads/server/groqClient.ts` | Groq API key(s), comma-separated for rotation |
| `FIREBASE_PROJECT_ID` | `lib/firebaseAdmin.ts` | Firebase project ID for Admin SDK |
| `FIREBASE_CLIENT_EMAIL` | `lib/firebaseAdmin.ts` | Service account email for Admin SDK |
| `FIREBASE_PRIVATE_KEY` | `lib/firebaseAdmin.ts` | Service account private key (literal `\n` sequences) |
| `NEXT_PUBLIC_SITE_URL` | `features/teams/components/TeamManagementModal.tsx` | Base URL for invite links |

---

## How to Run

```bash
npm install
npm run dev      # Starts Next.js dev server (default port 3000)
npm run build    # Production build
npm run lint     # Next.js lint
```

Ensure `.env.local` contains the required Firebase and AI keys. See `.env.example` if present.

---

## Adding a New Feature

1. **Create a folder under `src/features/your-feature/`** with `components/`, `hooks/`, `server/` as needed.
2. **Add types** to `src/types.ts` or `src/types/your-feature.ts`.
3. **Add API routes** under `src/app/api/your-feature/route.ts`.
4. **Wire into WorkspaceProvider** if the feature needs global state (see `src/providers/WorkspaceProvider.tsx`).
5. **Use `useWorkspace()`** in dashboard pages to access shared state.

---

## Debugging Tips

- **Firestore write not persisting?** Check `useLeads.ts:39-45` — it logs whether `currentTeam` is null (write is skipped).
- **AI not responding?** Check `AgentCommandBar.tsx` — `isPlanning`/`isParsing` flags. Check API route logs for Gemini → Groq fallback.
- **Not seeing team data?** Verify `team_memberships` collection exists and the user's membership doc has the correct `teamId`.
- **Agent sessions not loading?** Verify `sessions` collection and that `teamId` matches.
- **Network looks offline?** `useNetworkStatus.ts` probes `/api/health` — check that route exists and isn't blocked by a proxy.
