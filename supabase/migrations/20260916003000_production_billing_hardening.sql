-- Production hardening for billing data. Keep one subscription record per organization.
create unique index if not exists subscriptions_organization_id_uidx
  on public.subscriptions (organization_id);

create index if not exists subscriptions_stripe_customer_id_idx
  on public.subscriptions (stripe_customer_id)
  where stripe_customer_id is not null;
