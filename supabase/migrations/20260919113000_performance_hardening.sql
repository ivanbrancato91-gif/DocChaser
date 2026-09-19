create index if not exists document_versions_created_by_idx
  on public.document_versions(created_by);

create index if not exists portal_messages_client_fk_idx
  on public.portal_messages(client_id);

create index if not exists portal_messages_organization_fk_idx
  on public.portal_messages(organization_id);

create index if not exists portal_messages_sender_user_fk_idx
  on public.portal_messages(sender_user_id);

create index if not exists workflow_runs_actor_user_fk_idx
  on public.workflow_runs(actor_user_id);

create index if not exists workflow_runs_organization_fk_idx
  on public.workflow_runs(organization_id);

drop policy if exists workflow_runs_member_insert on public.workflow_runs;

create policy workflow_runs_member_insert
  on public.workflow_runs
  for insert
  with check (
    private.is_org_member(organization_id)
    and actor_user_id = (select auth.uid())
  );
