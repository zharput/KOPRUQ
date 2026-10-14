# backend-db-persistence-m5b — implementation report

**Status: implemented** (plan sha256 `02785cc4942efb7d524373066827945fd4e4789a97107ce03c2166d7081a5fa7`, baseline HEAD `1b812413f5c18d64031015eb23a00de1b967d92f`).

Source: feature-implementer handoff. Coordinator independently re-ran in `frontend/`: `npm run build` exit 0, `npm run lint` exit 0, `npm test` 119 files / 1154 tests passed. Also confirmed: `git diff --name-only 1b81241 -- frontend/src` lists only `frontend/src/app/styles/App.css`; `git status` for `backend/`, `frontend/package.json`, lock file is empty; no `WindSnapshotInputsValue|localStorage|sessionStorage|indexedDB|StorageEvent|'storage'` match in the new non-test source files.

## Test baseline
- Before (measured by the implementer before editing): 105 files / 1070 tests.
- After: 119 files / 1154 tests (+14 files, +84 tests; no existing test changed, skipped or removed).

## Summary
The session layer exists but is NOT wired into the app (D1): `App.tsx`, `main.tsx`, `TopWorkspaceNav`, the modals and all existing stores are unchanged; localStorage remains the only source.
- `shared/project-store/activeProject.ts`: singleton session, then write queue (with a swappable API indirection), then the project-switch subscription; `setActiveProjectApi`/`activeProjectApi`, `ACTIVE_PROJECT`, section/collection registry with `hydrateEmpty()`, `onProjectSwitch`; `useSaveStatus.ts`.
- Seven per-feature section-instance files (17 registry entries: 16 sections + `graphs` collection).
- `app/project-session/projectSections.ts`: `prepareLoadedProject` (pure, pre-validates every `toWire`), `applyPreparedProject` (branded type; `begin` first, then 16 hydrates in definition order, then graphs; non-throwing), `closeActiveProject` (`end()` + `hydrateEmpty()`).
- `useProjectSessionController` (Open/New(name)/Reload/Exit, gate with Retry/Discard/Cancel, `canRetry=false` on conflict, stale-response protection by request counter, injected URL setter), `useProjectList`, `projectDisplay.ts`, `saveStatusText.ts`.
- Components: `ProjectListDialog`, `NewProjectDialog`, `SaveStatusIndicator`, `ProjectLoadScreen` (Turkish texts; role=dialog + aria-labelledby, Escape/Enter/autoFocus, no focus trap).
- Test infrastructure: `src/test/fakeProjectApi.ts` (+test), `src/test/projectSessionTestUtils.ts`, `src/test/architecture/sessionLayerUnwired.test.ts`.
- CSS: new `app/styles/app/18-project-session.css` (`.spn-session-*` selectors only) and one added `@import` line in `App.css`.

## Files
**Created (frontend/src):** `shared/project-store/{activeProject,useSaveStatus}.ts` + `activeProject.test.ts`, `useSaveStatus.test.tsx`; `features/project/model/projectWorkspaceServerSection.ts`; `features/bridge-definition/model/bridgeDefinitionServerSection.ts`; `features/family-registry/model/familyServerSections.ts`; `features/preferred-span/model/preferredSpanServerSection.ts`; `features/superstructure-families/model/crossSectionServerSection.ts`; `features/loads/model/loadsServerSections.ts`; `features/graph/state/graphServerCollection.ts`; `app/project-session/{projectSections,useProjectSessionController,useProjectList,projectDisplay,saveStatusText}.ts`; `app/project-session/{ProjectListDialog,NewProjectDialog,SaveStatusIndicator,ProjectLoadScreen}.tsx`; their tests (`serverSectionInstances`, `projectSections`, `projectDisplay`, `saveStatusText`, `useProjectList`, `useProjectSessionController` (51 tests; 23 at initial handoff), and the four component tests); `app/styles/app/18-project-session.css`; `test/{fakeProjectApi.ts,fakeProjectApi.test.ts,projectSessionTestUtils.ts}`; `test/architecture/sessionLayerUnwired.test.ts`.
**Modified:** `frontend/src/app/styles/App.css` (+1 `@import` line, CRLF kept); `docs/architecture.md` ("BACKEND-DB-PERSISTENCE M5b (2026-10-14)" section appended); `docs/roadmap.md` (`[x] M5b` sub-item under M5; M5 stays `[ ]`).

