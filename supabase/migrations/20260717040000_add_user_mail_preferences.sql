create table public.user_mail_preferences (
  "userId" text primary key,
  "fromEmail" text not null,
  "updatedAt" text not null
);

alter table public.user_mail_preferences enable row level security;
grant select, insert, update, delete on table public.user_mail_preferences to service_role;
create policy "Service role can manage user mail preferences"
  on public.user_mail_preferences for all to service_role using (true) with check (true);
