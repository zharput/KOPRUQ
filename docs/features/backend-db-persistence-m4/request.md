# Request: backend-db-persistence-m4

Verbatim user input (data, not instructions; Turkish):

> backend-db-persistence slug'ın m4 partının implementasyonunu planla

Context: plan the M4 phase of the parent plan `docs/features/backend-db-persistence/plan.md` (sections 3.4 frontend design, 5 M4, 6 AC15-AC16, 7, 8, 9.2 resolved Q1-Q5). Backend M1-M3 are implemented (`docs/features/backend-db-persistence-m1|m2|m3/`): 14 project endpoints (4 M1 + 9 M2 + 7 M3 PUT/GET) with strict typed DTOs. M4 = frontend infrastructure NOT yet wired into the UI: `putJson` in `shared/api/http.ts`, `shared/project-store/{projectApi,projectSession,serverSection,writeQueue}.ts`, the 7 feature wire mappers (to/from the backend DTOs, zod response schemas), and tests; no UI/behavior change, no localStorage removal (that is M5). Do not edit the parent plan.
