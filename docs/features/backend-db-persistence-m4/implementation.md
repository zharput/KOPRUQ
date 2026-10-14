# backend-db-persistence-m4 — implementation report

**Status: implemented** (plan sha256 `262fb2e4c5d97bb7fa8d09a8237c4f9cbdf0ed917329822cebc156e3168e8d01`, baseline HEAD `cab209cc6128c5a81658534115f18f335e4b3f2f`).

Source: feature-implementer handoff. Coordinator independently re-ran in `frontend/`: `npm run build` (exit 0, only the existing chunk-size warning), `npm test` (102 files, 979 tests, all passed), `npm run lint` (exit 0; warnings are pre-existing in `GraphWorkspace.tsx`, `BridgeDefinitionWorkspace.tsx`, etc., none in new files). `git status` confirms `backend/**`, `frontend/package.json` and the lock file unchanged, and the only modified existing source files are `http.ts`, `http.test.ts`, `docs/architecture.md`, `docs/roadmap.md`.

## Summary
Frontend persistence infrastructure only; no UI or behaviour change; localStorage/IndexedDB/`.kopruq` code untouched (M5). Nothing in the app imports it yet apart from the loader that joins the mappers.
- `putJson` in `shared/api/http.ts`.
- Generic `shared/project-store/`: `projectDataValidation`, `projectApi`, `projectSession`, `writeQueue`, `serverSection` (no `features/` or `app/` imports).
- 7 feature wire mappers (strict zod response schema, `toWire`, `fromWire`, section codec).
- `app/project-session/projectDocument.ts` (document schema, pure loader, 16 section definitions + graph collection definition, `createProjectRequestBody`) and `projectDocumentFixtures.ts` (canonical backend-shaped JSON, new-project JSON).

## Files
**Modified (4):** `frontend/src/shared/api/http.ts`, `frontend/src/shared/api/http.test.ts` (+2 tests, existing unchanged), `docs/architecture.md` (M4 section appended), `docs/roadmap.md` (M4 → `[x]` with note: infrastructure only).

**New production (15):** `frontend/src/shared/project-store/{projectDataValidation,projectApi,projectSession,writeQueue,serverSection}.ts`; `frontend/src/features/project/model/projectWorkspaceWire.ts`; `features/bridge-definition/model/bridgeDefinitionWire.ts`; `features/family-registry/model/familyWire.ts` (5 catalogs + girder library); `features/preferred-span/model/preferredSpanWire.ts`; `features/superstructure-families/model/crossSectionWire.ts`; `features/loads/model/loadsWire.ts`; `features/graph/state/graphWire.ts`; `app/project-session/{projectDocument,projectDocumentFixtures}.ts`.

**New tests (13):** one `*.test.ts` for each of the 5 shared files, the 7 mappers and `projectDocument`.

## Commands run (implementer)
- `feature_state.py check` — OK before editing and at handoff.
- `npx vitest run src/shared/api src/shared/project-store` — 5 files, 50 tests, pass.
- Focused vitest on the 7 feature dirs — 14 files, 77 tests, pass; `src/app/project-session` — 11 tests, pass.
- `npx tsc -b` — clean. `npm run build` — pass. `npm test` — pass, 102 files, 979 tests. `npm run lint` — exit 0.
- `git status --short -- backend frontend/package.json frontend/package-lock.json` — empty.
Re-run by coordinator: build, test, lint — same results.

Not run: end-to-end checks against a running backend (outside M4 scope); CI configuration not inspected.

