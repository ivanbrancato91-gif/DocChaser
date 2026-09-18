create table if not exists public.ai_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  document_id uuid references public.documents(id) on delete set null,
  job_type text not null check (job_type in ('document_analysis')),
  status text not null default 'queued' check (status in ('queued','running','completed','failed')),
  input jsonb not null default '{}'::jsonb,
  output jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists ai_jobs_org_created_idx on public.ai_jobs(organization_id, created_at desc);
create index if not exists ai_jobs_document_idx on public.ai_jobs(document_id, created_at desc);
alter table public.ai_jobs enable row level security;
drop policy if exists "ai_jobs_member_select" on public.ai_jobs;
create policy "ai_jobs_member_select" on public.ai_jobs for select to authenticated using (private.is_org_member(organization_id));
