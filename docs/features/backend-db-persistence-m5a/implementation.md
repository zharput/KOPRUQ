# backend-db-persistence-m5a — implementation report

**Status: implemented** (plan sha256 `618cbdf7ef746fbe0f1258dfa7c513151a85caa9f51c776b0c9a7165ccfc52f0`, baseline HEAD `f34792e795ea28ee6b345c12aa86a491ac657adc`).

Source: feature-implementer handoff. Coordinator independently re-ran in `frontend/`: `npm run build` exit 0, `npm run lint` exit 0, `npm test` 105 files / 1070 tests passed. Greps confirm: 0 `localStorage|StorageEvent` matches in the 13 migrated test files; `App.test.tsx` has `localStorage` on 6 lines; 0 storage-symbol matches in `registry.ts` and `PierFamiliesPanel.tsx`. `git status` for `backend/`, `frontend/package.json`, lock file is empty.

## Test baseline
- Before: 102 files, 1042 tests (measured by the implementer before editing).
- After: 105 files, 1070 tests (+3 files: noBrowserStorage, PierFamiliesPanel, SystemAssemblyPanel; +28 tests, all additions; no existing test deleted or skipped).

## Files (all under `frontend/src`, plus docs)
**Created:** `features/project/model/projectWorkspaceModel.ts`; `features/loads/model/loadsInputs.ts`; `test/projectStoreTestUtils.ts`; `test/architecture/noBrowserStorage.test.ts`; `features/pier-families/components/PierFamiliesPanel.test.tsx`; `features/system-assembly/components/SystemAssemblyPanel.test.tsx`.

**Modified production:** `features/project/model/projectWorkspace.ts` (re-exports + `readProjectUnits`), `projectWorkspaceWire.ts`; `features/loads/model/loadsProjectModules.ts`, `loadsWire.ts`; `features/bridge-definition/model/store.ts` (+`readStoredBridgeDefinitions`); `features/family-registry/model/registry.ts`, `familySchemas.ts` (comment); `features/pier-families/components/PierFamiliesPanel.tsx` (module-level `PIER_FALLBACK`); `features/bridge-definition/components/BridgeDefinitionWorkspace.tsx`; `features/system-assembly/components/SystemAssemblyPanel.tsx`; `features/preferred-span/components/PreferredSpanPanel.tsx`; `features/graph/state/graphStore.ts`.

**Modified tests:** `test/architecture/sourceEncoding.test.ts` (allow-list `projectWorkspace.ts` -> `projectWorkspaceModel.ts`); the 13 migrated files (registry, familyRepository, FoundationFamiliesPanel, BearingFamiliesPanel, bridge-definition store, MaterialsPanel, WindLoadsPanel, SeismicPanel, UniformTemperaturePanel, projectWorkspace, LoadsPanel, FamilyResultsViewer, PreferredSpanPanel); `app/App.test.tsx` data lines.

**Docs (append only):** `docs/architecture.md` ("BACKEND-DB-PERSISTENCE M5a (2026-10-14)"), `docs/roadmap.md` (`[x] M5a` sub-item; M5 stays `[ ]`).

## Commands run (implementer)
- `npm test` before editing: 102 files / 1042 tests passed.
- `npx tsc -b` clean; `npx vitest run src/test/architecture` 3 files / 36 tests; `npx vitest run src/features/pier-families src/features/system-assembly` 2 files / 3 tests.
- `npm run build` exit 0 (only the usual chunk-size warning); `npm test` 105 files / 1070 tests; `npm run lint` exit 0 (existing warnings only).
- `git status --short -- backend frontend/package.json frontend/package-lock.json`: empty.
- The full focused vitest command of plan section 4 was run only partially; the full `npm test` covers the rest.
Re-run by the coordinator: build, test, lint — same results.

## Acceptance criteria
| AC | Evidence | Met |
|---|---|---|
| AC1 | `noBrowserStorage.test.ts` green (synthetic: each symbol, minified line, 3 quote styles, array literal, look-alikes, comments, test-file exemption, unexpected/stale; real tree: only `'storage' literal` in the 3 listener components, no unexpected/stale); 0 symbol matches in `registry.ts`, `PierFamiliesPanel.tsx`; `graphStore` uses `readProjectUnits()` | Yes |
| AC2 | `projectWorkspaceWire.ts` imports `./projectWorkspaceModel`; `loadsWire.ts` has no `loadsProjectModules` import; old exports kept plus `readProjectUnits`; the 4 input types still exported from `loadsWire`; `tsc -b` clean | Yes |
| AC3 | `PierFamiliesPanel.test.tsx`: empty store shows RECT-M and writes it on read; stored `H_TYPE` unchanged after render | Yes |
| AC4 | `PreferredSpanPanel.test` `new Event('storage')` tests unchanged and green; girder-catalog-changed subscription not added (K2) | Yes |
| AC5 | 13 files: 0 `localStorage`/`StorageEvent`; `App.test.tsx`: 6 `localStorage` lines in the 6 named tests; same matchers/expected values; `beforeEach` resets the same 7 keys; `PreferredSpanPanel.test` still dispatches `storage` | Yes |
| AC6 | `registry.test.ts` (MATERIAL filter, bad JSON, empty store, legacy `bridgeNo = bridgeId`); `store.test.ts` (`readStoredBridgeDefinitions` raw/`{}`/`undefined`); `projectWorkspace.test.ts` (`readProjectUnits` normalization and `INITIAL_PROJECT.units` fallback); `SystemAssemblyPanel.test.tsx` ("20, 25, 30" and "25 m") | Yes |
| AC7 | build, test, lint exit 0; layerRules and sourceEncoding green; backend/package.json/lock unchanged | Yes |
| AC8 | architecture.md section and roadmap `[x] M5a` present | Yes |

## Deviations from the plan
None reported.

## Accepted differences / notes
- K3: externally corrupted or partial preferred-span-rules storage now reads as no rules (zod-validated owner read) in `BridgeDefinitionWorkspace` and `SystemAssemblyPanel`.
- K2: the `kopruq:girder-catalog-changed` subscription of `PreferredSpanPanel` is deferred to M5c (parent AC4 not implemented in M5a by decision).
- `PierFamiliesPanel.test.tsx` depends on the `useFamilyCatalog` module-level cache; the empty-store test is deliberately first (commented in the file).
- The mojibake strings of `normalizeUnitId` were copied to the model file; the byte-level diff against the old file was not made; `sourceEncoding` and `projectWorkspace.test.ts` pass.
- Working-copy line endings are CRLF and were preserved per file.

## Limitations / remaining work
- M5b and M5c remain: `loads.windSnapshot` key in the helper, switching the helper to the backend store, the six `App.test.tsx` tests that keep `localStorage` (`.kopruq`/Recent/New-Project rollback), the `browserStorageText` replacement, removal of the 17-file allow-list.
- An independent review is recorded in `review.md`; it passed with two P3 test-strength findings (F1 and F2).

## Review follow-up: F1 and F2 (2026-10-14)
- `projectWorkspace.test.ts` now seeds non-default moment and length units and checks the complete normalized result of `readProjectUnits()`; returning defaults without reading the store would fail.
- `PierFamiliesPanel.test.tsx` now checks that the rendered catalog displays the stored legacy `H_TYPE`, as well as confirming that the persisted value stays unchanged.
- Focused Vitest: 2 files / 6 tests passed. Frontend production build passed (existing large-chunk warning). No production code changed.
