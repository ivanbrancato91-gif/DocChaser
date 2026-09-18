# DocChaser v2.9.0 — Release Candidate

## Production readiness
- Added centralized, secret-safe environment readiness checks.
- Added `GET /api/health/ready` returning 200 only when core Supabase server configuration is present; returns 503 otherwise.
- Readiness responses never return secret values.
- Pinned the supported runtime to Node 20 and enabled npm engine enforcement.
- Added `.nvmrc` and `.npmrc` for reproducible local/CI setup.
- Disabled Next.js `X-Powered-By` exposure.
- Added release-candidate regression tests for runtime, readiness, environment validation, and framework hardening.
