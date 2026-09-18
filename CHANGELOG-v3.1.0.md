# DocChaser v3.1.0 — Production Operations

## Security routing
- Added authentication middleware coverage for onboarding, security, notifications and reports.
- Prevented unauthenticated access to private operational routes that were previously outside the middleware matcher.

## Client portal isolation
- Public client portal routes now bypass the authenticated application shell.
- Portal links render the dedicated portal experience without exposing the internal sidebar/search UI.

## SEO / indexing
- Sitemap now contains only public marketing and legal pages.
- Authentication and tokenized portal URLs are excluded from indexing.

## Metadata
- Refined the default application description for clearer product positioning.

## Release
- Version bumped to 3.1.0.
- Release check updated to enforce the new version.