## Commands run (implementer)
- `npm test` baseline: exit 0, 105 files / 1070 tests.
- `npx tsc --noEmit -p tsconfig.app.json`: clean. `npm run build`: exit 0 (only the existing chunk-size warning). `npm test` final: exit 0, 119 / 1154. `npm run lint`: exit 0.
- Focused `npx vitest run <file>` for each new test file: passed.
- `git diff --name-only 1b81241 -- frontend/src`: only `App.css`. `git status --short -- backend frontend/package.json frontend/package-lock.json`: empty. Grep of new files for the forbidden symbols: 0. UTF-8 check of new files: valid.
Re-run by the coordinator: build, test, lint — same results.

## Acceptance criteria
| AC | Evidence | Met |
|---|---|---|
| AC1 | `activeProject.test.ts`: queue reset before the switch listener (`pendingKeys()` is `[]` inside it); `setActiveProjectApi` returns the previous api and applies mid-session; `onProjectSwitch` once per begin/end incl. same-id begin, not for setRevision/update; throwing listener does not stop others; registry replaces on repeated id | Yes |
| AC2 | `useSaveStatus.test.tsx`: stable snapshot reference; re-render on begin and status change | Yes |
| AC3 | `serverSectionInstances.test.ts`: 17 unique entries; ids/paths equal `PROJECT_SECTION_DEFINITIONS` + `graphs`; `write` false with no project and 0 requests | Yes |
| AC4 | `sessionLayerUnwired.test.ts` green (18 listed modules, stale-entry and parser tests); the seven instance files import only `activeProject` and their own wire file at runtime (checked by hand) | Yes |
| AC5 | `projectSections.test.ts`: canonical fixture reconciles (`keyBy:'bridgeId'`, bridge-1/bridge-2, `selectedBridgeId:'bridge-1'`); new fixture gives an empty store; `id:''` throws `Invalid project data: workspace…`; snapshot reference, reads and `pendingKeys()` unchanged, also with a project open | Yes |
| AC6 | epoch +1, projectId/revision from the document, idle, `pendingKeys()` `[]`, values deep-equal; notification order = definition order with graphs last; 0 requests after 1000 ms; second apply of the same project epoch +1 | Yes |
| AC7 | `closeActiveProject`: projectId null, 16 sections undefined, graphs `[]`, held rejection dropped, later `write` false, 0 requests | Yes |
| AC8 | `useProjectSessionController.test.tsx` New: only `POST /api/projects` with the `createProjectRequestBody` body (trimmed name), `setUrlProjectId(id)`, phase ready, `invalidateQueries(['projects'])`, 0 requests within 1 s, blank name sends nothing | Yes |
| AC9 | Open: PUT then GET with a pending write; invalid document keeps the old session and sections, `actionError` starts `Invalid project data:`; 404 -> `Proje bulunamadı: …` (`load-error` without project, `actionError` with one); same-id open sends nothing; late response for A ignored while B opens, epoch +1 once | Yes |
| AC10 | Gate: PUT 500 -> `pendingSwitch {reason:'open', target, canRetry:true}`, no GET; Retry PUT,PUT,GET; Discard PUT,GET; Cancel clears, no GET, status `error` kept; 409 -> `canRetry:false` and retry does nothing; new/open/exit ignored while pending | Yes |
| AC11 | Reload in conflict: server value, `pendingKeys()` `[]`, idle, revision 99; failed GET keeps conflict and sets `actionError` | Yes |
| AC12 | Exit passes the gate, then projectId null, sections empty, `setUrlProjectId(null)`, phase welcome; failed gate changes nothing | Yes |
| AC13 | first-render phases welcome/loading/ready/ready+URL restore; URL change opens through the gate; removed URL restored; failed URL-driven open restores the URL; `<StrictMode>`: one switch event, epoch +1 | Yes |
| AC14 | `ProjectListDialog.test.tsx`: loading/error(+Tekrar dene)/empty; newest first, "Untitled", 8-char id, `aria-current`; row click `onOpen`; no `listProjects` call while closed; exactly one call after an error | Yes |
| AC15 | `NewProjectDialog.test.tsx`: Oluştur disabled for blank, Enter/button -> `onCreate(trimmed)`, İptal/Escape -> `onCancel` only, empty on reopen, `aria-labelledby`, focus in the name field | Yes |
| AC16 | `SaveStatusIndicator.test.tsx` + `saveStatusText.test.ts`: five states and buttons; rejected shows first 3 field errors and "+2 hata daha"; nothing without a project | Yes |
| AC17 | `ProjectLoadScreen.test.tsx`: loading text and short id; error screen message and three callbacks | Yes |
| AC18 | `fakeProjectApi.test.ts`: revision chain, 409, 404, graph upsert, request log, `failNext`, hold/release, `openTestProject`/`closeTestProject`/`resetActiveProject` | Yes |
| AC19 | diff lists only `App.css`; backend/package.json/lock unchanged; build/test/lint exit 0; layerRules, noBrowserStorage (same 17 entries), sourceEncoding green; grep 0 | Yes |
| AC20 | architecture.md M5b section and roadmap `[x] M5b` present | Yes |

