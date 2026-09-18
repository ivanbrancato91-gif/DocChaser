create table if not exists public.document_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  version integer not null check (version >= 1),
  storage_path text not null,
  original_name text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes >= 0),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(document_id, version)
);
create index if not exists document_versions_document_idx on public.document_versions(document_id, version desc);
create index if not exists document_versions_org_idx on public.document_versions(organization_id, created_at desc);
alter table public.document_versions enable row level security;
create policy "document_versions_member_select" on public.document_versions for select to authenticated using (private.is_org_member(organization_id));
create policy "document_versions_member_insert" on public.document_versions for insert to authenticated with check (private.is_org_member(organization_id));
