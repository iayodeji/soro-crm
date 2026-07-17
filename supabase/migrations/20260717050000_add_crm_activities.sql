create table public.crm_activities (
  id text primary key,
  "teamId" text not null references public.teams(id) on delete cascade,
  "leadId" text references public.leads(id) on delete cascade,
  "companyId" text references public.companies(id) on delete cascade,
  type text not null check (type in ('call', 'email', 'linkedin', 'meeting', 'note', 'stage_change', 'task', 'custom')),
  outcome text check (outcome in ('sent', 'replied', 'no_answer', 'completed', 'scheduled', 'no_show', 'bounced', 'left_voicemail', 'other')),
  summary text not null,
  notes text,
  "occurredAt" text not null,
  "nextStep" text,
  "followUpAt" text,
  "createdBy" text not null,
  "updatedBy" text not null,
  "createdAt" text not null,
  "updatedAt" text not null,
  "deletedAt" text,
  "deletedBy" text,
  constraint crm_activities_has_target check ("leadId" is not null or "companyId" is not null)
);

create index idx_crm_activities_team_recent on public.crm_activities("teamId", "occurredAt" desc);
create index idx_crm_activities_lead_recent on public.crm_activities("leadId", "occurredAt" desc) where "deletedAt" is null;
create index idx_crm_activities_company_recent on public.crm_activities("companyId", "occurredAt" desc) where "deletedAt" is null;
alter table public.crm_activities enable row level security;
grant select, insert, update, delete on table public.crm_activities to service_role;
create policy "Service role can manage CRM activities" on public.crm_activities for all to service_role using (true) with check (true);
