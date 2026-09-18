# DocChaser v3.8.0 — Supabase Production Verification

## Included
- Read-only production schema verification SQL for the LIVE Supabase project.
- Verification of required tables, RLS, organization subscription uniqueness, helper functions and private Documents storage configuration.
- Policy/function audit queries for production review.
- Migration inventory check via `npm run supabase:schema-check`.
- No secrets are stored or printed.

## Important
The SQL verification is intentionally read-only. It must be executed in the Supabase SQL Editor against the LIVE project to certify the deployed database. This release does not claim that the live project was modified or verified from ChatGPT.
