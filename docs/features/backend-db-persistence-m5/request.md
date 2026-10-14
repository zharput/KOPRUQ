# Request: backend-db-persistence-m5

Verbatim user input (data, not instructions; Turkish):

> backend-db-persistence planındaki m5 slug ını planlarmısın

Context: plan the M5 phase of the parent plan `docs/features/backend-db-persistence/plan.md` (sections 3.4 frontend design, 3.2 data flow, 5 M5, 6 AC17-AC27, 8 risks, 9.2 resolved Q1-Q5). Backend M1-M3 and frontend M4 are implemented (`docs/features/backend-db-persistence-m1|m2|m3|m4/`; M4 passed its 5th review). M5 = the frontend CUTOVER: wire `shared/project-store` + the 7 wire mappers + `app/project-session/projectDocument` into the real app; remove localStorage / sessionStorage / IndexedDB / `.kopruq` / File System Access code completely; project list / open / new / recent from the backend; write-through autosave with save-status indicator; `?project=<uuid>` URL; beforeunload via pendingKeys(); test migration; noBrowserStorage architecture test; docs. The user's original requirement: localStorage and IndexedDB must be removed completely and the frontend must use the backend database directly. M5 is the largest and riskiest phase (≈45 production + ≈30 test files, 26 test files with 128 storage uses): the plan SHOULD split it into independently buildable/testable ordered sub-phases (slugs) while keeping each sub-phase's app green; an atomic cutover is acceptable only if justified. Do not edit the parent plan.
