-- Corrective migration: the previous migrations declared camelCase column names
-- WITHOUT double quotes, so PostgreSQL folded them to lowercase
-- (e.g. `ownerId` became `ownerid`, `createdAt` became `createdat`).
-- The application code (Supabase JS upserts/reads) expects camelCase keys, so
-- PostgREST could not resolve the columns and the sync endpoints returned 500
-- ("Workspace sync failed").
--
-- This renames every affected column back to its camelCase form. It is safe to
-- re-run: a column is only renamed when its lowercase form currently exists.
-- Run this in the Supabase SQL Editor.

do $$
declare
  item text;
  parts text[];
  tbl text;
  lower_name text;
  camel_name text;
  has_col boolean;
begin
  -- format: "<schema>.<table>|<current lowercase column>|<desired camelCase column>"
  foreach item in array array[
    'public.teams|ownerid|ownerId',
    'public.teams|createdat|createdAt',
    'public.teams|memberscount|membersCount',
    'public.teams|imageurl|imageUrl',

    'public.team_memberships|userid|userId',
    'public.team_memberships|teamid|teamId',
    'public.team_memberships|avatarurl|avatarUrl',
    'public.team_memberships|lastactiveat|lastActiveAt',

    'public.leads|teamid|teamId',
    'public.leads|createdat|createdAt',
    'public.leads|updatedat|updatedAt',
    'public.leads|marketfitthesis|marketFitThesis',
    'public.leads|momtestquestions|momTestQuestions',
    'public.leads|gmailSent|gmailSent',
    'public.leads|calendarscheduled|calendarScheduled',
    'public.leads|sheetssynced|sheetsSynced',
    'public.leads|taskscreated|tasksCreated',

    'public.sessions|teamid|teamId',
    'public.sessions|userid|userId',
    'public.sessions|threadid|threadId',
    'public.sessions|lastactivity|lastActivity',
    'public.sessions|createdat|createdAt',

    'public.team_knowledge|teamid|teamId',
    'public.team_knowledge|salesprocess|salesProcess',
    'public.team_knowledge|leadscoringcriteria|leadScoringCriteria',
    'public.team_knowledge|commonobjections|commonObjections',
    'public.team_knowledge|custominstructions|customInstructions',
    'public.team_knowledge|pastdecisions|pastDecisions',
    'public.team_knowledge|updatedat|updatedAt',

    'public.users|clerkuserid|clerkUserId',
    'public.users|firstname|firstName',
    'public.users|lastname|lastName',
    'public.users|imageurl|imageUrl',
    'public.users|updatedat|updatedAt',

    'public.projects|teamid|teamId',
    'public.projects|createdby|createdBy',
    'public.projects|createdat|createdAt',

    'public.invitations|teamid|teamId',
    'public.invitations|teamname|teamName',
    'public.invitations|createdat|createdAt',
    'public.invitations|expiresat|expiresAt'
  ]
  loop
    parts := string_to_array(item, '|');
    tbl := parts[1];
    lower_name := parts[2];
    camel_name := parts[3];

    select exists (
      select 1 from information_schema.columns
      where table_schema = split_part(tbl, '.', 1)
        and table_name = split_part(tbl, '.', 2)
        and column_name = lower_name
    ) into has_col;

    if has_col then
      execute format('alter table %s rename column %I to %I', tbl, lower_name, camel_name);
    end if;
  end loop;
end $$;