## Acceptance criteria
| AC | Evidence | Met |
|---|---|---|
| 1 | `http.test.ts` putJson PUT request + 409 → `ApiError{409, PROJECT_REVISION_CONFLICT, correlationId}` | Yes |
| 2 | `projectApi.test.ts`: URLs/methods/bodies (`{expectedRevision,value}`, `value:null`), `%2F` encoding, strict summary/envelope rejection, 400/404/409/500 as `ApiError`, network `TypeError` | Yes |
| 3 | `projectDataValidation.test.ts`: exact message, first 3 + `(+2 more)`, `(root)`, `issues`/`path`, `WireMappingError` message | Yes |
| 4 | `writeQueue.test.ts` debounce: 0 requests at 299 ms, 1 PUT at 300 ms with last value | Yes |
| 5 | serial send, revisions r and r+1, final r+2 | Yes |
| 6 | in-flight same key; coalesced unsent entry keeps queue position | Yes |
| 7 | 409 conflict: status, code, failedKey, no further requests, `retry()` rejects without request, `discard()` → idle; `serverSection` mirror revert + notification | Yes |
| 8 | 400 rejected, fieldErrors, retry sends newest value, discard | Yes |
| 9 | network failure / 404 / 500 → `error`, pending kept, retry → idle, discard | Yes |
| 10 | `flush()` semantics (immediate send, reject on failure/halt, resolve when empty) | Yes |
| 11 | `reset()` ignores in-flight response; invalid 200 value updates revision and stops queue with `ProjectDataValidationError` | Yes |
| 12 | `serverSection.test.ts`: 8 ServerSection + 5 collection tests (no-op writes, equal echo keeps reference, differing server value, hydrate no request, false+rejected cases, per-graph PUT, delete rejection, discard) | Yes |
| 13 | round-trip tests per mapper with realistic fixtures; documented exceptions asserted | Yes |
| 14 | `Object.keys` order equals backend record order at every level; passthrough/UI-only fields absent | Yes |
| 15 | strict response schemas with full paths; `H_TYPE`/`WALL` accepted; null vs `[]` kept | Yes |
| 16 | `WireMappingError` for missing/blank row id, store without `keyBy`, blank axis id, bad graph parameters | Yes |
| 17 | `projectDocument.test.ts`: canonical 12 keys, new-project document, W→T→W per section, key order, invalid-document message, zero `Storage.setItem`/`dispatchEvent` calls | Yes |
| 18 | 16 section paths in order, `clearable` only for last 9, `graphs/<id>`, `createProjectRequestBody` | Yes |
| 19 | only planned files changed; `project-store` imported only by `*Wire.ts` and `app/project-session/projectDocument.ts` | Yes |
| 20 | `layerRules.test.ts`, `sourceEncoding.test.ts` green in full run | Yes |
| 21 | build, test, lint pass; architecture.md M4 section; roadmap M4 `[x]` | Yes |

## Deviations from the plan
- `vi.advanceTimersByTimeAsync` works in vitest 5.0.0; no adaptation needed.
- `SectionCodec.schema` is `ZodType<W|null>` built with `schema.nullable()`; the queue's `valueSchema` is the same schema so a `null` echo validates.
- `projectApi.putSection` and `listProjects` validate their envelope/summary and throw `ProjectDataValidationError`; the queue treats it as `error`, and separately validates the envelope `value`.
- A local collection rejection in `serverSection` is reported under `graphs/<id>`; for nested mapping errors `WireMappingError.path` is relative to the graph.
- No oxlint-disable comment was needed for `any` in `PROJECT_SECTION_DEFINITIONS`.

## Limitations / remaining work (M5)
Everything in plan section 8 stays M5 work: bridge-definition UI state and `ensureBridgeDefinitions` reconciliation after load, `BridgeRow.id` via `ensureBridgeIds` before writes, nullable family fields returning `null`, girder library `[]`→`null`→`undefined`, wind snapshot without `result` (panel behaviour), NaN graph parameters → 400, `-0` stored as `0`; hooks, singleton store, project list dialog, `beforeunload` guard via `pendingKeys()`, wiring `ServerSection` into feature modules and removing localStorage/IndexedDB/.kopruq.
Strict response schemas mean a new backend DTO field makes the frontend reject loading; the canonical fixture is not derived from the backend and must be updated by hand on DTO changes.
No independent review has run.

## Post-review fixes (2026-10-13)

After `review.md` (CHANGES_REQUESTED, findings F1–F8 and nits) the user asked for all findings to be fixed; a bounded repair was applied by `refactor-implementer` (plan.md and state.json untouched). Coordinator re-ran in `frontend/`: `npm run build` exit 0, `npm run lint` exit 0, `npm test` 102 files / 1003 tests passed (was 979; +24 regression tests, no new test files). `backend/`, `package.json` and lock file unchanged.

