# backend-db-persistence-m5c2 — implementation report

**Status: implemented** (plan sha256 `4616506bf57a46bf9190459ec4023f4baba51596e266b733e615e8f80aed7f6c`, baseline HEAD `d221191b6e9f3d24a6b185be0f2456c477fc3ddb`).

Source: feature-implementer handoff. Coordinator independently re-ran: `npm run build` exit 0; `npm test` 1075 passed; `npm run lint` exit 0 (66 warnings, pre-existing kinds, no errors); `git status --short -- backend frontend/package.json frontend/package-lock.json` empty; HEAD unchanged; `feature_state.py check` `in_progress`, `approval_matches: true`. A grep of production sources for `localStorage|sessionStorage|indexedDB|.kopruq|showOpenFilePicker` has one false positive (`GraphWorkspace.tsx:412`, `import(...).KopruqConnection`). The implementer's `mvn -f backend/pom.xml -B package` (732 tests, 1 skipped, BUILD SUCCESS) was not re-run by the coordinator (backend untouched, git status empty).

## Test baselines
- Frontend: 119 files / 1187 tests → 115 files / 1075 tests (9 test files deleted, 5 added; about 150 tests removed with the deleted `.kopruq` code, the rest net of new/rewritten tests).
- Backend: 732 / 1 skipped, unchanged. One timing-flaky test failed once in the implementer's first baseline run and passed on rerun; not identified.

## Summary
The localStorage and `.kopruq` stores are replaced by the M5b server sections; the shell runs on the project session layer.
- **Stores:** `projectModuleStore` = `createProjectModule(section)` (+`useProjectModuleValue`, `WIND_SNAPSHOT_MODULE`); `familyRepository` (event bridging), `useFamilyCatalog` (no write on read), `projectWorkspace` + `useProjectState`, `bridge-definition/store.ts` (in-memory D6 UI layer, memoized reconciled read), `graphStore` (collection-derived, placeholder graph, `commit`); `onProjectSwitch` resets in `familySnapshotStore`, `graphRunValidity`, `graphViewPreferences`.
- **Wind:** `requireFinite` in `windSnapshotToWire` (result fields, `transverseKNm` when set, `inputs.deckWidthM/drefM`) → local refusal, no PUT, `rejected` with field path.
- **Shell:** `App.tsx` (`ProjectShell`), `useUrlProjectId`, `useBeforeUnloadWarning`, `TopWorkspaceNav` (name, indicator, New/Open/Recent/Exit, Ctrl+S/O/N), `UnsavedChangesModal` (TEKRAR DENE / AT / İPTAL), `main.tsx` without legacy migration; Reload guard in the controller and focus fix in `ProjectListDialog`.
- **Removed:** `.kopruq` code, Recent/file access, `legacyStorageMigration`, `projectDataEvents`, `RecentFileAccessModal`, four unused schema files, `sessionLayerUnwired.test.ts`; `noBrowserStorage` allow-lists now empty.
- **Docs:** `architecture.md` M5c section (+ M5b/M3b notes marked superseded), `roadmap.md` (M5c and M5 `[x]`, 1851 note), `frontend/README.md`.

## Files
**New:** `app/project-session/{useUrlProjectId,useBeforeUnloadWarning}.ts`, `features/project/hooks/useProjectState.ts`, `app/AppSession.test.tsx`, `app/browserStorageRuntime.test.tsx`, `app/project-session/sectionWrites.test.ts`, `app/project-session/realDefaultsWire.test.tsx` (plan said `.ts`; uses JSX), `features/bridge-definition/model/bridgeDefinitionUiState.test.ts`.
**Deleted (23):** all 15 files of `app/project-file/`; `shared/persistence/legacyStorageMigration.ts`; `shared/project-file/projectDataEvents.ts`; `shared/ui/RecentFileAccessModal.tsx`; `test/architecture/sessionLayerUnwired.test.ts`; `features/project/model/projectStateSchema.ts`; `features/bridge-definition/model/schema.ts`; `features/family-registry/model/familySchemas.ts`; `features/graph/state/graphSchema.ts`.
**Changed:** shell/session (`App.tsx`, `TopWorkspaceNav.tsx`, `UnsavedChangesModal.tsx`, `main.tsx`, `useProjectSessionController.ts`, `ProjectListDialog.tsx`, `18-project-session.css`), module store and hooks, the four `*ProjectModule` files and `loadsProjectModules.ts`, owner stores listed above, `loadsWire.ts`, four components (`GraphWorkspace`, `BridgeDefinitionWorkspace`, `SystemAssemblyPanel`, `PreferredSpanPanel`), seven `*ServerSection(s)`/`graphServerCollection` files (comments), test infrastructure (`setup.ts`, `projectStoreTestUtils.ts`, `projectSessionTestUtils.ts`) and about 20 rewritten/extended tests; docs as above. All touched files re-normalised to CRLF.

