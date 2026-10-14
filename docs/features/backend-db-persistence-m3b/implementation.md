# backend-db-persistence-m3b — implementation report

**Status: implemented** (plan sha256 `fd0cc8dab1878c9c9da7077e8db89d89a680ab5dcbd2867ce3a2d2a5a6f1d9f5`, baseline HEAD `208dceab0a7f55cf3354e25b5ca1ea6d0440cddb`).

Source: feature-implementer handoff. Coordinator independently re-ran: backend `mvn -f backend/pom.xml -B clean package` (JDK 21 + Maven 3.9.16 wrapper) → BUILD SUCCESS, 732 tests, 0 failures, 0 errors, 1 skipped (pre-existing `BentleyProductionTerrainTest`); frontend `npm run build` exit 0, `npm run lint` exit 0, `npm test` 119 files / 1187 tests passed. Also confirmed: `git status` for `backend/pom.xml`, `frontend/package.json`, `package-lock.json` is empty; the migration directory shows only the new untracked V6 file (V1–V5 untouched); `grep WindSnapshotInputsValue frontend/src` returns 0 hits.

## Test baselines (measured by the implementer before editing)
- Backend: 720 tests / 1 skipped → 732 / 1 (+12).
- Frontend: 119 files / 1185 tests (not the 1184 given earlier) → 119 files / 1187 tests (+2, no new test file).

## Summary
The calculated wind result is now persisted with its inputs (user decision 2026-10-14), as typed relational columns, no JSON blob. Controllers stay 16, endpoints 41.
- `bridge.enums.WindResultStatus {VALID, INVALID}` (separate from `loads`; `bridge` must not import `loads`) and `bridge.model.WindSnapshotResult` (12-field record; structural invariants only: required status, nine finite doubles, `transverseKNm` finite-or-null; `missing` unchecked).
- `WindSnapshot` is a 4-component record with nullable `result` (no 3-arg convenience constructor).
- `V6__wind_snapshot_result.sql`: `result_present BOOLEAN NOT NULL` (back-filled FALSE for existing rows, V3 pattern) + `result_status`, `result_z0_m`, `result_zmin_m`, `result_kr`, `result_cr`, `result_vm_m_s`, `result_turbulence_intensity`, `result_qp_kn_m2`, `result_b_over_d`, `result_cfx`, `result_transverse_kn_m`, `result_missing`; each `ADD COLUMN` is its own statement; no DEFAULT/CHECK.
- `WindSnapshotEntity` maps the columns inline; `toDomain` throws `IllegalStateException` when `result_present` and the columns disagree (both directions) and re-checks invariants via the model constructor.
- `LoadInputDtos.WindSnapshotResultDto` + `WindSnapshotDto.result`; `LoadInputMapper` validates the result with the `before`-count pattern (`value.result.<field>`: "is required", "must be a finite number", "must be one of: VALID, INVALID"); unknown fields inside `result` → 400 via the strict reader; `result` absent/`null` → stored as no result and returned as explicit `null`.
- Frontend (still unwired): `loadsWire.ts` gains `windResultWireSchema` (strict) and a required-but-nullable `result`; `toWire`/`fromWire` carry the 12 fields in order; the section value type is `WindCalculationSnapshot`; `WindSnapshotInputsValue` removed; `projectDocument.ts` and the canonical fixture updated.
- Docs: `architecture.md` exception sentence at the "Not persisted: computed results" line, "superseded by M3b" notes at the listed M3/M4 lines, new "BACKEND-DB-PERSISTENCE M3b (2026-10-14)" section; `roadmap.md` M3b item after M5b.

## Files
**Created:** `backend/src/main/java/com/kopruq/bridge/enums/WindResultStatus.java`; `backend/src/main/java/com/kopruq/bridge/model/WindSnapshotResult.java`; `backend/src/main/resources/db/migration/V6__wind_snapshot_result.sql`; `backend/src/test/java/com/kopruq/bridge/infra/persistence/V6MigrationTest.java`.
**Modified (backend main):** `bridge/model/WindSnapshot.java`, `bridge/infra/persistence/WindSnapshotEntity.java`, `bridge/api/LoadInputDtos.java`, `bridge/api/LoadInputMapper.java`.
**Modified (backend test):** `bridge/LoadGraphFixtures.java`, `bridge/model/LoadGraphSectionsTest.java`, `bridge/infra/persistence/JpaLoadGraphContentTest.java`, `contract/ProjectLoadGraphApiContractTest.java`.
**Modified (frontend):** `features/loads/model/loadsWire.ts`, `loadsWire.test.ts`; `app/project-session/projectDocument.ts`, `projectDocumentFixtures.ts`, `projectDocument.test.ts`.
**Modified (docs):** `docs/architecture.md`, `docs/roadmap.md`.
Line endings: the edit tool strips CRs, so every touched file was re-normalised to CRLF (each was CRLF originally; new files are CRLF too).