- F1 `writeQueue.ts`: one entry per key after a failure (newer value wins, moved to the head so `failedKey` stays first); `pendingKeys()`/`pendingCount`/`onDiscarded` no longer double count.
- F2 `serverSection.ts` (+ collection): `confirm` adopts the server value when a discard happened during the in-flight request; an in-flight new graph confirmed after a discard stays in the list.
- F3 new `WriteQueue.drop(key)`; `ServerSection.discard()` and collection `discard()` are queue-aware; in-flight requests of dropped/discarded keys are not requeued on failure.
- F4 failure severity: `conflict` is sticky and is not overwritten by a lower-severity failure.
- F5 new `SectionEnvelopeError` (carries a readable numeric `revision`); the queue applies it before moving to `error`.
- F6 the queue resets when the session project changes (`begin` other project / `end`) and ignores responses of another project; `begin` with the same project id is not detected (documented: call `queue.reset()` first).
- F7 tests: byte-for-byte schema re-serialization for all 16 sections, graphs and the document schema; real-codec `ServerSection` echo test for bridge definitions. No mapper order mismatch was found.
- F8 `docs/architecture.md` M4 section: D3 `WireMappingError` list completed, D7 updated, nit notes added.
- Nits: `bridgeDefinitionsFromWire` uses `Object.fromEntries` (`__proto__` test); girder-library non-empty legacy array → `null` documented only; `%2F` encoded-slash risk documented only (unverified); `familyWire` barrel imports unchanged.

Visible to M5: `WriteQueue.drop(key)`, queue-aware section/collection `discard()`, project-change reset, `SectionEnvelopeError`, the severity/discard rules above.

Limitations: the new regression tests were not executed against the old code (reasoned from the code only); the fixes have not been independently re-reviewed and `review.md` describes the pre-fix state (its fingerprint is stale). A fresh `/feature-review backend-db-persistence-m4` is recommended.

## Second repair round (after the re-review, 2026-10-13)

`review.md` (re-review, CHANGES_REQUESTED: N1–N4, H1–H3, nits; the first review is kept as `review-1-pre-fix.md`) was addressed by a second bounded repair (`refactor-implementer`; plan.md and state.json untouched). Coordinator re-ran in `frontend/`: `npm run build` exit 0, `npm run lint` exit 0, `npm test` 102 files / 1023 tests passed (was 1003; +20). `backend/`, `package.json`, lock file unchanged.

- N1 `queue.discard()` also calls `onDiscarded` for the in-flight entry; a later failure leaves the mirror at the confirmed value, a later success still adopts the server value; same for the graph collection; `flush()` no longer hides a divergence.
- N2 session snapshot gains a monotonic `epoch` (incremented on every `begin()`/`end()`); the queue's `stale()` and subscription compare the epoch, so `begin(sameId, rev)` resets the queue.
- N3 the queue keeps an ordered list of held failures (conflict sticky and highest); `drop(key)` removes only that key's non-conflict failure, so a masked failure keeps the queue stalled instead of auto-resending; `retry`/`discard`/`reset` clear all.
- N4 `SectionEnvelopeError` always ends in `error` (readable revision applied; unreadable on a dropped entry -> `error`, `flush` rejects).
- H1 subscription-order caveat documented (code comment + architecture D7 (e)); H2 `WriteQueue.dispose()` added; H3 `onConfirmed`/`onDiscarded`/`setRevision` wrapped in `guard()` (errors logged with `console.error`, queue continues, no stuck `saving`, no unhandled rejection).
- F7 gap: test that `JSON.stringify(codec.toWire(loaded.X))` equals the canonical section value for all 16 sections and every graph (no order mismatch found). Collection nit: an `idOf` failure is reported under the sentinel key `<collection id>[<index>]`.
- Existing tests changed (legitimately, expectations of fixed behaviour): `projectSession.test.ts` (two `toEqual` lines gain `epoch`), `writeQueue.test.ts` (discard test now expects `onDiscarded` `['a','b']`, title marked N1), `serverSection.test.ts` (one expected list after the first `queue.discard()`; `setup()` helper gains `reject`).
- Evidence the new tests fail on old behaviour: a temporary mutation of the current `writeQueue.ts` (in-flight `onDiscarded` call disabled, `drop` reverted to clearing all failures, `guard` removed) broke 14 tests and caused one unhandled rejection; the file was restored and 96/96 passed again. N2, N4, H2 and the sentinel-key tests were reasoned, not executed against old code.