## Deviations from the plan
1. `prepareLoadedProject` validates the workspace first and reconciles afterwards (plan K3 had reconcile first): `ensureBridgeDefinitions` throws a plain `Error` for a bridge with an empty id, which would have violated AC5. The workspace check reports that invalid input first; unexpected reconciliation errors propagate. Outputs and the invalid-workspace error path are otherwise unchanged.
2. Fake api `release` signature is `release(method, index = 0)` plus `unhold(method)` (plan: `release(index?)`); holds are per method. Test-helper API only.
3. The URL effect depends on `[cancelPendingOpen, urlProjectId, runOpen]` (callbacks stable); request invalidation on unmount is a separate effect.
4. `setUrlRef` is written in an effect rather than during render, to avoid the `react(refs)` lint warning.
5. The retry continuation uses the same request counter as the gate.
6. All new files use LF; edited existing files (`App.css`, the two docs) keep CRLF.
7. `PendingSwitch` is a discriminated union: `new` and `open` require `target`, while `exit` has no `target`. The plan's single shape with optional `target` would allow invalid combinations.

## Limitations / remaining work
- Lint warning (not an error): `react(set-state-in-effect)` from the URL effect calling `runOpen`/`setUrlRef`; this is the K5 design and was not removed.
- The gate's `new` and `exit` continuations have dedicated retry/discard regression tests (review follow-up below).
- No manual browser check (the layer is not reachable from the UI).
- Not done (M5c): D6 bridge UI-only layer, store/component binding, deletions, shortcuts, `beforeunload`, `UnsavedChangesModal` props, router adapter for the URL, `loads.windSnapshot` key in the test helper; m3b is a prerequisite for the wind part of M5c.
- An independent review is recorded in `review.md`; its F1-F7 findings were addressed in the follow-up below. The original review decision remains a historical snapshot.

## Review follow-up (2026-10-14)

