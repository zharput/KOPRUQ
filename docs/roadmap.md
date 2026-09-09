# SPANOVA Roadmap

Milestones and gating rules are defined in `docs/SPANOVA_MASTER_SPEC.md`
section 20, with content remapped per
`docs/ARCHITECTURE_AMENDMENT_V2.md` (P06/P07 now target MIDAS NX, not
ALLPLAN; P12 now covers SCIA and, if wanted, ALLPLAN). This file tracks
status only. Never start a milestone marked "Not started" without the
engineer's explicit approval (spec section 24).

This is the **second** roadmap: P00-P05 were previously completed on a
C#/.NET/Avalonia stack (see `archive/v2-csharp-avalonia/`), then the
engineer moved the whole platform to the stack below. Status resets to
P00 for the new stack; the archived work is reference only, not a
completed prerequisite.

| Milestone | Scope (as remapped) | Status |
|---|---|---|
| P00 | Repo/module foundation for the new stack: Maven multi-module backend + React/Vite frontend, minimal dependency graph, docs | **Done** |
| P01 | Bridge Core: `Project`, `Bridge`, `SpanLayout`, `Span`, `Deck`, `Girder`, `Pier`, `Foundation`, `DesignSpace`, `BridgeAlternative`; SI units; tests | **Done** |
| P02 | Basic React frontend: 9 raw fields + GENERATE button, calling the backend API - no dashboard yet | **Done** (this session) |
| P03 | First computational design engine: feasible span-layout/girder alternative generation, shown in a table | **Done** (this session) |
| P04 | Rules Engine infrastructure + only rules the engineer explicitly provides and approves | **Done** (this session) - infrastructure only, zero real rules |
| P05 | Simple bridge elevation/profile preview (no photorealistic 3D) | **Done** (this session) |
| P06 | **MIDAS NX Adapter**: `BridgeAlternative` -> MIDAS Civil NX model over MAPI (no GUI automation yet) | **MIDAS-P01 round trip done** (this session) - see notes below. Full `BridgeAlternative` wiring not yet done. |
| P07 | **MIDAS NX Analysis Integration**: run the analysis, retrieve results, associate with a `BridgeAlternative` | Not started |
| P08 | Quantities, then cost, then carbon | Not started |
| P09 | Generative multi-objective optimization (Optimization Service, Python/FastAPI), Pareto front | Not started |
| P10 | Professional "Design Cockpit" React UI (Project/Geometry/Design Space/Generate/Analyze/Optimize/Results/Report) - see `Spanova_menü.jpg` / `Spanova_menü_dark.jpg` in the repo root for the target look | Not started |
| P11 | AI Service (Python/FastAPI): natural-language -> deterministic SPANOVA parameters; never a structural-safety authority | Not started |
| P12 | Additional solver adapters: SCIA Engineer, and ALLPLAN Civil if still wanted | Not started |

## P00 (new stack) - what was actually done

- [x] Local toolchain installed: JDK 21 (Microsoft build, via winget),
      Node.js LTS (via winget), Apache Maven 3.9.16 (winget had no
      matching package - downloaded the official Apache binary
      distribution directly and added it to PATH via `~/.bashrc`).
- [x] `backend/` - Maven multi-module: `bridge-core`, `rules-engine`,
      `generative-engine`, `analysis-api`, `midas-adapter`, `api`. Every
      non-`api` module has zero Spring dependency by design. Dependency
      graph matches `docs/architecture.md`.
- [x] `backend/api` - Spring Boot 3.5.16 application. Builds to a real
      fat jar (`mvn package`, `spring-boot-maven-plugin` with an
      explicit `repackage` execution - the plugin does NOT bind
      automatically when the parent isn't `spring-boot-starter-parent`,
      which this project doesn't use since it has its own multi-module
      parent). **Verified running**: `java -jar api/target/api-*.jar`
      then `curl localhost:8080/actuator/health` returned
      `{"status":"UP"}`.
