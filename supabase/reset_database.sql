-- soroCRM: destructive clean-slate reset
--
-- Run in the Supabase SQL Editor only when starting from scratch.
-- This permanently deletes every row in the soroCRM application tables.
-- It does not alter Supabase Auth users, storage buckets, extensions owned by
-- Supabase, or environment variables.

begin;

drop table if exists public.invitations cascade;
drop table if exists public.projects cascade;
drop table if exists public.team_knowledge cascade;
drop table if exists public.sessions cascade;
drop table if exists public.team_memberships cascade;
drop table if exists public.leads cascade;
drop table if exists public.users cascade;
drop table if exists public.teams cascade;

create extension if not exists "uuid-ossp";

create table public.teams (
  id text primary key,
  name text not null,
  "ownerId" text not null,
  "createdAt" text not null,
  "membersCount" integer default 0,
  slug text,
  "imageUrl" text
);

create table public.team_memberships (
  id text primary key,
  "userId" text not null,
  "teamId" text not null references public.teams(id) on delete cascade,
  name text not null,
  email text not null,
  "avatarUrl" text,
  status text not null default 'active',
  activity text not null default 'idle',
  role text not null,
  "lastActiveAt" text not null
);

create index idx_team_memberships_team_id on public.team_memberships("teamId");
create index idx_team_memberships_user_id on public.team_memberships("userId");

create table public.leads (
  id text primary key,
  "teamId" text not null references public.teams(id) on delete cascade,
  name text not null,
  company_name text not null,
  email text,
  phone text,
  notes text not null,
  phase text not null check (phase in ('lead_found', 'prospect_engaged', 'client_closed')),
  "createdAt" text not null,
  "updatedAt" text not null,
  "marketFitThesis" text,
  "momTestQuestions" jsonb,
  "gmailSent" boolean not null default false,
  "calendarScheduled" boolean not null default false,
  "sheetsSynced" boolean not null default false,
  "tasksCreated" boolean not null default false
);

create index idx_leads_team_id on public.leads("teamId");

create table public.sessions (
  id text primary key,
  "teamId" text not null references public.teams(id) on delete cascade,
  "userId" text not null,
  "threadId" text not null,
  messages jsonb not null default '[]'::jsonb,
  summary text,
  title text not null,
  "lastActivity" text not null,
  "createdAt" text not null
);

create index idx_sessions_team_id on public.sessions("teamId");
create index idx_sessions_thread_id on public.sessions("threadId");

create table public.team_knowledge (
  "teamId" text primary key references public.teams(id) on delete cascade,
  "salesProcess" text,
  "leadScoringCriteria" text,
  "commonObjections" text,
  "customInstructions" text,
  "pastDecisions" jsonb,
  "updatedAt" text not null
);

create table public.users (
  "clerkUserId" text primary key,
  email text,
  "firstName" text,
  "lastName" text,
  "imageUrl" text,
  "updatedAt" text not null
);

create table public.projects (
  id text primary key,
  "teamId" text not null references public.teams(id) on delete cascade,
  name text not null,
  "createdBy" text not null,
  "createdAt" text not null
);

create index idx_projects_team_id on public.projects("teamId");

create table public.invitations (
  token text primary key,
  email text not null,
  "teamId" text not null references public.teams(id) on delete cascade,
  "teamName" text not null,
  role text not null,
  status text not null default 'pending',
  "createdAt" text not null,
  "expiresAt" text not null
);

alter table public.teams enable row level security;
alter table public.team_memberships enable row level security;
alter table public.leads enable row level security;
alter table public.sessions enable row level security;
alter table public.team_knowledge enable row level security;
alter table public.users enable row level security;
alter table public.projects enable row level security;
alter table public.invitations enable row level security;

create policy "Users can read teams" on public.teams for select using (auth.role() = 'authenticated');
create policy "Service role can manage teams" on public.teams for all using (auth.role() = 'service_role');
create policy "Users can read team memberships" on public.team_memberships for select using (auth.role() = 'authenticated');
create policy "Service role can manage team memberships" on public.team_memberships for all using (auth.role() = 'service_role');
create policy "Service role can manage leads" on public.leads for all using (auth.role() = 'service_role');
create policy "Service role can manage sessions" on public.sessions for all using (auth.role() = 'service_role');
create policy "Service role can manage team knowledge" on public.team_knowledge for all using (auth.role() = 'service_role');
create policy "Users can read own profile" on public.users for select using (auth.uid()::text = "clerkUserId");
create policy "Users can upsert own profile" on public.users for insert with check (auth.uid()::text = "clerkUserId");
create policy "Users can update own profile" on public.users for update using (auth.uid()::text = "clerkUserId");
create policy "Service role can manage projects" on public.projects for all using (auth.role() = 'service_role');
create policy "Anyone can read invitations" on public.invitations for select using (true);
create policy "Service role can manage invitations" on public.invitations for all using (auth.role() = 'service_role');

commit;
