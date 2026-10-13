# backend-db-persistence-m1 — implementation report

**Status: implemented** (plan sha256 `c248b49c6ca1faa0846f2cd91f28d085ea087b57afb91981e7d2e93d504f314a`, baseline HEAD `25802877aa8ea49fbfb0dc9067e220156eac8db8`).

Source: feature-implementer handoff. Coordinator independently re-ran `mvn -f backend/pom.xml -B clean package` → BUILD SUCCESS, 456 tests, 0 failures, 0 errors, 1 skipped (pre-existing `BentleyProductionTerrainTest`), and confirmed via `git status`/`git diff --stat` that `backend/pom.xml` and `frontend/` are unchanged.

## Environment
- `mvn` not on PATH; Maven 3.9.16 from the wrapper cache `C:\Users\cemha\.m2\wrapper\dists\apache-maven-3.9.16\0daed3be…\bin` with JDK 21.0.11 (`C:\Program Files\Eclipse Adoptium\jdk-21.0.11.10-hotspot`). Default `java` is JDK 26, so `JAVA_HOME` must point at JDK 21.
- Helper `check` passed before editing and at handoff (`approval_matches: true`).

## Commands run (implementer)
1. Targeted `mvn … test -Dtest=ProjectTest,ProjectWorkspaceTest,ProjectServiceTest,ProjectServiceIntegrationTest,JpaProjectRepositoryTest,JpaProjectContentRepositoryTest,V3MigrationTest,ProjectApiContractTest,ApiExceptionHandlerTest,LayoutKernelCorsContractTest,EndpointInventoryContractTest,ArchitectureTests` — first run 117 tests / 1 failure (own tie-ordering test mistake, fixed).
2. `mvn … package` — one run failed with stale-incremental-compilation errors (not a code problem).
3. `mvn … clean package` ×2 (before and after docs edits) — BUILD SUCCESS, 456 tests, 0 failures, 0 errors, 1 skipped.

Not run: PostgreSQL run (`postgres-test` compose profile, needs Docker; optional in plan); frontend npm checks (not required for M1).

## Files
**Modified (main):** `bridge/model/Project.java`, `bridge/application/ProjectRepository.java`, `bridge/infra/persistence/{ProjectEntity,ProjectJpaRepository,JpaProjectRepository}.java`, `bridge/package-info.java`, `shared/config/{CoreConfiguration,WebCorsConfiguration}.java`, `shared/exception/ApiExceptionHandler.java`, `docs/architecture.md`, `docs/roadmap.md` (appended sections only).

**New (main, under `backend/src/main/`):** `resources/db/migration/V3__project_workspace.sql`; `shared/exception/{ResourceNotFoundException,RevisionConflictException}.java`; `bridge/model/{ProjectSection,ProjectWorkspace,ProjectInfo,BridgeInventoryRow}.java`; `bridge/enums/{BridgeInventoryType,InventoryPierShape}.java`; `bridge/application/{ProjectService,ProjectContentRepository,ProjectSummary,ProjectContent,ProjectDocument,ProjectRevision}.java`; `bridge/infra/persistence/{ProjectInfoEntity,ProjectBridgeRowEntity,ProjectInfoJpaRepository,ProjectBridgeRowJpaRepository,JpaProjectContentRepository}.java`; `bridge/api/{ProjectController,ProjectRequestReader,ProjectWorkspaceMapper,WorkspaceDto,CreateProjectRequest,WorkspacePutRequest,ProjectSummaryResponse,ProjectDocumentResponse,WorkspaceWriteResponse}.java`.

**Modified tests:** `ArchitectureTests` (13 controllers), `EndpointInventoryContractTest` (25 endpoints), `LayoutKernelCorsContractTest` (`GET,POST,PUT,HEAD`, renamed DELETE test, 3 new preflight cases), `ProjectTest` (+4 revision tests), `JpaProjectRepositoryTest`, `ApiExceptionHandlerTest`.

**New tests (under `backend/src/test/java/com/kopruq/`):** `bridge/WorkspaceFixtures`, `bridge/infra/{InMemoryProjectRepository,InMemoryProjectContentRepository}`, `bridge/model/ProjectWorkspaceTest`, `bridge/application/{ProjectServiceTest,ProjectServiceIntegrationTest}`, `bridge/infra/persistence/{JpaProjectContentRepositoryTest,V3MigrationTest}`, `contract/ProjectApiContractTest`.

