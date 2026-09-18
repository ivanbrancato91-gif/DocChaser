# DocChaser v2.0.0 — Admin & Team

- Team management now supports owner, administrator and collaborator roles.
- Owners can add existing DocChaser users as administrators or collaborators.
- Owners can change collaborator/admin roles without changing ownership.
- Owners can remove non-owner members.
- Self-removal and owner role changes are blocked server-side.
- Team mutations are protected by same-origin checks, authentication and organization scoping.
- Team changes create audit events: `team.member_added`, `team.member_role_changed`, `team.member_removed`.
- Non-owners retain read-only team access.
- Updated Team UI with role controls and member actions.
