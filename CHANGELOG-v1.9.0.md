# DocChaser v1.9.0 — Client Portal 2.0

- Client portal shows practice status, due date and document progress.
- Correction-requested documents are clearly highlighted.
- Added secure portal messaging between client and authorized staff.
- Added staff-side message thread in the case detail.
- Portal message APIs validate the hashed portal token and expiry/revocation.
- Added rate limiting and audit/notification events for messages.
- Added Supabase migration `20260917150000_portal_messages.sql`.
