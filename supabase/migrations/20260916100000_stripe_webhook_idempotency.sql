-- Idempotency ledger for Stripe webhook deliveries.
create table if not exists public.stripe_webhook_events (
  stripe_event_id text primary key,
  event_type text not null,
  received_at timestamptz not null default now()
);

alter table public.stripe_webhook_events enable row level security;

revoke all on public.stripe_webhook_events from anon, authenticated;

grant select on public.stripe_webhook_events to service_role;
grant insert on public.stripe_webhook_events to service_role;
