# DocChaser v3.7.0 — Environment & Secrets Audit

- Added `npm run env:audit` for production environment validation.
- Separates core Supabase configuration from production provider configuration.
- Validates Supabase URL shape, HTTPS application URL and LIVE Stripe key mode.
- Verifies every documented production variable exists in `.env.example`.
- Never prints secret values.
- CI can enforce a complete production environment with `CI=true npm run env:audit`.
- Updated release checks to v3.7.0.

This release does not contain credentials and does not mutate external services.
