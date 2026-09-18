-- Organization onboarding and operational defaults.
alter table public.organizations
  add column if not exists phone text,
  add column if not exists address text,
  add column if not exists website text,
  add column if not exists contact_email text,
  add column if not exists default_due_days integer not null default 14 check (default_due_days between 1 and 365),
  add column if not exists reminders_enabled boolean not null default true,
  add column if not exists onboarding_completed_at timestamptz;

create index if not exists organizations_onboarding_idx
  on public.organizations(onboarding_completed_at);
