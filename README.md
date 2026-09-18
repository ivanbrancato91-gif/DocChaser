# DocChaser

Version: 1.0.6-mobile-pwa

DocChaser is a SaaS for professional firms to collect client documents through secure case links, private storage and human-reviewed AI assistance.

## Stack
Next.js App Router · React · TypeScript · Tailwind · Supabase · Stripe · OpenAI · Zod · Vitest · Playwright

## Security
- Private `documents` bucket, 20 MB limit and PDF/JPEG/PNG allow-list.
- Server-side secret key only; never expose Supabase secret/service role, OpenAI or Stripe secrets to the browser.
- Upload endpoint validates consent, size, MIME and basic magic bytes.
- Client portal tokens are hashed in the database and expire/revoke server-side.
- AI is advisory only and never accepts/rejects files automatically.
- Malware quarantine/scanning is a launch blocker until a real scanner is configured.

## Implemented end-to-end flows
- Registration/login through Supabase Auth.
- Workspace bootstrap: first authenticated user gets an organization; default checklist templates are created automatically.
- New case: real client/template selection, optional client creation, secure 30-day portal token, case items, audit events and Resend invitation.
- Client portal: real PDF/JPEG/PNG file picker connected to `/api/upload`; progress and completion state are persisted server-side.
- Upload: private storage, 20 MB limit, MIME + magic-byte validation, case-item validation, document row, audit event and automatic case completion when all required items are uploaded.
- `/api/ai/analyze`: authenticated organization members only; downloads a private document server-side and sends it to OpenAI Responses API for advisory classification using Structured Outputs. It never accepts/rejects a document automatically.
- `/api/email/send`: server-side Resend delivery with validated recipient, subject and HTML.
- `/api/stripe/checkout`: subscription Checkout Session creation from configured monthly Price IDs in Stripe live mode. The server derives the organization from the authenticated user and propagates organization/plan metadata to the Stripe subscription.
- `/api/stripe/webhook`: verifies Stripe signatures, rejects stale/replayed signatures, records event IDs for idempotent processing and synchronizes subscription/payment state into Supabase.

## Environment
Copy `.env.example` to `.env.local` and fill the provider secrets. Never commit `.env.local`.

## Local development
```bash
npm install
npm run dev
```

## Verification
```bash
npm run typecheck
npm run test
npm run e2e
```

The source package does not include `node_modules`; automated typecheck/test/e2e require dependency installation in the deployment environment.

## Stripe
Stripe live mode is enabled for the production build. Configure the three monthly Price IDs and the live webhook signing secret. Create the DocChaser Starter (€19/month), Studio (€39/month) and Team (€79/month) recurring prices in Stripe and place their IDs in the server environment variables.

## Supabase
Project: `qbjpavqjndnamygldchv` in `eu-west-1`. The connected project already has the private `documents` bucket configured with a 20 MB limit and PDF/JPEG/PNG allow-list, and organization membership RLS has been hardened.

## Reminder automation
Le pratiche create generano un reminder iniziale dopo 24 ore, poi ogni 48 ore fino a 3 invii o 30 giorni. `POST /api/reminders/process` è protetto da `CRON_SECRET` e può essere invocato da Supabase Cron/pg_net quando l'app è deployata. Supabase supporta pg_cron per job ricorrenti e pg_net per chiamare endpoint HTTP/Edge Functions. 

## Workflow AI e revisione umana
- Analisi documenti tramite OpenAI Responses API con output strutturato.
- L'AI classifica, estrae campi e segnala anomalie ma non approva/rifiuta.
- L'operatore può approvare oppure richiedere correzione.
- Le decisioni aggiornano `documents`, `case_items`, stato pratica e audit log.
- Una richiesta di correzione può inviare automaticamente un'email via Resend se configurato.
- Una pratica viene considerata completata solo quando tutti gli elementi obbligatori risultano verificati.

## Dashboard operativa e reminder automatici

La dashboard usa dati reali da Supabase per coda operativa, verifiche, correzioni, scadenze, attività e reminder. Il processo reminder richiede `CRON_SECRET` e deve essere invocato da un job server-side. Supabase Cron può eseguire funzioni SQL o richieste HTTP ricorrenti; per un endpoint HTTP applicativo è possibile usare `pg_cron` + `pg_net`. Vedi la documentazione ufficiale Supabase Cron.

Esempio di schedule HTTP da configurare in produzione: ogni ora, verso `/api/reminders/process`, con header `Authorization: Bearer <CRON_SECRET>`. Non inserire il segreto nel client/browser.

## Production polish
- Billing now derives the organization from the authenticated session; the browser no longer needs to submit an organization UUID.
- Billing status is shown from `subscriptions`, with Stripe Customer Portal support in live mode.
- Organization settings are persisted to Supabase and restricted to the owner.
- `CRON_SECRET` is required for scheduled reminder processing.
- The included billing hardening migration adds a unique organization constraint for subscriptions.

Production security still requires keeping Supabase secret/service-role credentials server-side and validating RLS/grants for every exposed table. Supabase recommends RLS plus least-privilege grants for exposed data. 


