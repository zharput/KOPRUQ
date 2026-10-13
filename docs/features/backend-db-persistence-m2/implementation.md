# backend-db-persistence-m2 — implementation report

**Status: implemented** (plan sha256 `171f21928e57ff8e5a21e0f07b99d03ba4a937cddd9e0b479a8ca32d8bf7cb9b`, baseline HEAD `49f30c4d53656421f95c8257c2267ee3cbfcb103`).

Source: feature-implementer handoff. Coordinator independently re-ran `mvn -f backend/pom.xml -B clean package` (JDK 21.0.11 + Maven 3.9.16 wrapper) → BUILD SUCCESS, 579 tests, 0 failures, 0 errors, 1 skipped (pre-existing `BentleyProductionTerrainTest`). `git status` confirms `backend/pom.xml` and `frontend/` unchanged and V1–V3 migrations unchanged (only V4 is new).

## Summary
- Flyway `V4__project_design_system.sql` (presence table, bridge definition + span/axis/assignment/constraint, pier/pier-cap/foundation/bearing/material families, girder library + dimensions, preferred span rule, cross section).
- 9 sections: enums (7, each with `fromValue`), model (24 files incl. `SectionInvariants`), JPA entities/embeddables/repositories + `DesignSystemContentStore` (27 files), API DTOs/mappers/`ProjectDesignSystemController` (13 files) with exactly 9 `PUT` endpoints.
- `ProjectContent` (10 components + `ofWorkspace`), `ProjectDocument` (`content` + `workspace()`), `ProjectService.create/document`, `JpaProjectContentRepository` (no early return; 10-case switch), `ProjectDocumentResponse` gains `bridgeDefinitions`, `families`, `girderLibrary`, `preferredSpanRules`, `crossSection` after the five M1 keys.
- Controllers 13→14, endpoints 25→34. Structural checks only; no engineering rules, defaults or unit conversions.

## Files
**New main (`backend/src/main/`):** `resources/db/migration/V4__project_design_system.sql`; `bridge/enums/{BridgeAxisType,ConstraintKind,PierFamilyType,PierCapType,PierCapConfiguration,FoundationFamilyType,BearingFamilyType}`; `bridge/model/` (BridgeAxis, AxisFamilyAssignment, BridgeConstraint, BridgeDefinition, BridgeDefinitions, PierFamily, PierFamilyCatalog, PierCapFamily, PierCapFamilyCatalog, FoundationFamily, FoundationFamilyCatalog, BearingFamily, BearingFamilyCatalog, MaterialAssignment, MaterialAssignmentCatalog, GirderLibrary, GirderLibrarySection, PreferredSpanRule, PreferredSpanRulesSection, CrossSectionValues, CrossSectionSection, RangeRule, SweepDimension, SectionInvariants); `bridge/infra/persistence/` (StoredSection, ProjectSectionPresenceEntity+repository, RangeRule/SweepDimension/BridgeAxis/AxisAssignment/BridgeConstraint embeddables, entities+repositories for BridgeDefinition, PierFamily, PierCapFamily, FoundationFamily, BearingFamily, MaterialAssignment, GirderLibrary, PreferredSpanRule, CrossSection, DesignSystemContentStore); `bridge/api/` (ProjectDesignSystemController, DesignSystemPutRequests, SectionWriteResponse, BridgeDefinitionsDto, FamilyDtos, FamiliesDto, GirderLibraryDto, PreferredSpanRuleDto, CrossSectionDto, BridgeDefinitionsMapper, FamilyCatalogMapper, DesignModuleMapper, SectionChecks).

**Modified main:** `ProjectSection`, `ProjectContent`, `ProjectDocument`, `ProjectService`, `ProjectContentRepository` (javadoc), `JpaProjectContentRepository`, `ProjectDocumentResponse`, `bridge/package-info.java`, `docs/architecture.md` (M2 section appended), `docs/roadmap.md`.

**New tests:** `bridge/DesignSystemFixtures`, `bridge/model/DesignSystemSectionsTest` (12), `bridge/infra/persistence/JpaDesignSystemContentTest`, `contract/ProjectDesignSystemApiContractTest` (89 cases).
**Modified tests:** `ArchitectureTests` (14), `EndpointInventoryContractTest` (34), `LayoutKernelCorsContractTest`, `ProjectApiContractTest` (10 keys), `InMemoryProjectContentRepository`, `JpaProjectContentRepositoryTest`, `ProjectServiceIntegrationTest` (+2).