Visible to M5: `ProjectSessionSnapshot.epoch`; `begin(sameId, rev)` resets the queue (no manual `queue.reset()`); `WriteQueue.dispose()`; the queue must be created before any session listener that writes during `begin` (H1); `queue.discard()` reverts the in-flight entry too; listener exceptions are logged, not thrown.

Remaining risks: after a `discard` whose in-flight request ends in a network error the server outcome is unknown (may have committed; documented); a session listener that throws inside `publish` is not guarded; a disposed queue cannot be reused. The second round has not been independently reviewed.

## H1/H3 follow-up (2026-10-13)

- H1: `enqueue` and `reportLocalRejection` synchronize the session epoch before accepting work. A listener registered before the queue can now enqueue during `begin` without the queue's later subscription callback dropping that write.
- H3: `ProjectSession` logs each throwing subscriber and continues notifying the others. A subscriber exception no longer interrupts `enqueue`, `publish`, or the next queued send.
- Focused regression tests cover both paths in `writeQueue.test.ts` and subscriber isolation in `projectSession.test.ts`. The subscription-order caveat in `docs/architecture.md` was updated.

## Third review follow-up: NF1–NF3 (2026-10-14)

- NF1: Section and collection writes enter the queue before mirror listeners are notified. Collection batches skip an older entry if a session listener has already replaced it. Section and collection listeners are notified independently; a throwing listener is logged and does not interrupt the write or later listeners.
- NF2: A 409 received after an in-flight write was dropped or discarded is kept as a sticky `conflict`, without requeueing that write.
- NF3: A collection tracks its locally rejected keys, including new graph paths and `graphs[index]` sentinel keys, and clears them on collection `discard()`; hydration clears the tracking set.
- Eight targeted regression scenarios failed against the preceding code (NF1: four, NF2: two, NF3: two; one NF3 scenario extends an existing test). An additional new test covers a session listener replacing a later item in a collection batch. After the fixes, `npm test` passed 102 files / 1034 tests; `npm run build` and `npm run lint` exited 0 (existing warnings remain). The backend and dependency manifests were unchanged. Earlier review and repair sections above are historical snapshots; this section records the current behavior.

## Fourth review follow-up: NF4–NF6 (2026-10-14)

The fourth review's three findings were confirmed against the current source. Six focused regressions failed before the repair: section and collection `discard()` could revert a value written by a session listener during `drop` (NF4); `queue.discard()` published before its rollback callbacks (NF4); collection `hydrate()` forgot a local rejection without removing it from the queue (NF5); and a disposed queue left a section or collection mirror changed when `enqueue` threw (NF6).

- NF4: `ServerSection.discard()` and collection `discard()` revert only entries still identical to the pre-drop mirror. Queued `onDiscarded` callbacks likewise check the entry they belong to, so a later write cannot be reverted by an older callback. `WriteQueue.discard()` now runs rollback callbacks before publishing status. Collection `discard()` snapshots entries before dropping local rejection keys, preserving writes triggered by those drops.
- NF5: Collection `hydrate()` drops its tracked local rejection keys from the queue as well as clearing the tracking set. This works when hydration occurs without a new `begin()` or queue reset.
- NF6: Section and collection `write()` restore their previous in-memory mirror if `enqueue()` throws, including after `WriteQueue.dispose()`. The exception remains visible to the caller.
- Two further tests cover a section write triggered by `enqueue`'s session notification and a collection write triggered while `discard()` clears another local rejection. Neither required a separate code change beyond the NF4 repair.

Changed in this follow-up: `shared/project-store/serverSection.ts`, `writeQueue.ts`, their two test files, and the M4 decisions in `docs/architecture.md`. No backend or dependency changes. After repair, `npm.cmd test -- --run` passed 102 files / 1042 tests; `npm.cmd run build` and `npm.cmd run lint` exited 0 (existing warnings remain). The real backend end-to-end path remains outside M4's frontend-only scope. The earlier review and repair sections above are historical snapshots.
