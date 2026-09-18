# DocChaser v1.6.0 — Communication Center

- Added customer communication actions directly inside a case.
- Predefined messages: portal, missing documents, correction request, completion.
- Customer-facing messages use a fresh random 30-day portal token when a portal link is needed.
- Sends are recorded in notifications and audit events.
- Communication endpoint requires an authenticated owner/admin and applies same-origin and rate-limit protections.
- HTML values are escaped before being inserted into email bodies.