- [x] `frontend/` - Vite `react-ts` template, unmodified. `npm install`
      and `npm run build` both verified successful.
- [x] `services/optimization-service/`, `services/ai-service/` -
      placeholder folders with README only, per spec sections 16/17
      (optimization and AI are explicitly deferred past P01).
- [x] `docs/ARCHITECTURE_AMENDMENT_V2.md` - records the stack change and
      the ALLPLAN -> MIDAS NX swap for P06/P07/P12, with the engineer's
      stated reasoning.
- [x] `CLAUDE.md`, `docs/architecture.md` rewritten for the new stack.
- [ ] No domain model, no REST endpoints beyond `/actuator/health`, no
      frontend content beyond the Vite template - all correctly out of
      scope for P00.

## P01 - what was actually done

- [x] `backend/bridge-core/src/main/java/com/spanova/bridgecore/`:
      `Bridge`, `Span`, `SpanLayout`, `Deck`, `Girder`, `Pier`,
      `Foundation` (+ `FoundationType`), `DesignSpace`,
      `BridgeAlternative`, `Project` - every field sourced from spec
      sections 6-9, none invented (same two documented gaps as the
      archived C# build: no spread-footing dimensions, `Pier.pierType`
      is a free-text label not an enum).
- [x] Modelled as Java 21 records (immutable value types) except
      `Project`, which stays a mutable class since it represents
      evolving session state - `Deck`/`Pier`/`Foundation` are nullable
      on `BridgeAlternative` **from the start** this time, learning
      directly from the archived build's mid-P03 revision (P03's own
      scope only touches span-layout + girder).
- [x] SI units throughout (`double`, meters, `...M`-suffixed field
      names) - same convention as the archived C# build, carried over
      by choice (documented in `docs/architecture.md`) rather than
      re-litigated.
- [x] 10 new tests in `bridge-core` (`SpanLayoutTest`,
      `BridgeAlternativeTest`, `ProjectTest`) - all passing.
- [x] Full reactor build (`mvn clean package`) succeeds; P01's success
      criterion ("a bridge can be represented independently of MIDAS")
      is met by
      `BridgeAlternativeTest.canBeFullyConstructed_withoutAnyMidasOrExternalType`.
- [ ] No rules, no analysis, no MIDAS integration, no frontend content,
      no persistence yet - all correctly out of scope for P01.

## P02 - what was actually done

- [x] `backend/api`: `KernelStateController` (`POST /api/kernel-state`)
      + `KernelStateRequest`/`KernelStateResponse` DTOs. Builds a real
      `bridge-core` `Bridge` + `DesignSpace` from the 9 posted fields and
      returns them as JSON - fields not on the P02 form (girder spacing,
      slab thickness, pier diameter/height) are zeroed, not invented.
      `@CrossOrigin(origins = "http://localhost:5173")` added as a P02
      dev convenience (needs a real CORS/proxy decision later).
- [x] Added `<parameters>true</parameters>` to the shared compiler config
      (parent `pom.xml`) - required for Jackson to (de)serialize Java
      records by constructor-parameter name.
- [x] `frontend/src/App.tsx` rewritten: plain form with the same 9
      labeled fields as spec section 20, a GENERATE button, and a `<pre>`
      panel showing the backend's JSON response verbatim - deliberately
      not styled as a dashboard. Default Vite demo content/assets
      removed.
- [x] `.claude/launch.json` added (`spanova-frontend`: `npm --prefix
      frontend run dev`, port 5173) so the dev server can be previewed.
- [x] **Verified end-to-end in a real browser**, not just unit tests:
      started the backend jar, started the Vite dev server, opened it in
      the Browser pane, read the default-filled form, clicked GENERATE,
      confirmed the JSON response matched the real `Bridge`/`DesignSpace`
      values; changed Bridge Length to 350 and clicked GENERATE again -
      the response updated to `"totalLengthM": 350`, proving live data
      flow rather than a cached/static response. Both processes stopped
      afterward.
