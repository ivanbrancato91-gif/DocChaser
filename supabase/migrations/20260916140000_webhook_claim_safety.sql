-- Safer Stripe webhook claiming: received_at doubles as the processing heartbeat/start time.
alter table public.stripe_webhook_events
  alter column received_at set default now();

create index if not exists stripe_webhook_events_processing_idx
  on public.stripe_webhook_events (received_at)
  where status = 'processing';
