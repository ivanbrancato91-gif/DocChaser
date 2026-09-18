create table if not exists public.portal_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  case_id uuid not null references public.cases(id) on delete cascade,
  sender_type text not null check (sender_type in ('staff','client')),
  sender_user_id uuid null,
  body text not null check (char_length(body) between 1 and 4000),
  public_visible boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists portal_messages_case_created_idx on public.portal_messages(case_id, created_at desc);
create index if not exists portal_messages_org_idx on public.portal_messages(organization_id, created_at desc);
alter table public.portal_messages enable row level security;
alter table public.portal_messages add column if not exists client_id uuid null references public.clients(id) on delete set null;
create index if not exists portal_messages_client_idx on public.portal_messages(client_id, created_at desc);
