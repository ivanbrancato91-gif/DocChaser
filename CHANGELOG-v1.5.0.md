# DocChaser v1.5.0 — AI Review Automation

- Centralized document-analysis service.
- Batch AI analysis for a practice, capped at 5 documents per execution.
- AI jobs persisted in `ai_jobs` with running/completed/failed states.
- AI extraction prompt now explicitly avoids acceptance/rejection decisions and only supports human review.
- Case detail adds an “Analizza pratica con AI” action and result summary.
- Existing per-document analysis remains available.

> The Supabase migration must be applied to the connected project before the new batch AI endpoint is used.