- [x] 1 new backend test (`KernelStateControllerTest`, direct unit test
      - no Spring context needed since the controller method is a plain
      function): 11 backend tests total, all passing. Frontend has no
      test framework configured yet (Vite's `react-ts` template ships
      none) - not added in P02 since nothing in this milestone's scope
      needs it; revisit when P03's logic is complex enough to warrant one.
- [ ] No alternative generation, no rules, no MIDAS integration, no
      persistence, no dashboard - all correctly out of scope for P02.

## P03 - what was actually done

- [x] `backend/generative-engine`: `AlternativeGenerator` ported from the
      archived C# build's combinatorial logic (uniform span layouts ×
      girder count × girder depth, stepped by
      `DesignSpace.DEFAULT_GIRDER_DEPTH_STEP_M = 0.10`) - no new
      engineering rule introduced, purely a re-expression of P01's own
      `DesignSpace`/`SpanLayout` definitions. 6 new tests, verified
      against the spec's own P03 worked example (210 m / 30-45 m span /
      4-8 girders / 1.8-2.5 m depth -> span counts {5, 6, 7}, 120 total
      combinations).
- [x] `backend/api`: `POST /api/alternatives`
      (`AlternativeGenerationController`) reuses the same 9-field
      `KernelStateRequest` as P02 and returns a flat `AlternativeRow` list
      (a presentation DTO - `bridge-core` stays free of API/JSON
      concerns). `KernelStateRequest` gained `toBridge()`/`toDesignSpace()`
      mapper methods so both endpoints build from the same request without
      duplicating the mapping.
- [x] `frontend/src/App.tsx`: GENERATE now calls both endpoints in
      sequence and renders a plain table (span count, span length, total
      length, girder count, girder depth) below the existing kernel-state
      `<pre>` panel - still no dashboard styling (P10 scope).
- [x] **Verified end-to-end in a real browser**: started the backend jar,
      opened the running Vite dev server in the Browser pane, clicked
      GENERATE with the default form (VIA-35 example) - got 120 rows with
      span counts {5, 6, 7}, matching the spec example exactly. Changed
      Minimum Girder Count from 4 to 6 and re-clicked GENERATE - result
      dropped to 72 rows (3 span counts x 3 remaining girder counts x 8
      depths), proving live data flow rather than a cached/static
      response, same rigor as the P02 verification.
- [x] 2 new backend tests (`AlternativeGenerationControllerTest`,
      re-checks the same spec example through the controller): 13 backend
      tests total, all passing.