## Release 1.0.6
- Mobile navigation is now a real slide-out menu with backdrop, close action and automatic route close.
- Tables remain usable on narrow screens through horizontal scrolling instead of breaking the page layout.
- Header/search/profile controls are optimized for phone widths down to 320px.
- Added a production-safe PWA manifest, viewport metadata and app icon so DocChaser can be added to a phone home screen as a standalone web app.
- No offline cache was added: private SaaS data is intentionally not cached by a service worker.

## Release 1.0.4
- Reminder processing now fails closed when `CRON_SECRET` is missing; the endpoint can no longer be called anonymously in an unconfigured environment.
- Generic server-side email sending now requires an authenticated Supabase session.
- Stripe Checkout uses a short idempotency bucket to prevent rapid duplicate sessions from double-clicks.
- Public health responses no longer disclose which private providers are configured; API responses are marked `no-store`.
- Production security headers are retained globally while API routes explicitly disable caching.

## Release 1.0.2
- Retry-safe Stripe webhook idempotency ledger with processing/failed states.
- Security headers enabled at the Next.js layer.
- Portal pages forced dynamic and no longer serialize client email to the browser.
- Constant-time comparison for public portal token hashes.
- Existing active subscriptions cannot create duplicate Checkout subscriptions; plan changes go through Customer Portal.


## v1.0.4 completion notes
- Persisted template management via `/api/templates`; the Templates screen now reads/writes Supabase instead of local-only demo state.
- Operator header uses the authenticated profile instead of hard-coded demo identity.
- Stripe webhook concurrency protection rejects fresh duplicate processing and can reclaim stale processing records.
- Billing API no longer returns the Stripe customer identifier to normal workspace members.
- Upload object names no longer duplicate file extensions.


## v1.0.7 release hardening
- Added password recovery flow using Supabase email recovery + PKCE callback.
- Added same-origin protection and lightweight abuse throttling to sensitive browser APIs.
- Registration now requires server-side Supabase configuration before creating accounts and uses a 12-character minimum password.
- Fixed public marketing copy so it no longer advertises a free trial.
- Improved mobile forms for new-case and team screens.


### v1.0.7 — Production security pass
- Private application routes require an authenticated Supabase session before rendering.
- Uploads reject oversized HTTP bodies before multipart parsing and have a request limit.
- AI analysis has a server-side burst limit.
- Generic email sending is restricted to owner/admin users and known clients in the same organization.
- Reminder sends use an optimistic concurrency guard.
- Public marketing CTAs no longer point unauthenticated visitors at the private dashboard.


## v2.2.0
Dashboard operativa e centro notifiche.


## v2.9.0 — Release Candidate
- Production readiness endpoint: `/api/health/ready`.
- Node 20 runtime policy and npm engine enforcement.
- Centralized environment readiness checks without exposing secrets.
- Next.js powered-by header disabled.

## v3.0.0 Launch Edition

DocChaser is now packaged with a public commercial landing, pricing, feature and FAQ pages, legal navigation, and a separated public/authenticated shell.


## v3.1.0 — Production Operations
This release closes private-route middleware gaps, isolates the client portal from the internal app shell, and keeps authentication/tokenized portal URLs out of the public sitemap.


## v3.2.0 — Production Launch
Pricing-to-registration continuity, billing checkout feedback, and final launch-flow polish.

## v3.4.0 — Go-Live Observability

The production release includes a minimal public health check, a non-leaking readiness check, and a protected diagnostics endpoint for operational troubleshooting. Detailed environment checks are available only to requests authenticated with `CRON_SECRET`.


## v3.5.0 — Production Security & Monitoring
Request IDs, bounded in-memory rate-limit state, hardened response headers, and protected operational routes.

## v3.6.0 — End-to-End Production QA

The release includes route smoke coverage, protected-route redirect coverage, health/readiness contract checks, and a deployment smoke command. Run `SMOKE_BASE_URL=https://your-deployment.example npm run smoke:prod` against a deployed instance.

## v3.7.0 — Production environment audit

Run `npm run env:audit` locally to inspect which production variables are configured without printing their values. For CI enforcement, use `CI=true npm run env:audit`.

Required core variables: Supabase URL, Supabase publishable key, Supabase secret key. Production providers: Stripe LIVE + webhook + three Price IDs, Resend, OpenAI and CRON secret. `NEXT_PUBLIC_APP_URL` must be HTTPS in production.

## v3.8.0 production database verification
Run `npm run supabase:schema-check` to verify the repository migration inventory. For the live database, run `supabase/production_verification.sql` in the Supabase SQL Editor; it is read-only and reports missing production contracts without exposing secrets.

## v3.9.0 — Stripe LIVE Certification

Use `npm run stripe:config-check` in the production environment to validate the required Stripe LIVE configuration without exposing secret values. The check validates the LIVE secret key, webhook signing secret, Starter/Studio/Team recurring Price IDs and HTTPS application URL. It intentionally does not make live Stripe API calls.

## v4.0.0 — Real Production Launch Certification
This release adds a safe launch-certification harness and production runbook. It validates the complete application contract without automatically creating a live Stripe charge.
