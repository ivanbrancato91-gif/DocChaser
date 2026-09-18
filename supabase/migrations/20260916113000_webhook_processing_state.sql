-- Make webhook idempotency retry-safe: an event is only considered done after processing succeeds.
alter table public.stripe_webhook_events
  add column if not exists status text not null default 'processed'
    check (status in ('processing','processed','failed'));

alter table public.stripe_webhook_events
  add column if not exists last_error text;

create index if not exists stripe_webhook_events_status_idx
  on public.stripe_webhook_events (status, received_at);