- [ ] No Rules Engine filtering (P04, still zero rules - "feasible" here
      is exactly the generator's own definitional feasibility), no
      elevation preview, no MIDAS integration - all correctly out of
      scope for P03.

## P04 - what was actually done

- [x] `backend/rules-engine` (`com.spanova.rules`): `EngineeringRule`
      interface (id/description/evaluate), `RuleEvaluation` record
      (passed + reason), `RuleOutcome` (one rule's id/description paired
      with its evaluation - the unit of traceability), `RuleEngineResult`
      (overall feasible + every outcome), `RuleEngine` (runs a list of
      rules against one `BridgeAlternative`/`Bridge`/`DesignSpace`,
      **defaults to an empty list**). `generative-engine` already
      depended on `rules-engine` since P00 - no new module edge needed.
- [x] **Zero real rules shipped**, per spec section 22 and the engineer's
      explicit instruction this session ("şu an için atlayalım"). Not
      even the archived C# build's "definitional" range-check rules were
      ported: `AlternativeGenerator`'s combinatorics already only
      produce alternatives inside the posted `DesignSpace`, so those
      checks would always trivially pass here and add no real filtering
      - only the appearance of rules.
- [x] `backend/api`: `AlternativeGenerationController` now runs every
      generated alternative through a (currently empty) `RuleEngine` and
      `AlternativeRow` gained a `feasible` field - wiring is real, not
      decorative, ahead of the first real rule. `frontend/src/App.tsx`'s
      results table gained a "Feasible" column driven by that field.
- [x] **Verified end-to-end in a real browser**: GENERATE with the
      default VIA-35 example still returns 120 alternatives, every row
      now showing `Feasible = Yes` (expected: no rules to fail).
- [x] 3 new `rules-engine` tests (`RuleEngineTest` - empty ruleset is
      always feasible; pass/fail/traceability proven with test-only fake
      rules, never shipped as real ones) + 1 new `api` test
      (`AlternativeGenerationControllerTest` - every row feasible with no
      rules approved): 17 backend tests total, all passing.
- [ ] No real engineering rule content (span/depth ratio, pier
      slenderness, foundation-vs-site-constraint, etc.) - all correctly
      out of scope until the engineer supplies one with source, units,
      limit, assumptions and a validation example (spec section 11).

## Desktop packaging (Tauri) - tried, then reverted (this session)

Not one of the numbered P00-P12 milestones - a cross-cutting architecture
question the engineer raised and then resolved within the same session.

- [x] `frontend/src-tauri/` scaffolded (`npx tauri init`), verified
      working (`npm run tauri dev` opened a real native "SPANOVA" window,
      confirmed via screenshot that the P04 UI rendered correctly inside
      it). A real Vite-vs-Cargo `EBUSY` file-watcher bug was hit and
      fixed along the way.
- [x] **Reverted the same session**: engineer confirmed the frontend
      should stay a plain web app instead. `frontend/src-tauri/` deleted,
      `@tauri-apps/cli` uninstalled, `vite.config.ts` reverted. Rust and
      VS Build Tools remain installed on the machine (harmless, not
      referenced by any build script) in case the desktop-shell question
      returns later.
- Confirmed this reversal has **zero effect on MIDAS reachability**: the
  MIDAS connection lives entirely in the backend's `midas-adapter`
  module, which the frontend never talks to directly - proved by the
  MIDAS-P01 round trip (see below), which used plain HTTP with no
  frontend involved either way.

## P05 - what was actually done

- [x] `frontend/src/App.tsx`: alternatives table gained a radio-button
      "Select" column (row click also selects) - there was previously no
      concept of a "selected alternative" in the frontend.
- [x] New `ElevationPreview` component: an inline SVG schematic side view
      of the selected alternative - deck as a rectangle spanning the full
      bridge length, span-boundary markers as position-only vertical
      lines (no height/size - `Pier` is still `null`/unmodelled as of
      P01, so drawing a sized pier would invent a dimension), per-span
      length labels, and a caption with total length/span count/girder
      depth. Girder depth drives the deck rectangle's thickness via a
      deliberately EXAGGERATED px/meter factor (same approach as the
      archived C#/Avalonia build's `DrawElevationCore` - real girder
      depths, ~1.8-2.5 m, are visually imperceptible next to 30-45 m
      spans at true 1:1 scale) - labelled "not to scale" in the caption,
      a display choice, not an engineering quantity.
- [x] No photorealistic 3D, no backend changes - purely a frontend
      rendering of data `/api/alternatives` already returns.
- [x] **Verified end-to-end in a real browser**: selected the first
      generated row, confirmed via direct DOM inspection that the SVG
      renders the correct span labels (5 x "42.0 m") and caption ("Total:
      210.0 m | 5 span(s) | girder depth 1.80 m..."); selected a
      different row (girder depth 2.10 m) and confirmed the preview
      re-rendered live with the deck-rectangle height recalculated
      exactly (2.10 x 15 = 31.5 px), proving the exaggeration-scale math
      and the selection wiring are both correct.
- [ ] No dashboard styling (P10 scope), no MIDAS integration - all
      correctly out of scope for P05.

## P06 (MIDAS-P01 round trip) - what was actually done

Per the engineer's own MIDAS integration prompt (2026-09-09): analysis
first, no production code until approved. Full write-up in
`docs/MIDAS_INTEGRATION_ANALYSIS.md`.

- [x] Read MIDAS Civil NX's official Open API documentation live (the
      support site blocks plain HTTP fetches - read through a real
      browser session instead). Full capability matrix produced: model
      creation, boundary conditions, all load types, load combinations,
      construction stages, seismic, and result extraction are all
      officially documented and available.
- [x] Confirmed the connection architecture: client -> HTTPS -> MIDASIT's
      own AWS relay -> WebSocket -> the engineer's own running Civil NX
      desktop app, authenticated by a `MAPI-Key` header generated inside
      Civil NX itself (Apps > API > API Settings). Not a local-only or
      headless mechanism - a real desktop instance must be open.
- [x] **Live round trip proven** against the engineer's own Civil NX,
      using raw HTTP calls (not yet wired into Java): built a 20 m
      simply-supported beam (material, section, nodes, element, supports,
      self-weight) via the verified `/db/*` endpoints, ran the analysis
      (`POST /doc/anal` - confirmed synchronous, ~10s), and extracted
      reactions and displacements via `POST /post/table`. Both results
      matched independent hand calculations exactly (980 kN total
      reaction from 20x2x1 m x 24.5 kN/m3; 0.000817 rad end rotation from
      wL^3/24EI).
- [x] **Permanent Java implementation written**, after a brief pause to
      resolve the frontend web-vs-desktop question (confirmed: plain web
      app, which turned out to have zero effect on MIDAS reachability -
      MIDAS-P01 was itself the proof, since it used raw HTTP with no
      frontend involved either way):
      - `backend/analysis-api` (`com.spanova.analysis`): `AnalysisEngine`
        port (`submit`/`getStatus`/`getResults`/`cancel`), `AnalysisRequest`
        (nodes/elements/materials/sections/supports/loadCases/selfWeights -
        MIDAS-P01-minimal fields only), `AnalysisResult`
        (reactions/displacements only), `AnalysisJob`/`AnalysisJobId`/`AnalysisStatus`.
      - `backend/midas-adapter` (`com.spanova.midas`): `MidasApiClient`
        (the only class touching the network - `java.net.http.HttpClient`,
        `MAPI-Key` header, no extra HTTP library), `MidasModelBuilder`
        (pure `AnalysisRequest` -> MIDAS `/db/*` calls), `MidasResultExtractor`
        (pure `/post/table` request-building + response-parsing), and
        `MidasCivilNxAnalysisEngine` (orchestrates all three, implements
        `AnalysisEngine` - `submit()` runs synchronously to completion,
        matching `/doc/anal`'s verified blocking behaviour).
      - `MidasHttpClient` interface extracted so the orchestration class
        is unit-testable without a mocking framework or live MIDAS.
      - Credentials (Base URL + MAPI-Key) now live in
        `backend/api/src/main/resources/application-local.properties` -
        gitignored, never hardcoded, loaded via the Spring `local` profile.
- [x] **14 new tests, all passing without a live MIDAS connection**:
      `MidasModelBuilderTest` (8 - every JSON shape matches the verified
      live payloads exactly), `MidasResultExtractorTest` (3 - parses the
      ACTUAL response bodies captured from the live round trip, plus
      re-derives the 980 kN/0.000817 rad hand calculations as a second
      check), `MidasCivilNxAnalysisEngineTest` (3 - full orchestration
      against a fake `MidasHttpClient`, including the FAILED-job path on
      a MIDAS error). 36 backend tests total, all passing.
- [x] **Permanent Java code re-verified live**, not just curl: a
      throwaway `main()` wired the real `MidasApiClient` +
      `MidasCivilNxAnalysisEngine` against the engineer's own running
      Civil NX and reproduced the exact same result as the earlier curl
      test (FZ=490/490 kN, RY=0.000817/-0.000817 rad, ~37s end to end),
      then was deleted - the permanent code lives only in
      `analysis-api`/`midas-adapter`, nothing scratch was kept.
- [ ] Not yet done: wiring a real `BridgeAlternative` into
      `AnalysisRequest` (still hand-built requests, not generative-engine
      output), load combinations, moving loads, construction stages,
      seismic, tendons, `AnalysisJobManager`/batching, bearing/foundation
      iteration - all later MIDAS milestones per
      `docs/MIDAS_INTEGRATION_ANALYSIS.md`.

## P06 - real project validation (VIA-35, this session)

Extended MIDAS-P01's hand-built test beam into a full model of the
engineer's real VIA-35 project (Sibiu-Pitesti motorway, from a real
drawing set the engineer shared): 3 spans (39.5+40.5+39.5 = 119.5 m),
precast I-girders, circular piers, C30/37 concrete.

- [x] `AnalysisSection` sealed into three shapes with verified MIDAS
      vSIZE mappings: `SolidRectangleSection` ("SB", MIDAS-P01's own test
      beam), `ISection` ("H" - top/bottom flange width+thickness, web
      thickness, matches MIDAS's asymmetric I/H value-section schema),
      `SolidCircularSection` ("SR" - diameter, for piers). 2 new
      `MidasModelBuilder` tests (16 midas-adapter tests total).
- [x] `EurocodeConcrete` (`analysis-api`): EN 1992-1-1:2004 Table 3.1
      formulas (Ecm = 22*(fcm/10)^0.3 GPa, fcm = fck+8), Poisson's ratio
      0.2 (3.1.3(4)), thermal coefficient 1e-5/degC (3.1.3(5)), unit
      weight 25 kN/m3 (EN 1991-1-1 Table A.1) - all cited, none invented.
      Cross-checked against the code's own published C30/37 row
      (fck=30 -> Ecm=32837 MPa, verified via eurocodeapplied.com's
      published table 2026-09-09). 3 new tests.
- [x] Engineering inputs came entirely from the engineer, explicitly:
      girder section (h=1.90, top flange 1.50x0.20, bottom flange
      0.80x0.40, web 0.25), pier heights (P1=10m, P2=12m, from real
      drawings), concrete class (C30/37, confirmed after flagging that
      "C30/35" the engineer first said isn't a real EN class), and the
      modelling simplification for pier continuity (continuous beam over
      piers for this first pass, not simply-supported-per-span with
      bearing releases - the engineer's own choice, to avoid needing an
      unverified beam-end-release schema before a first numeric check).
- [x] **Verified live** against the engineer's own Civil NX: total
      vertical self-weight reaction from MIDAS (7246.55 kN) matched an
      independent hand calculation from section area x unit weight x
      length (~7246.3 kN) almost exactly. Reaction/displacement pattern
      (piers carrying far more than abutments, non-zero pier-base moment
      from continuous-frame action) is structurally sensible.
- [ ] This model represents ONE representative girder line, not the real
      cross-section's 6 parallel girders - self-weight/reactions are
      per-girder-line, not whole-bridge totals. No bearings (rigid
      connection assumed), no pile/soil foundation stiffness (pier bases
      fixed), no simply-supported-span release. All flagged, none
      invented - real refinements for later milestones.

## Note on the two archived generations

`archive/` (root-level, pre-amendment) - the original informal build,
before milestone gating was adopted.

`archive/v2-csharp-avalonia/` - the disciplined C#/.NET/Avalonia build,
P00 through P05 complete (including a real, documented bugfix: Avalonia
DataGrid row selection required the DataGrid package's own theme
resource, `avares://Avalonia.Controls.DataGrid/Themes/Fluent.xaml`,
which is easy to miss). Worth reading for *how* a problem was solved
(e.g. `Spanova.Generative.AlternativeGenerator`'s uniform-span
combinatorics, the schematic elevation-preview approach) even though the
code itself is not reused.