## Acceptance criteria
| AC | Evidence | Met |
|---|---|---|
| AC1 | `V3MigrationTest` (private H2 migrated to v2, V2 project row inserted, then V3: `revision=0`, `updated_utc=created_utc`, NOT NULL); all Spring tests open context with Flyway + `ddl-auto=validate`; V1/V2 untouched. PostgreSQL variant not run. | Met (H2) |
| AC2 | `ProjectServiceTest.list_isEmptyWithoutProjects`, `list_newestChangeFirst_ties_byProjectId`; `ProjectApiContractTest.list_isNewestChangeFirst_andShowsRenames` | Met |
| AC3 | `ProjectApiContractTest.create_returns201WithLocation_andTheWorkspaceUnchanged` (201, Location, revision 0, createdAt==updatedAt, deep equality incl. null depths, `[]` spans, null env ids, Unicode, `project_name`/`project_code` via JDBC); `JpaProjectContentRepositoryTest` round-trip | Met |
| AC4 | `unknownProject_is404ProjectNotFound_forGetAndPut`, `nonUuidPath_is400InvalidParameter`; `ProjectServiceTest.unknownProject_is404WithCode_forDocumentAndReplace` | Met |
| AC5 | `put_withCurrentRevision_replacesTheWorkspace_rowOrderAddRemoveAndSwap`; `ProjectServiceTest.replace_withCurrentRevision_…` (fixed clock exact time) | Met |
| AC6 | `put_withStaleRevision_is409_andChangesNothing`, `sameRevisionTwice_firstIs200_secondIs409`; `ProjectServiceTest`; `ProjectServiceIntegrationTest.conflict_rollsBack…` | Met |
| AC7 | `ProjectApiContractTest` cases: missing `expectedRevision`, NaN/Infinity/`1e999` at `value.bridges[0].estimatedLengthM` / `…spansM[1]`, duplicate and blank id, unknown `bridgeType`/`pierShape`, missing `value.project.units.length`, unknown fields (`is not a known field`), malformed JSON → `MALFORMED_REQUEST_BODY`, invalid POST with `workspace.` prefix creates no project row; PUT cases assert DB unchanged | Met |
| AC8 | `ProjectApiContractTest.corsPreflight_forPut_…` (200 `GET,POST,PUT,HEAD`; 403 other origin; 403 DELETE); `LayoutKernelCorsContractTest` | Met |
| AC9 | `ProjectServiceIntegrationTest.workspacePut_keepsBridgeDesignSpaceAlternativesAndSelection` | Met |
| AC10 | `ArchitectureTests` (23 tests) with 13 controllers, edge maps unchanged; `EndpointInventoryContractTest` 21+4=25 | Met |
| AC11 | `ApiExceptionHandlerTest.resourceNotFound_is404_withTheCodeOfTheException`, `revisionConflict_is409_withBothRevisionsInTheMessage` (8 body keys) | Met |
| AC12 | `ProjectWorkspaceTest` (9 tests), `ProjectTest` | Met |
| AC13 | `mvn -f backend/pom.xml -B clean package` BUILD SUCCESS (also re-run by coordinator); pom/frontend unchanged; docs updated | Met |

## Deviations from the plan
1. Column `project_bridge_row.no` named `inventory_no` from the start (plan allowed rename only on H2 error; chosen up front to avoid reserved-word risk; entity matches).
2. PUT response `value` built via `toDto` from the validated model just stored (identical result, one query fewer).
3. `JpaProjectContentRepository.load` reads project name through new package-private `ProjectEntity.getProjectName()`.
4. PUT validation reports a missing `expectedRevision` together with any `value` violations in one 400.
5. Bridge model/enums import `shared.exception.RevisionConflictException` (permitted by architecture rules; `ArchitectureTests` green).

## Limitations / remaining work
- PostgreSQL compatibility of V3 and the pessimistic lock validated only on H2 in PostgreSQL mode; `V3MigrationTest` is always H2.
- No concurrency test and no dedicated mid-write rollback test (accepted in plan); `ProjectServiceIntegrationTest.conflict_rollsBack…` covers the rejected-write path.
- Strict unknown-field rejection applies only to the project endpoints.
- Contract tests share the committed H2 database and assert only on projects they create.
- M2–M5 (other sections, frontend client and cutover) not started.
- Not reviewed: no independent review has run.
