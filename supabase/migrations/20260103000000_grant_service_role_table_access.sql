-- Repairs databases created by the initial clean-slate script before it
-- explicitly granted privileges to the server-side Supabase role.
-- Safe to run repeatedly.

grant usage on schema public to service_role;
grant select, insert, update, delete on table
  public.users,
  public.teams,
  public.team_memberships,
  public.leads,
  public.sessions,
  public.team_knowledge,
  public.projects,
  public.invitations
to service_role;

alter default privileges for role postgres in schema public
  grant select, insert, update, delete on tables to service_role;
