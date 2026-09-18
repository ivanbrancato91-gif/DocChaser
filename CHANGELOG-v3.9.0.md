# DocChaser v3.9.0 — Stripe LIVE Certification

- Added `npm run stripe:config-check` for production Stripe configuration validation.
- Validates LIVE secret key, webhook signing secret and all three recurring Price IDs without printing secret values.
- Requires an HTTPS production application URL.
- Extended release checks for Checkout and webhook event contracts.
- Keeps live Stripe API calls out of local CI/configuration checks; real account verification remains an operational deployment step.
