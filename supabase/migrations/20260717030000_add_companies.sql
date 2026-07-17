create table public.companies (
  id text primary key,
  "teamId" text not null references public.teams(id) on delete cascade,
  name text not null,
  website text,
  industry text,
  notes text not null,
  phase text not null check (phase in ('lead_found', 'prospect_engaged', 'client_closed')),
  "createdAt" text not null,
  "updatedAt" text not null
);

create index idx_companies_team_id on public.companies("teamId");
alter table public.companies enable row level security;
grant select, insert, update, delete on table public.companies to service_role;
create policy "Service role can manage companies" on public.companies for all to service_role using (true) with check (true);
