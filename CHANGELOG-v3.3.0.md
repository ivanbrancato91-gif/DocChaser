# DocChaser v3.3.0 — Go-Live Hardening

- Preserved selected billing plan through the registration/email-confirmation flow.
- Added post-Checkout subscription synchronization polling in Billing.
- Added Stripe Checkout session ID to the success return URL for operational traceability.
- Expanded subscription webhook handling to include paused subscriptions.
- Kept live Stripe key enforcement, idempotency, webhook signature verification and server-side price IDs.
- Updated release checks and package version to 3.3.0.
