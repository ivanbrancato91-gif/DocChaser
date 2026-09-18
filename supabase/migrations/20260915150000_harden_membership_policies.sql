drop policy if exists "members owner manage" on public.organization_members;
create policy "members owner manage" on public.organization_members
for all to authenticated
using (exists (select 1 from public.organization_members m where m.organization_id = organization_members.organization_id and m.user_id = auth.uid() and m.role = 'owner'))
with check (exists (select 1 from public.organization_members m where m.organization_id = organization_members.organization_id and m.user_id = auth.uid() and m.role = 'owner'));

drop policy if exists "subscriptions owner" on public.subscriptions;
create policy "subscriptions member read" on public.subscriptions
for select to authenticated
using (public.is_org_member(organization_id));
