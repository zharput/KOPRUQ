# backend-db-persistence-m3 — implementation report

**Status: implemented** (plan sha256 `823f422d1fa78e91a8d75004fdcb06a17d04f8be019ddb1ff03da131bd2e86db`, baseline HEAD `dad0b80ef21e061385fef41f611c5d0ab74ef622`).

Source: feature-implementer handoff. Coordinator independently re-ran `mvn -f backend/pom.xml -B clean package` (JDK 21.0.11 + Maven 3.9.16 wrapper) → BUILD SUCCESS, 720 tests, 0 failures, 0 errors, 1 skipped (pre-existing `BentleyProductionTerrainTest`). `git status` confirms `backend/pom.xml` and `frontend/` unchanged and V1–V4 unchanged (only V5 is new under `db/migration`).

## Summary
- `V5__project_loads_graph.sql`: six load tables (seismic, wind, temperature, self-weight, `load_traffic_lm1_factor` with UNIQUE(project, group, index), wind snapshot — inputs only) and `graph_*` tables.
- Enums `ParameterProvenance`, `GraphParameterKind`; model for 6 load sections + `GraphDocument` (17 `ProjectSection` permits); `ProjectLoadInputs`; `ProjectContent` gains `loads` and `graphs` (10-arg constructor kept, `withLoadsAndGraphs`).
- Infra: five 1:1 entities, `TrafficLm1FactorEntity` + `Lm1FactorGroup`, graph entities, `LoadInputContentStore`, `GraphContentStore`; `StoredSection.TRAFFIC_LM1`; `JpaProjectContentRepository` 17-case switch.
- API: `SectionPutFlow` (M2 behaviour unchanged), `ProjectLoadInputController` (6 `PUT`), `ProjectGraphController` (`PUT /graphs/{graphId}` upsert), DTOs, `LoadInputMapper`, `GraphDocumentMapper`; `ProjectDocumentResponse` + `loads`, `graphs`.
- Controllers 14→16, endpoints 34→41. Structural checks only; no engineering rules, defaults or unit conversions.

## Files
**New main (`backend/src/main/`):** `resources/db/migration/V5__project_loads_graph.sql`; `bridge/enums/{ParameterProvenance,GraphParameterKind}`; `bridge/model/{SeismicInputs,WindInputs,TemperatureInputs,SelfWeightInputs,Lm1ParameterValue,Lm1LaneFactor,TrafficLm1Inputs,WindSnapshotInputs,WindSnapshot,SeismicInputsSection,WindInputsSection,TemperatureInputsSection,SelfWeightInputsSection,TrafficLm1Section,WindSnapshotSection,GraphParameterValue,GraphNodeParameter,GraphNode,GraphConnection,GraphGroup,GraphDocument}`; `bridge/application/ProjectLoadInputs`; `bridge/infra/persistence/` (Seismic/Wind/Temperature/SelfWeight/WindSnapshot entities + repositories, TrafficLm1FactorEntity + repository, Lm1FactorGroup, GraphDocumentEntity, GraphNodeEntity, GraphNodeParameterEntity, GraphGroupEntity, GraphConnectionEmbeddable, GraphDocumentJpaRepository, LoadInputContentStore, GraphContentStore); `bridge/api/{SectionPutFlow,ProjectLoadInputController,ProjectGraphController,LoadInputPutRequests,GraphPutRequest,LoadInputDtos,LoadsDto,GraphDtos,LoadInputMapper,GraphDocumentMapper}`.

**Modified main:** `ProjectSection`, `ProjectContent`, `ProjectContentRepository` (javadoc), `StoredSection`, `ProjectSectionPresenceJpaRepository` (javadoc), `JpaProjectContentRepository`, `ProjectDesignSystemController` (delegates to `SectionPutFlow`), `ProjectDocumentResponse`, `bridge/package-info.java`, `docs/architecture.md` (M3 section appended), `docs/roadmap.md` (M3 line → `[x]`).

**New tests:** `bridge/LoadGraphFixtures`, `bridge/model/LoadGraphSectionsTest` (14), `bridge/infra/persistence/JpaLoadGraphContentTest` (19), `contract/ProjectLoadGraphApiContractTest` (105).
**Modified tests:** `ArchitectureTests` (16), `EndpointInventoryContractTest` (41), `LayoutKernelCorsContractTest` (+3 preflight cases), `ProjectApiContractTest` and `ProjectDesignSystemApiContractTest` (12-key GET lists), `InMemoryProjectContentRepository` (17 cases), `JpaDesignSystemContentTest` / `JpaProjectContentRepositoryTest` (`@Import`), `ProjectServiceIntegrationTest` (+3).

## Commands run (implementer)
1. `mvn -f backend/pom.xml -B -q clean compile` — pass.
2. Early targeted runs failed once on H2 `-0.0` normalisation (fixture adjusted) and once on a test-helper bug (fixed).
3. Targeted run of the 12 classes listed in the plan — 323 tests, 0 failures, 0 errors, 0 skipped.
4. `mvn -f backend/pom.xml -B clean package` — BUILD SUCCESS, 720 tests, 0 failures, 0 errors, 1 skipped. Re-run by coordinator with the same result.

Not run: optional PostgreSQL run (`postgres-test`, needs Docker); frontend npm checks (not required for M3).