## Commands run (implementer)
- Focused backend: `mvn … clean test -Dtest=LoadGraphSectionsTest,JpaLoadGraphContentTest,V6MigrationTest,V3MigrationTest,ProjectLoadGraphApiContractTest,EndpointInventoryContractTest,ArchitectureTests` — 175 tests, 0 failures.
- Mandatory backend: `mvn -f backend/pom.xml -B clean package` — 732 tests, 0 failures, 1 skipped, BUILD SUCCESS.
- Focused frontend: `npx vitest run src/features/loads/model/loadsWire.test.ts src/app/project-session` — 12 files / 119 tests.
- Mandatory frontend: `npm run build` (usual chunk-size warning only), `npm test` 119 / 1187, `npm run lint` exit 0 (existing `GraphWorkspace.tsx` warnings only).
Not run: the optional PostgreSQL run (needs Docker); V6 and the `@Enumerated` mapping are verified on H2 (PostgreSQL mode) only.
Re-run by the coordinator: backend package, frontend build/test/lint — same results.

## Acceptance criteria
| AC | Evidence | Met |
|---|---|---|
| AC1 | `V6MigrationTest`: a V5 row gets `result_present=false` with all 12 `result_*` null; insert without `result_present` fails (NOT NULL); only V6 is new under the migration dir | Yes (H2) |
| AC2 | `windSnapshot_storesAndReturnsTheResult_inKeyOrder` (top-level and result key order, deep equality, DB flag), `windSnapshot_invalidResult_roundTrips`; parametrised round-trip/second-write/stale-revision tests on the new `WIND_SNAPSHOT` fixture (decimal doubles) | Yes |
| AC3 | `windSnapshot_resultNullOrAbsent_isStoredAsNull` (null and REMOVE): 200, `"result": null` in response and document, `result_present=false`, result columns null | Yes |
| AC4 | `windSnapshot_unknownFieldInResult_isRejected`, `windSnapshot_resultStatusMustBeKnown`, `windSnapshot_resultNumbersRequiredAndFinite` (nine fields absent/null; `qpKNm2` and `transverseKNm` at `1e999`), `value.result.cr` overflow case in `put_overflowingNumbers…`; `assertRejected` checks DB state and document unchanged | Yes |
| AC5 | `windSnapshot_noConsistencyRule`, `LoadGraphSectionsTest.windSnapshotResult_isStructuralOnly`; V6 has no DEFAULT/CHECK; `ArchitectureTests` (23) and `EndpointInventoryContractTest` green (16 controllers / 41 endpoints); pom/package.json diff empty | Yes |
| AC6 | `JpaLoadGraphContentTest` (24 tests): round trip with/without result and INVALID, `windSnapshot_replaceWithAndWithoutResult`, `windSnapshot_numbersAreBitIdentical`, `windSnapshot_hasTypedResultColumns`, `windSnapshot_presentWithNullRequiredColumn_isCorruptData`, `windSnapshot_absentWithResultColumn_isCorruptData` | Yes |
| AC7 | `loadsWire.test.ts`: T→W→T for VALID/INVALID/null, `toWire` key order, legacy object without `result` → `null`, strict rejections, `{…, result: null}` accepted; `projectDocument.test.ts` byte-exact canonical/null/INVALID; `WindSnapshotInputsValue` 0 hits; unwired/noBrowserStorage/sourceEncoding green | Yes |
| AC8 | backend and frontend checks green (also by coordinator); docs updated | Yes |

## Pre-existing tests whose expectation was reversed (as the plan lists)
- `JpaLoadGraphContentTest.windSnapshot_storesNoResult` → `windSnapshot_hasTypedResultColumns`.
- `ProjectLoadGraphApiContractTest`: `windSnapshot_storesAndReturnsExactlyThreeKeys_andNoResult` → `windSnapshot_storesAndReturnsTheResult_inKeyOrder`; `windSnapshot_resultIsNotAKnownField` split into `windSnapshot_resultNullOrAbsent_isStoredAsNull` and `windSnapshot_unknownFieldInResult_isRejected`; the `WIND_SNAPSHOT` fixture now includes a result.
- `LoadGraphSectionsTest`: four `new WindSnapshot(…)` calls got `, null` (compile-only; same expectations).
- `loadsWire.test.ts`: "drops result" → "keeps the result…"; status-omit test uses `WindCalculationSnapshot` with `result: null`; strict-schema test no longer rejects `result: null` and adds the new rejections.
- `projectDocument.test.ts`: canonical `loads.windSnapshot` expectation now includes the result.

## Deviations from the plan
None. The wire shape, column names, K1–K12 and the V6 SQL are as specified. `InMemoryProjectContentRepository`, `fakeProjectApi.ts`, `projectSections.ts` and `loadsServerSections.ts` compiled unchanged.

## Limitations / notes
- PostgreSQL not exercised (H2 PostgreSQL mode only); an optional `postgres-test` run is recommended before merge.
- Accepted risk R2: no calculation version is stored; validity is decided at read time by comparing stored inputs with current inputs (STALE).
- Prerequisite satisfied for the wind part of M5c; M5c wiring is not part of this feature. No independent review has run.
