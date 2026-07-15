-- Supabase Postgres migration for soroCRM
-- Run this in the Supabase SQL Editor or via `supabase db push`.

-- Enable UUID extension (optional, Supabase usually has it)
create extension if not exists "uuid-ossp";

-- Workspaces synced from Clerk organizations.
create table if not exists public.teams (
  id text primary key,
  name text not null,
  ownerId text not null,
  createdAt text not null,
  membersCount integer default 0,
  slug text,
  imageUrl text
);

-- Memberships enriched from Clerk.
create table if not exists public.team_memberships (
  id text primary key,
  userId text not null,
  teamId text not null references public.teams(id) on delete cascade,
  name text not null,
  email text not null,
  avatarUrl text,
  status text not null default 'active',
  activity text not null default 'idle',
  role text not null,
  lastActiveAt text not null
);

create index if not exists idx_team_memberships_team_id on public.team_memberships(teamId);
create index if not exists idx_team_memberships_user_id on public.team_memberships(userId);

-- Leads scoped to a workspace.
create table if not exists public.leads (
  id text primary key,
  teamId text not null references public.teams(id) on delete cascade,
  name text not null,
  company_name text not null,
  email text,
  phone text,
  notes text,
  phase text not null,
  createdAt text not null,
  updatedAt text not null,
  marketFitThesis text,
  momTestQuestions jsonb,
  gmailSent boolean default false,
  calendarScheduled boolean default false,
  sheetsSynced boolean default false,
  tasksCreated boolean default false
);

create index if not exists idx_leads_team_id on public.leads(teamId);

-- Agent sessions.
create table if not exists public.sessions (
  id text primary key,
  teamId text not null references public.teams(id) on delete cascade,
  userId text not null,
  threadId text not null,
  messages jsonb not null default '[]'::jsonb,
  summary text,
  title text not null,
  lastActivity text not null,
  createdAt text not null
);

create index if not exists idx_sessions_team_id on public.sessions(teamId);
create index if not exists idx_sessions_thread_id on public.sessions(threadId);

-- Team knowledge.
create table if not exists public.team_knowledge (
  teamId text primary key references public.teams(id) on delete cascade,
  salesProcess text,
  leadScoringCriteria text,
  commonObjections text,
  customInstructions text,
  pastDecisions jsonb,
  updatedAt text not null
);

-- User profiles.
create table if not exists public.users (
  clerkUserId text primary key,
  email text,
  firstName text,
  lastName text,
  imageUrl text,
  updatedAt text not null
);

-- Workspace projects.
create table if not exists public.projects (
  id text primary key,
  teamId text not null references public.teams(id) on delete cascade,
  name text not null,
  createdBy text not null,
  createdAt text not null
);

create index if not exists idx_projects_team_id on public.projects(teamId);

-- Invitations.
create table if not exists public.invitations (
  token text primary key,
  email text not null,
  teamId text not null references public.teams(id) on delete cascade,
  teamName text not null,
  role text not null,
  status text not null default 'pending',
  createdAt text not null,
  expiresAt text not null
);

-- Enable Row Level Security.
alter table public.teams enable row level security;
alter table public.team_memberships enable row level security;
alter table public.leads enable row level security;
alter table public.sessions enable row level security;
alter table public.team_knowledge enable row level security;
alter table public.users enable row level security;
alter table public.projects enable row level security;
alter table public.invitations enable row level security;

-- RLS Policies
-- Teams: readable by authenticated users, writable by service role only.
create policy "Users can read teams" on public.teams for select using (auth.role() = 'authenticated');
create policy "Service role can manage teams" on public.teams for all using (auth.role() = 'service_role');

-- Team memberships: readable by authenticated users, writable by service role only.
create policy "Users can read team memberships" on public.team_memberships for select using (auth.role() = 'authenticated');
create policy "Service role can manage team memberships" on public.team_memberships for all using (auth.role() = 'service_role');

-- Leads: readable/writable by service role only.
create policy "Service role can manage leads" on public.leads for all using (auth.role() = 'service_role');

-- Sessions: readable/writable by service role only.
create policy "Service role can manage sessions" on public.sessions for all using (auth.role() = 'service_role');

-- Team knowledge: readable/writable by service role only.
create policy "Service role can manage team knowledge" on public.team_knowledge for all using (auth.role() = 'service_role');

-- Users: readable/writable by the owning user.
create policy "Users can read own profile" on public.users for select using (auth.uid() = clerkUserId);
create policy "Users can upsert own profile" on public.users for insert with check (auth.uid() = clerkUserId);
create policy "Users can update own profile" on public.users for update using (auth.uid() = clerkUserId);

-- Projects: readable/writable by service role only.
create policy "Service role can manage projects" on public.projects for all using (auth.role() = 'service_role');

-- Invitations: readable by anyone, writable by service role only.
create policy "Anyone can read invitations" on public.invitations for select using (true);
create policy "Service role can manage invitations" on public.invitations for all using (auth.role() = 'service_role');
