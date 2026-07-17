alter table public.leads
  add column if not exists "linkedinUrl" text,
  add column if not exists "companyWebsite" text;