## Commands run (implementer)
1. `mvn -f backend/pom.xml -B -q clean compile` — passed.
2. Targeted `mvn … clean test -Dtest=DesignSystemSectionsTest,JpaDesignSystemContentTest,JpaProjectContentRepositoryTest,ProjectServiceTest,ProjectServiceIntegrationTest,ProjectApiContractTest,ProjectDesignSystemApiContractTest,EndpointInventoryContractTest,LayoutKernelCorsContractTest,ArchitectureTests` — 194 tests, 0 failures.
3. `mvn -f backend/pom.xml -B clean package` — BUILD SUCCESS, 579 tests, 0 failures, 0 errors, 1 skipped. Re-run by coordinator with the same result.
4. `git status --short -- backend/pom.xml frontend` — empty.

Not run: optional PostgreSQL run (`postgres-test`, needs Docker); frontend npm checks (not required for M2).

## Acceptance criteria
| AC | Evidence | Met |
|---|---|---|
| AC1 | V4 applied under Flyway + `ddl-auto=validate` in every Spring context test; V1–V3 untouched; `JpaDesignSystemContentTest.projectWithNothingStored_loadsEveryDesignSectionNull` | Yes (H2) |
| AC2 | `ArchitectureTests` (14), `EndpointInventoryContractTest` (34), `LayoutKernelCorsContractTest`, `ProjectDesignSystemApiContractTest.corsPreflight_forEveryDesignSystemPut_…` (9 paths 200) | Yes |
| AC3 | `put_roundTripsDeepEqual_…` (9 cases; `0.30000000000000004`, Unicode, order, `H_TYPE`/`WALL`, negative/zero/min>max); `JpaDesignSystemContentTest.section_roundTripsEqual` (9) | Yes |
| AC4 | revision +1/`updatedAt`, no side effects on other sections/workspace; `put_reorderedAndShrunkLists_replaceChildRowsToo`; `JpaDesignSystemContentTest` reorder/same-id tests with JdbcTemplate counts; `ProjectServiceIntegrationTest` | Yes |
| AC5 | `put_staleRevision_is409_andChangesNothing` (9), `put_sameRevisionTwice_…` | Yes |
| AC6 | `assertRejected` (400 `INVALID_REQUEST`, field path, DB and document unchanged) for missing `expectedRevision`/`value`, null value, unknown fields, UI-state fields, `1e999`, bad enums, blank/duplicate ids/keys, null required fields, array girder value; malformed JSON → `MALFORMED_REQUEST_BODY` | Yes |
| AC7 | `put_unknownProject_is404` (9), `put_nonUuidPath_is400InvalidParameter` | Yes |
| AC8 | `newProject_hasEveryDesignSectionNull_andFamiliesAnObjectOfNulls`, `create_responseCarriesTheNewKeysAsNull`, `put_emptyList_readsBackEmpty_notNull`, `put_null_clearsTheSection_andRaisesTheRevision`, girder/preferred-span null tests, `absentOptionalFamilyFields_…`, JPA presence tests | Yes |
| AC9 | `ProjectApiContractTest` with 10-key list (M1 keys first); `workspacePut_leavesTheDesignSectionsAlone_andListSummaryShapeIsUnchanged`; full suite green | Yes |
| AC10 | `engineeringNonsense_isAcceptedAndStoredUnchanged` (`maxSpan` -1, rule min 9/max 1, `definitionKey` ≠ `bridgeId`) | Yes |
| AC11 | `DesignSystemSectionsTest` (12) | Yes |
| AC12 | `clean package` BUILD SUCCESS; pom/frontend unchanged; docs updated | Yes |

## Deviations from the plan
1. `docs/roadmap.md`: replaced the old `[ ] M2` line with a `[x] M2` line and reworded `[ ] M3` to "Loads, graph and the remaining project sections" (loads/graph had been listed under M2; plan puts them in M3).
2. Added `DesignSystemPutRequests.SectionPut<V>` interface shared by the 9 request records (one controller `write()` helper).
3. A missing `value` key returns 400 `value is required` for all sections, including the three that accept `null`.
4. Jackson reports only the first unknown field per request (one violation for several).
5. No column renames were needed (`element`, `source` worked on H2).
6. 4 new test files rather than the 5 estimated; nothing in plan scope is missing.

## Notes for the user
- `git diff docs/roadmap.md` also contains edits that are **not** part of M2: the P09/P11 table rows and a new paragraph about the P09 workflow. `git status` was clean at the start of this feature, so these appeared in the working tree during the session (likely a separate, user-side edit). Review/commit them separately.
- `docs/features/backend-db-persistence/plan.md` also changed on disk during the session (not touched by this feature).

## Limitations / remaining work
- PostgreSQL compatibility (V4, pessimistic lock) verified only on H2 in PostgreSQL mode; an optional `postgres-test` run is recommended before merge.
- Per D6 optional fields not sent are stored and returned as explicit `null`; the M4 frontend mapper must send every field explicitly and drop UI-only fields (else 400).
- M3 (loads, graph) and M4/M5 (frontend) not started.
- No independent review has run.