## Commands run (implementer)
- Checkpoints: `npx vitest run src/features src/shared` 93 files / 816 tests; `npx tsc -b` clean.
- Final: `npm.cmd run build` exit 0; `npm.cmd test` 115 files / 1075 tests; `npm.cmd run lint` exit 0 (66 warnings); `mvn -B -f backend/pom.xml package` BUILD SUCCESS (732 tests, 1 skipped); protected-path `git status` empty.
Re-run by the coordinator: frontend build, test, lint, protected-path status, state `check` — same results.

## Acceptance criteria
| AC | Evidence | Met |
|---|---|---|
| AC1 | `noBrowserStorage.test.ts` with empty allow-lists; production grep clean; deleted files gone | Yes |
| AC2 | `browserStorageRuntime.test.tsx` (storage lengths 0, Storage spies and `indexedDB.open` 0 calls) | Yes |
| AC3 | `AppSession.test.tsx`, `TopWorkspaceNav.test.tsx` (no Welcome requests, New → one POST with trimmed name, `?project`, 1 s quiet, menu LIST) | Yes |
| AC4 | `sectionWrites.test.ts` (16 paths + graph, revision chain), "Add bridge" two PUTs, reopen | Yes |
| AC5 | `AppSession.test.tsx` conflict band, Reload | Yes |
| AC6 | `AppSession.test.tsx` 500/400 handling, Retry/Discard, `beforeunload` | Yes |
| AC7 | `AppSession.test.tsx`, `TopWorkspaceNav.test.tsx` (ordering, Recent 5, gate modal, invalid document) | Yes |
| AC8 | reset tests in graph/family/bridge-definition stores, body scan in `sectionWrites.test.ts` | Yes |
| AC9 | `realDefaultsWire.test.tsx`, `PierFamiliesPanel.test.tsx` (RECT-M, 0 PUT) | Yes |
| AC10 | `bridgeDefinitionUiState.test.ts` | Yes |
| AC11 | `WindLoadsPanel.test.tsx` connected scenarios | Yes |
| AC12 | `loadsWire.test.ts`, panel test (1e999 → rejected, 0 PUT; `loads/wind` 500 ordering, Retry/Discard) | Yes |
| AC13 | `AppSession.test.tsx` "No open project", `graphStore.test.ts` | Yes |
| AC14 | `AppSession.test.tsx` URL preservation/redirects, different project, Exit, YB1 history test | Yes |
| AC15 | `AppSession.test.tsx` loading → ready, 404 screen | Yes |
| AC16 | nav tests (no Save/Save As/file input), shortcuts | Yes |
| AC17 | controller Reload guard tests, `ProjectListDialog` focus tests, YB1/YB2 integration | Yes |
| AC18 | coordinator re-run of build/test/lint; protected paths unchanged; backend per implementer | Yes |
| AC19 | docs updated | Yes |