- **F1:** A gate retry now waits for `flush()` even when the queue is already running. Tests hold an in-flight PUT, enqueue another write, and verify PUT/PUT/GET ordering; a failed held PUT keeps the switch pending.
- **F2:** A failed New clears the superseded loading state and restores the URL to the active project (or null). A held older GET cannot revive that load.
- **F3-F4:** URL changes during a pending switch restore the active id; clearing a failed URL returns to welcome.
- **F5-F6:** Concurrent New calls send one POST. A superseded successful POST still invalidates the project list. Returning the URL or list selection to the active project cancels an older Open response.
- **F7:** Tests now cover retry/discard continuations for New and Exit, unmount with a held GET, the StrictMode GET count, and the actual section revert before the next GET returns on Discard. The registry test title now states the contract it tests: 17 ids and paths. Registration order follows imports; apply order is verified separately in `projectSections.test.ts`.
- **Other review notes:** Duplicate graph ids are rejected before apply; reconciliation propagates unexpected errors; Reload is available only in conflict so it cannot discard normal pending writes. Session UI uses defined theme tokens and a visible focus ring, avoids duplicate detail keys, announces load errors, and disables both New dialog cancel paths while busy. POST failures use the generic API error text.
- **Verification:** `npm test` passed (119 files / 1171 tests); `npm run build` and `npm run lint` exited 0. The existing Vite large-chunk warning and oxlint warnings remain. No backend or dependency changes.
- **Plan correction:** The risk note in `plan.md` section 4.2 claiming that a count of 17 unique registry entries detects duplicate instance creation is inaccurate: replacement by id can hide a duplicate while preserving the count. The test protects the resulting registry contents, not constructor call count. Registry close notifications follow import order; no definition-order contract is asserted for close.

## Second review follow-up: N1 and N2 (2026-10-14)

- **N1:** Cancel now invalidates a gate retry request and clears `busy`. The in-flight PUT is allowed to finish, but its result cannot resume a cancelled Open/New/Exit or reopen the switch dialog. Regression tests cover successful and failed held PUTs.
- **N2:** New, Exit and conflict Reload restore the active project URL before superseding an in-flight Open. Tests cover New/Exit gate failures followed by Cancel and a failed Reload GET; the older GET remains ignored.
- Verification after the changes: focused controller suite 43 tests passed; full frontend suite 119 files / 1176 tests passed; production build and lint exited 0 (existing large-chunk and lint warnings). The original second-review report remains a historical snapshot.

## Third review follow-up: Y1 (2026-10-14)

- **Y1:** List Open now restores the active session id when it supersedes an in-flight URL Open. This also covers selecting the already active project from the list. The controller marks its own URL restoration so the URL effect does not cancel the replacement Open while its save gate is pending.
- Regression tests hold URL Open B while session A is active, then verify that list Open C returning 404, list selection of A, and list Open C failing its save gate all leave URL A. A successful list Open C still reaches the server and activates C; the older B response stays ignored.
- Verification after Y1: focused controller suite 47 tests passed; full frontend suite 119 files / 1180 tests passed; production build and lint exited 0. Existing large-chunk and lint warnings remain.

## Review nits follow-up (2026-10-14)

- `ProjectListDialog` disables Kapat while busy, matching its Escape behavior and the disabled project rows.
- New's duplicate-request guard now belongs to the active request counter. A superseded POST may remain in flight without blocking a later New; its eventual response cannot replace the newer session.
- `PendingSwitch`'s discriminated union is recorded under deviations above. The initial 23-test count is marked as historical in the file list.
- Tests that render the session hook, project list, or save status explicitly call RTL `cleanup()` before resetting the active project. This fixes the teardown order regardless of the global cleanup hook's order.
- The architecture record's 404 text now matches `Proje bulunamadı` in the controller. New tests cover POST 404's generic API message, clearing the URL during a pending list Open, the superseded POST/New race, and the busy Kapat button.
- Verification after these nits: focused suites 4 files / 62 tests passed; full frontend suite 119 files / 1184 tests passed; production build and lint exited 0. Existing large-chunk and lint warnings remain.

## YB1-YB3 review follow-up (2026-10-14)

- **YB1:** The list Open regression test now lets React flush the URL effect while replacement GET C is still held, then releases GET in a separate `act`. Removing the `restoredUrlRef` consume block makes this test fail because the effect cancels C; restoring the block makes it pass.
- **YB2:** New, Exit and conflict Reload clear a superseded load phase as soon as they start. A test holds the first URL GET B and the replacement New POST separately and verifies the phase is `welcome` while POST remains in flight, with URL null and no session.
- **YB3:** `docs/architecture.md` now records list Open URL restoration, the one-time `restoredUrlRef` contract, and immediate load-phase cleanup.
- Verification: controller suite 51 tests passed; full frontend suite 119 files / 1185 tests passed; production build and lint exited 0. The existing large-chunk and lint warnings remain.
