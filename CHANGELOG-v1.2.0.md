# DocChaser v1.2.0

## Implemented
- Production-ready Clienti module with real Supabase-backed CRUD.
- Create client modal with validation.
- Edit client modal.
- Soft-delete protection: clients with linked cases cannot be deleted.
- Live client search by name/email.
- Client list now shows contact, case count and creation date.
- Client detail API extended with PUT/DELETE endpoints.
- Mobile-responsive client forms and modal.
- Removed Blue Harbor Studio branding from the application shell.
- Version bumped to 1.2.0.

## Notes
- No new database migration is required for this release.
- Existing `clients` fields used by the current schema are preserved.
- Vercel/Supabase environment variables remain unchanged.
