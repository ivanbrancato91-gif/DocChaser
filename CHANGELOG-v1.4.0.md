# DocChaser v1.4.0 — Secure document management

## Added
- Secure authenticated signed URLs for opening documents.
- Staff-only document replacement with server-side MIME and magic-byte validation.
- Document version history persisted in `document_versions`.
- Replacement automatically resets AI analysis and document review status.
- Audit event `document.replaced` records replacement metadata.
- Case detail UI now supports Open, Replace and History actions.

## Security
- Private Storage remains private; files are never exposed through public URLs.
- Signed download links expire after 10 minutes.
- Replacement is limited to authenticated members of the document organization.
- Existing 20 MB and PDF/JPEG/PNG restrictions remain enforced.
