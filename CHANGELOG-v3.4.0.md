# DocChaser v3.4.0 — Go-Live Observability

- Public health endpoint now reports service version and timestamp without configuration details.
- Public readiness endpoint no longer exposes individual environment/provider configuration flags.
- Added protected `/api/health/details` diagnostics endpoint using `Authorization: Bearer $CRON_SECRET`.
- Release checks now validate the operational health contracts and credential-safety rules.
- Global error and not-found recovery UI aligned with the current design system.