## Deviations from the plan
1. `PreferredSpanPanel` now listens to `kopruq:girder-catalog-changed` instead of just dropping `'storage'`.
2. The shell passes `busy={dialogsLocked}` (pending decision only) to New/List dialogs, so URL-Open-in-flight scenarios remain possible.
3. Redirects in `RoutedApplication` read `window.location.search` (router state can lag one transition behind the controller's `replace`); contract documented in architecture.md.
4. `realDefaultsWire.test.tsx` instead of `.ts`.
5. Recent list = first 5 of the already `updatedAt`-descending list; Exit disabled when no project is open.
6. Test seeding: legacy/raw-data seeding tests became direct `ensureBridgeDefinitions` tests or were dropped (legacy number-keyed registry test, unreadable-JSON test) because raw data can no longer be injected.

## Limitations
- Not run: the manual end-to-end check against the real backend (plan 6.2 / parent 7.2), manual large-graph drag cost, a real-browser `beforeunload` check; backend handling of non-finite wind values unverified (local refusal covers it).
- Accepted: no cross-section atomicity (`setBridges`, wind inputs + snapshot); R2 (no calculation version); module-level `QueryClient` shared across App tests.
- At the initial handoff no independent review had run; the later review is recorded in `review.md`.

## P2-1 review follow-up (2026-10-14)

- Materials now reads the material server section through `useFamilyCatalog`; Girder Library reads its server section through `useProjectModuleValue`. Both panels derive displayed values from the current section mirror, so discard and server confirmation update the mounted UI.
- User edits write directly through the existing repository functions. The default or incomplete value is normalized only on mount, preserving the D9 first-visit write without writing in response to section notifications.
- Regression tests for both panels change one field, discard it, change another field, and assert both the visible reverted value and the next PUT body. The two tests failed before the fix and pass after it. Focused tests: 3 files / 18 tests passed. Full frontend suite: 116 files / 1077 tests passed; TypeScript check, production build and lint exited 0. Existing lint and Vite chunk warnings remain.
- The independent `review.md` is a snapshot from before this follow-up; its P2-1 and AC6 assessments are historical.

## P3-4 to P3-6 review follow-up (2026-10-14)

- P3-4: `useUrlProjectId` now has direct tests for reading, same-id no-op, replace navigation, query/hash preservation and clearing. The Preferred Span default test requires exactly one PUT with four expected variants and checks the fake API copy. The reopen test compares all 16 server sections and the graph collection after loading the fake backend document.
- P3-4 evidence wording: `realDefaultsWire.test.tsx` now describes client wire mapping and a fake API round trip. The fake API does not validate the real backend request schema; real backend acceptance remains unverified here.
- P3-5: `noBrowserStorage.test.ts` also rejects `showDirectoryPicker`, `FileSystemHandle`, `FileSystemDirectoryHandle`, `caches`, `document.cookie` and `navigator.storage`, with direct positive and look-alike tests.
- P3-6: the baseline above now states the verified count of 9 deleted test files (8 under `app/project-file` and `sessionLayerUnwired.test.ts`). The historical total of 23 deleted files is unchanged.
- Verification: focused tests 4 files / 47 tests passed; full frontend suite 117 files / 1087 tests passed; production build and lint exited 0. Lint still reports warnings, and the build still reports a large chunk warning. No backend files were changed in this follow-up.

## P3-1 Pier starter draft follow-up (2026-10-14)

- `RECT-M` is now an editor-only starter draft when the saved Pier catalog is empty. Field edits stay local and do not queue a PUT; the editor shows “Henüz projeye kaydedilmedi” and the catalog table says that no Pier family is saved.
- Add Pier stays disabled until the existing Pier validation returns `VALID`. On Add Pier, the edited draft is written once with a new family id and its chosen name. Bridge Definition, System Assembly and Registry continue to read only saved Pier families.
- The Pier panel tests cover the empty shared catalog, zero PUT after draft edits, validation-gated Add Pier, and visibility in the shared registry after the write. The historical `review.md` P3-1 entry describes the state before this follow-up.
- Verification: focused Pier/defaults tests 2 files / 14 tests passed; full frontend suite 117 files / 1088 tests passed; production build and lint exited 0. The build reports its existing large chunk warning and lint reports warnings. No backend files were changed.

## Review round 2 follow-up (2026-10-14)

- **Decision recorded (P2-A): user chose option (b).** The Pier `RECT-M` starter is an editor-only draft while the saved catalog is empty; edits stay local, the panel says "Henüz projeye kaydedilmedi", `Add Pier` (enabled only when the existing Pier validation returns `VALID`) writes it once with a new id, and only then do Bridge Definition, System Assembly and Registry see it. This is a deliberate deviation from the parent plan's D14 ("written when edited"); AC9's "0 PUT, section stays `undefined`" holds.
- **Warning before the draft is lost.** New `shared/project-store/unsavedDrafts.ts` (dirty registry + `confirmDiscardDrafts`). The Pier panel marks the draft dirty after the first edit and clears it on unmount or when it is added. `useBeforeUnloadWarning` also prompts on tab close/reload while a draft is dirty. In-app, the workspace links in `TopWorkspaceNav`, Exit, opening a project (list or Recent) and creating a project ask via `window.confirm` first. Not covered: browser back/forward (no data router, so no `useBlocker`).
- **P3-B:** `PreferredSpanPanel.updateRule` derives from `ensureRules(previous, variants, type)`, so an edit after a discarded first-visit write keeps all rules instead of writing `[]`. Test added.
- **P3-3:** `Ctrl+O` / `Ctrl+N` do nothing while the unsaved-changes decision is pending (`requestNew` / `requestOpenList` in `App.tsx`). Test added.
- **P3-C:** `docs/architecture.md` now says "eight" `app/project-file` tests.
- Additional new test files not listed under "Files > New": `app/project-session/useUrlProjectId.test.tsx`, `features/girder-library/components/GirderLibraryPanel.test.tsx`, `shared/project-store/unsavedDrafts.test.ts`.
- Still open (not addressed): P3-2 (Ctrl+N may be reserved by the browser; manual check), hypotheses H1 and H3 from `review-1-changes-requested.md`.
