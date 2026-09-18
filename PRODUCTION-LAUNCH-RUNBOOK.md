# DocChaser v4.0.0 — Production Launch Runbook

## Safe certification order
1. Run `npm run release:check`.
2. Run `npm run env:audit` with the production environment variables.
3. Run `npm run supabase:schema-check` against the production database.
4. Run `npm run stripe:config-check` without creating a charge.
5. Run `npm run launch:certification`.
6. Run `npm run smoke:prod` against the deployed HTTPS URL.
7. Perform one controlled account test using a real mailbox. Do not automate a live Stripe charge.
8. Verify one complete document workflow manually: client → case → checklist → upload → review → portal.

## Required production variables
See `.env.example`. Secrets must be configured in Vercel/Supabase, never committed to source control.

## Live Stripe safety
The application requires `sk_live_` for production checkout. A launch certification must verify configuration and webhook delivery before accepting a paid customer, but it must not create an unsolicited live charge.

## Go-live evidence to retain
- Vercel deployment URL and deployment timestamp.
- Supabase schema verification output.
- Stripe webhook delivery evidence.
- Resend delivery evidence.
- OpenAI successful AI-review evidence.
- Screenshot or recording of the end-to-end workflow.