## Acceptance criteria
| AC | Evidence | Met |
|---|---|---|
| AC1 | V5 applied under Flyway + `ddl-auto=validate` in every context test; V1–V4 untouched; `JpaLoadGraphContentTest.projectWithNothingStored_loadsEveryLoadNull_andNoGraphs` | Yes (H2) |
| AC2 | `EndpointInventoryContractTest` (41), `ArchitectureTests` (16, `bridge` no `loads` import), `LayoutKernelCorsContractTest`, `ProjectLoadGraphApiContractTest.corsPreflight_forEveryM3Put_isAcceptedFromTheViteOrigin` | Yes |
| AC3 | `put_roundTripsDeepEqual_…[seismic|wind|temperature|self-weight|traffic-lm1|wind-snapshot]` (0.30000000000000004, Unicode, empty strings, LM1 nulls, `udl: []`); `JpaLoadGraphContentTest.loadSection_roundTripsEqual` | Yes |
| AC4 | `newProject_hasEveryLoadNull_andNoGraphs`, `create_responseCarriesLoadsAndGraphs`, `put_null_clearsTheLoad_andRaisesTheRevision`, `put_null_onAnEmptyLoad_isAcceptedToo`, `put_missingValueKey_isRejected` | Yes |
| AC5 | `windSnapshot_storesAndReturnsExactlyThreeKeys_andNoResult`, `…_resultIsNotAKnownField`, `…_statusIsOptional_andComesBackNull`, `…_schemaVersionMustBeOne`, `JpaLoadGraphContentTest.windSnapshot_storesNoResult` | Yes |
| AC6 | `lm1_unknownProvenance_listsTheAllowedConstants`, `lm1_requiredPartsAreChecked`, `lm1_emptyListsAndNullValuesComeBackAsWritten_andLabelsMayRepeat`, `lm1_emptyTandemSystem_isWrittenAndReadBackEmpty` | Yes |
| AC7 | `put_roundTripsDeepEqual_…[graph]`, `graph_groupsNullAndEmpty_areDifferent_andOwnerIdsMayBeNull`, `graph_parameterValues_keepTheirBitsAndOrder`, `JpaLoadGraphContentTest.graph_roundTripsEqual_withAllParameterKinds` | Yes |
| AC8 | `graphs_keepCreationOrder_andAnUpsertReplacesInPlace` (A,B,C order kept; child row counts via JdbcTemplate; revision +1), `graphUpsert_withReorderedNodesAndConnections_hasNoUniqueViolation`, `JpaLoadGraphContentTest.graphs_keepCreationOrder_…`, `graphUpsert_deletesRemovedChildRows_…` | Yes |
| AC9 | `graph_pathAndBodyIdMustMatch`, `graph_invalidStructure_isRejectedWithPathsAndChangesNothing`, `graph_duplicateNodeIdMessage_namesTheFirstOccurrence`, `graph_parameterKindAndValueMustAgree`, `graph_schemaVersionMustBeOne`, `graph_uiOnlyFields_areRejected`, `put_nullGraph_isRejected_graphsCannotBeDeleted`, `graph_acceptedOddities_…` | Yes |
| AC10 | parametrised over 7 sections: `put_staleRevision_is409_andChangesNothing`, `put_sameRevisionTwice_firstIs200_secondIs409`, `put_unknownProject_is404`, `put_nonUuidPath_is400InvalidParameter` | Yes |
| AC11 | `put_missingExpectedRevision_isRejected`, `put_unknownField_isRejectedWithItsPath`, `put_overflowingNumbers_areRejectedWithTheirPaths`, `put_nullRequiredFields_areRejectedWithTheirPaths`, `put_malformedJson_isMalformedRequestBody`; DB unchanged in each | Yes |
| AC12 | 12-key GET lists (first 10 original order); `workspaceAndM2Writes_leaveLoadsAndGraphsAlone_andViceVersa`; `m3Writes_leaveWorkspaceAndM2SectionsAlone`; `ProjectServiceIntegrationTest` (+3); all 89 `ProjectDesignSystemApiContractTest` cases pass after the `SectionPutFlow` refactor | Yes |
| AC13 | `engineeringNonsense_isAcceptedAndStoredUnchanged` and fixtures (negatives, zeros, `"abc"`, `"Z"`, negative LM1) | Yes |
| AC14 | `LoadGraphSectionsTest` (14) | Yes |
| AC15 | `clean package` BUILD SUCCESS (also by coordinator); pom/frontend unchanged; architecture.md M3 section; roadmap M3 `[x]` | Yes |

## Deviations from the plan
1. Graph entity mapping style (left to implementer by the plan): bidirectional `@ManyToOne`/`@OneToMany(mappedBy)` with plain index columns and `@OrderBy` for nodes, parameters and groups, to avoid separate INSERTs of NOT NULL FK and order column; connections, parameter items and group members use `@ElementCollection` + `@OrderColumn`. Tables/columns match plan 3.8; no renames.
2. `reference_height` is used by both `load_wind_input` and `load_wind_snapshot` (SQL only, no rename needed).
3. H2 normalises `-0.0` to `0.0` in `DOUBLE PRECISION` (same as M2); graph fixture uses `0.0` in the number array; model-only self-weight test still builds with `-0.0`.
4. `ProjectServiceIntegrationTest` got 3 tests instead of 2 (extra: stale-revision graph PUT writes nothing).
5. Contract tests include parametrised extras beyond the plan minimum (`put_sameRevisionTwice`, `put_nonUuidPath` for all 7 sections; `put_null_onAnEmptyLoad_isAcceptedToo`).

## Limitations / notes for M4/M5
- PostgreSQL compatibility (V5, locks) verified only on H2 in PostgreSQL mode; optional `postgres-test` run recommended before merge.
- Wind snapshot returns no `result`; after reload the frontend must handle `result: null` (e.g. `WindLoadsPanel`).
- A NaN-derived graph parameter becomes JSON `null` on the client and gets a 400.
- The `lm1-defaults` response could leak an extra field into a strict read; the M4 mapper must send only known fields.
- M4 (frontend client) and M5 (cutover) not started. No independent review has run.
