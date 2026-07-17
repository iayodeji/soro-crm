-- soroCRM: repair and verify server-side Supabase access
-- Run this whole file in the SQL Editor of the SAME Supabase project whose URL
-- is configured in .env.local. It is safe to run repeatedly and changes only
-- privileges for the application's known tables.

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

-- Ensure this remains true if the clean-slate schema is rebuilt by postgres.
alter default privileges for role postgres in schema public
  grant select, insert, update, delete on tables to service_role;

-- Expected result: every value below must be true.
select
  has_schema_privilege('service_role', 'public', 'USAGE') as schema_usage,
  has_table_privilege('service_role', 'public.users', 'SELECT') as users_select,
  has_table_privilege('service_role', 'public.users', 'INSERT') as users_insert,
  has_table_privilege('service_role', 'public.teams', 'INSERT') as teams_insert,
  has_table_privilege('service_role', 'public.team_memberships', 'INSERT') as memberships_insert;
