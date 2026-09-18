# SPANOVA Architecture

Status: **P06's MIDAS-P01 round trip + real VIA-35 model done; P10's UI
shell also done, out of milestone order; SITE-P01's `spatial-core` +
`alignment` modules done; LAYOUT-P01 done end-to-end (`constraints` +
`bridge-layout` + REST endpoint + Layout Generator frontend screen) and
seamed into Bridge Design (P03's structural generation - pick a feasible
layout -> runs with its bridge length/span locked in); sidebar
navigation now matches the engineer's full target menu exactly (~45
leaves, 6 collapsible groups + Home/3D & Visualization/Reports
standalone); **the native `spanova-analysis-engine` (addendum P) is now
real** - a linear-elastic 3D direct-stiffness solver, verified against
closed-form results and live-run on the engineer's own 5-span
frame-bridge test case (SPANOVA Fast Solver screen)** for the new
polyglot stack - see `docs/roadmap.md`. This document describes the *shape* of the system as
of `docs/ARCHITECTURE_AMENDMENT_V2.md`, now also being extended per
`docs/SITE_LAYOUT_PLATFORM_ANALYSIS.md` (site/corridor/layout platform +
native analysis engine - engineer approved starting with its first
roadmap step, `spatial-core`/`alignment`, on 2026-09-10; the rest of
that document's proposal is implemented incrementally, module by
module, not all at once); it will be extended, not rewritten, as
milestones land.

## Core architectural principle (spec section 3, unchanged)

SPANOVA has its own independent **Bridge Core**. It must never depend on
MIDAS, ALLPLAN, SCIA, a specific FEM solver, or a specific BIM format.
External engineering applications are reached only through adapter
modules.

```
                    SPANOVA
                       |
                 BRIDGE CORE (backend/bridge-core)
                       |
       +---------------+---------------+
       |               |               |
    MIDAS NX          SCIA           ALLPLAN
    Adapter          (future)        (future, if wanted)
  (backend/midas-adapter)
```

## Repository / module structure

```
SPANOVA/
â”œâ”€â”€ frontend/                      React + TypeScript (Vite), web app (browser-based)
â”œâ”€â”€ backend/                       Maven multi-module, Java 21
â”‚   â”œâ”€â”€ pom.xml                     parent (dependency management: Spring Boot 3.5.16 BOM, JUnit 5 BOM)
â”‚   â”œâ”€â”€ spatial-core/                 coordinate/point primitives (site/layout domain) - no deps
â”‚   â”œâ”€â”€ alignment/                    chainage <-> XYZ geometry - depends on spatial-core
â”‚   â”œâ”€â”€ constraints/                  NoPierZone (chainage-range, LAYOUT-P01 scope) - no deps
â”‚   â”œâ”€â”€ bridge-layout/                Bridge Layout Engine (LAYOUT-P01) - depends on alignment, constraints
â”‚   â”œâ”€â”€ bridge-core/                 solver-independent domain model - no deps
â”‚   â”œâ”€â”€ rules-engine/                deterministic feasibility - depends on bridge-core
â”‚   â”œâ”€â”€ generative-engine/           alternative generation - depends on bridge-core, rules-engine
â”‚   â”œâ”€â”€ analysis-api/                job/status/result ports - depends on bridge-core
â”‚   â”œâ”€â”€ midas-adapter/               MIDAS-specific code - depends on bridge-core, analysis-api
â”‚   â””â”€â”€ api/                         Spring Boot app - depends on all of the above
â”œâ”€â”€ services/                       Python, deferred to after P01
â”‚   â”œâ”€â”€ optimization-service/        placeholder only
â”‚   â””â”€â”€ ai-service/                  placeholder only
â”œâ”€â”€ docs/
â”‚   â”œâ”€â”€ SPANOVA_MASTER_SPEC.md       authoritative spec (v1, kept verbatim)
â”‚   â”œâ”€â”€ ARCHITECTURE_AMENDMENT_V2.md  supersedes spec sections 3/4/12-14/19-20's tech choices
â”‚   â”œâ”€â”€ architecture.md              this file
â”‚   â””â”€â”€ roadmap.md                   milestone status
â””â”€â”€ archive/                        two earlier build generations - reference only
```

## Dependency graph (Maven)

```
spatial-core                             (no dependencies)
alignment           -> spatial-core
constraints                              (no dependencies)
bridge-layout       -> alignment, constraints
bridge-core                              (no dependencies)
rules-engine        -> bridge-core
generative-engine   -> bridge-core, rules-engine
analysis-api        -> bridge-core
midas-adapter       -> bridge-core, analysis-api
api                 -> bridge-core, rules-engine, generative-engine, analysis-api, midas-adapter
                    -> spring-boot-starter-web, spring-boot-starter-actuator
```

`spatial-core`/`alignment`/`constraints`/`bridge-layout` are not yet
wired into `api` - no REST endpoint exists for them (SITE-P01/LAYOUT-P01
built and unit-tested this geometry/combinatorial logic in isolation
only, per `docs/SITE_LAYOUT_PLATFORM_ANALYSIS.md`'s own "don't add a
dependency ahead of the milestone that needs it" rule, carried over from
this file's rule below). `bridge-layout` does not depend on
`bridge-core` and vice versa yet - the seam between them
(`StructuralAlternativeBuilder`, per the analysis document's section C)
is a later milestone; `bridge-core`'s existing P01 domain model is
unchanged.

Every module currently contains **only a `package-info.java`**
documenting its future purpose (P00's own success criterion is just
"complete solution builds successfully" - spec section 20). `frontend/`
is the unmodified Vite `react-ts` template. `api` exposes only
`/actuator/health` today (verified: returns `{"status":"UP"}`).

**Do not add a dependency ahead of the milestone that needs it.** If you
find yourself wiring a new module edge or a new frontend->backend call
for a feature that doesn't exist yet, stop - that's a sign of building
ahead of the approved milestone (same discipline as the archived
C#/Avalonia build's P00, which held for P00-P05 there).

## Desktop packaging (Tauri) - tried, then reverted

Earlier in the 2026-09-09 session the engineer asked for the frontend to
be a Windows desktop app rather than a website; `frontend/src-tauri/`
(Rust, via `npx tauri init`) was scaffolded, wrapped the same React/Vite
app in a native WebView2 window, and was verified working (`npm run
tauri dev` opened a real "SPANOVA" window, confirmed by screenshot; a
real Vite-vs-Cargo `EBUSY` file-watcher bug was hit and fixed along the
way). Later the same session, the engineer reconsidered and confirmed:
**frontend is a plain React + Vite web app** - `frontend/src-tauri/` and
the `@tauri-apps/cli` dependency were removed, `vite.config.ts` reverted.

This does not affect MIDAS reachability at all: the MIDAS connection
lives entirely in the backend's `midas-adapter` module (P06, still an
empty skeleton - see `docs/MIDAS_INTEGRATION_ANALYSIS.md`), which the
frontend never talks to directly regardless of whether it's a browser tab
or a native window - confirmed by the MIDAS-P01 round-trip test, which
used plain HTTP calls with no frontend involved either way.

Kept only as a reminder should the desktop-shell question come back:
Rust + VS Build Tools remain installed on this machine, so re-adding
Tauri later is a `npx tauri init` away, not a fresh toolchain install.

## Units

Spec section 7: "All internal engineering data shall use a consistent SI
unit strategy." **Resolved in P01**, carried over from the archived
C#/Avalonia build without change: plain `double` fields, always meters,
always named with an explicit `M` suffix (`totalLengthM`, `depthM`,
`spacingM`, ...). No dedicated `Length`/`Quantity` value type - revisit
only if a real need appears (e.g. a unit conversion at the MIDAS
adapter's boundary).

## P01 domain model (`backend/bridge-core`)

```
Project (mutable)
â”œâ”€â”€ Bridge                 (bridgeName, totalLengthM, deckWidthM)
â”œâ”€â”€ DesignSpace              (Min/Max ranges + girderDepthStepM - see below)
â”œâ”€â”€ generatedAlternatives : List<BridgeAlternative>
â””â”€â”€ selectedAlternativeId : UUID?

BridgeAlternative           (P01's success-criterion type - spec section 20)
â”œâ”€â”€ spanLayout : SpanLayout { spans: List<Span> }, Span = { lengthM }   (required)
â”œâ”€â”€ girder : Girder (count, depthM, spacingM)                          (required)
â”œâ”€â”€ deck : Deck? (slabThicknessM)                                      (nullable - not sized until Deck enumeration is approved)
â”œâ”€â”€ pier : Pier? (diameterM, heightM, pierType: String)                (nullable - not sized until Pier enumeration is approved)
â””â”€â”€ foundation : Foundation? (type: SPREAD|PILE, pileCount?, pileDiameterM?) (nullable - ditto)

DesignSpace: Min/Max for Span, GirderCount, GirderSpacing, GirderDepth,
             SlabThickness, PierDiameter, PierHeight, plus
             girderDepthStepM (search-resolution, not an engineering
             quantity) - every field name taken directly from spec
             section 9, all classes are Java records (immutable).
```

Every field above is traceable to spec sections 6-9 - none were
invented. Same two intentional gaps as the archived C# build, both
because the spec does not name the missing parameters (spec section 22
forbids guessing them):

- **Spread-footing dimensions** are not modelled (only `pileCount`/
  `pileDiameterM` for `FoundationType.PILE`) - ask the engineer what
  parameters describe a spread footing at this preliminary-sizing level
  before adding them.
- **`Pier.pierType`** is a free-text `String`, not an enum - the spec
  names "Pier Type" as a variable but never lists allowed values.

## P02 API surface (`backend/api`, `frontend`)

`POST /api/kernel-state` - the only endpoint so far. Request/response
DTOs live in `com.spanova.api.kernel`. Note for every future endpoint:
Maven's compiler plugin now passes `-parameters` (parent `pom.xml`) so
Jackson can (de)serialize `bridge-core`'s Java records directly without
per-field `@JsonProperty` annotations - keep relying on this rather than
hand-writing DTOs that duplicate `bridge-core` types when a plain
pass-through is all that's needed (`KernelStateResponse` returns the
real `Bridge`/`DesignSpace` objects, not a re-typed copy).

`frontend/src/App.tsx` calls the API directly at
`http://localhost:8080` (hardcoded `API_BASE`) - revisit with an env
var / Vite proxy once deployment shape is decided (not needed for local
dev so far).

## P03 API surface (`backend/generative-engine`, `backend/api`, `frontend`)

`POST /api/alternatives` (`AlternativeGenerationController`) - reuses
the same `KernelStateRequest` DTO as `/api/kernel-state`, which now
carries `toBridge()`/`toDesignSpace()` mapper methods so both endpoints
build their `bridge-core` objects the same way without duplicating the
mapping. Returns `List<AlternativeRow>`, a flat presentation DTO
(`com.spanova.api.alternatives`) built from `bridge-core`'s
`BridgeAlternative` - kept out of `bridge-core` itself since it's purely
an API/table-shaping concern.

`AlternativeGenerator` (`com.spanova.generative`) enumerates uniform
span layouts x girder count x girder depth within the posted
`DesignSpace`, stepped by `DesignSpace.DEFAULT_GIRDER_DEPTH_STEP_M`.
"Feasible" at generation time means exactly this generator's own
definitional feasibility (fits within the min/max ranges).

`frontend/src/App.tsx`'s GENERATE button now calls `/api/kernel-state`
then `/api/alternatives` in sequence and renders the result as a plain
table - no dashboard styling yet (P10 scope).

## P04 Rules Engine (`backend/rules-engine`, `backend/api`, `frontend`)

`com.spanova.rules`: `EngineeringRule` interface (`id()`,
`description()`, `evaluate(BridgeAlternative, Bridge, DesignSpace)`),
`RuleEvaluation` (passed + reason), `RuleOutcome` (one rule's identity
paired with its evaluation - the unit of traceability), `RuleEngineResult`
(overall `feasible` + every `RuleOutcome`), and `RuleEngine` itself,
which runs a `List<EngineeringRule>` against one alternative and
**defaults to an empty list**. `generative-engine` already depended on
`rules-engine` since P00's dependency graph (no new module edge added).

**No rule content exists** - none should be added without the engineer's
explicit approval, source/reference, units, assumptions and a
validation-example test (spec section 22). `AlternativeGenerationController`
now runs each alternative through a `RuleEngine()` (empty) and
`AlternativeRow` carries the result as `feasible: boolean` - with no
rules, this is always `true`. This wires real P04 infrastructure end to
end (backend -> API -> frontend "Feasible" column) ahead of the first
real rule, matching the spec's own P04 success criterion ("generated
alternatives can be accepted/rejected with traceable rule results")
without inventing any rule to satisfy it.

## P05 Elevation preview (`frontend`)

`frontend/src/App.tsx`: the alternatives table gained a radio-button
"Select" column; the selected row is drawn by a new `ElevationPreview`
component as an inline SVG - a schematic side view, not photorealistic
3D (spec's own P05 instruction). Deck is a rectangle spanning the full
bridge length; its thickness is `girderDepthM` scaled by a deliberately
EXAGGERATED px/meter constant (documented in the component's own doc
comment, same approach as the archived C#/Avalonia build) since real
girder depths are visually imperceptible next to real span lengths at
true scale - the caption says "not to scale" explicitly. Span boundaries
get a position-only marker (a vertical line); no pier height/width is
drawn, since `Pier` is still `null`/unmodelled on `BridgeAlternative` as
of P01 - drawing a sized pier here would invent a dimension the domain
model doesn't have yet. No backend change - purely a rendering of what
`/api/alternatives` already returns.

## P06 MIDAS-P01 round trip (`backend/analysis-api`, `backend/midas-adapter`)

Full research write-up: `docs/MIDAS_INTEGRATION_ANALYSIS.md`. Summary of
what's actually built:

`com.spanova.analysis` (solver-independent - no MIDAS reference
anywhere): `AnalysisEngine` port (`submit`/`getStatus`/`getResults`/
`cancel`), `AnalysisRequest` (nodes/elements/materials/sections/
supports/loadCases/selfWeights), `AnalysisResult` (reactions/
displacements), `AnalysisJob`/`AnalysisJobId`/`AnalysisStatus`. Fields
are MIDAS-P01-minimal on purpose (a single hand-built beam, self-weight
only) - the record shapes are already generic enough that load
combinations, moving loads, construction stages etc. add new fields
later without reshaping the port.

`com.spanova.midas` implements that port:
- `MidasApiClient` - the only class touching the network. Plain
  `java.net.http.HttpClient` (JDK-provided, no extra HTTP library) with
  a `MAPI-Key` header. Base URL and key come from
  `application-local.properties` (gitignored) via Spring's `local`
  profile - never hardcoded.
- `MidasModelBuilder` - pure function, `AnalysisRequest` -> a
  `List<MidasApiCall>` (method/path/JSON body). No network access, fully
  unit-tested against the exact payload shapes verified live on
  2026-09-09 (`/db/matl`, `/db/sect`, `/db/node`, `/db/elem`, `/db/cons`,
  `/db/bodf`).
- `MidasResultExtractor` - pure function, builds `/post/table` requests
  and parses their `HEAD`/`DATA` response shape into
  `ReactionResult`/`DisplacementResult`. Unit-tested against the actual
  response bodies MIDAS returned during the live test.
- `MidasCivilNxAnalysisEngine` - orchestrates the three above.
  `submit()` runs synchronously to completion (MIDAS's `/doc/anal` was
  verified to block until the analysis finishes, ~10-40s depending on
  how many result tables are requested afterward) and stores the
  outcome in memory for `getStatus`/`getResults`. `cancel()` throws
  `UnsupportedOperationException` - genuinely nothing to cancel yet
  while `submit` is synchronous; this is not stubbed silently.
- `MidasHttpClient` - a one-method interface `MidasApiClient` implements,
  extracted purely so `MidasCivilNxAnalysisEngine` is unit-testable with
  a hand-written fake instead of a mocking framework (the project has
  none yet, and this doesn't need one).

**Verified twice**: once via raw curl (see roadmap.md), then again via
this actual permanent Java code wired to the same live MIDAS Civil NX -
both produced identical results (490/490 kN reactions, 980 kN total;
0.000817/-0.000817 rad end rotations), independently matched by hand
calculation.

**Not done yet**: a real `BridgeAlternative` is not wired into
`AnalysisRequest` - both MIDAS-P01's test beam and the VIA-35 model below
are hand-built requests, not generated alternatives. `ModelMapping`
(SPANOVA id <-> MIDAS id, needed once real `BridgeAlternative`s with
named piers/girders are involved) does not exist yet - node/element ids
are used directly as MIDAS ids, which is fine for hand-built test models
but is a simplification to revisit.

### VIA-35 real-project validation

`AnalysisSection` is now a sealed interface (`SolidRectangleSection`,
`ISection`, `SolidCircularSection`) with verified MIDAS vSIZE mappings
for each. `EurocodeConcrete` (`analysis-api`) derives EN 1992-1-1:2004
Table 3.1 concrete properties (Ecm, Poisson's ratio, thermal
coefficient, unit weight) from `fck` - a real engineering formula, cited
and unit-tested, not a hardcoded guess. Both were exercised on a
hand-built model of the engineer's real VIA-35 project (3 spans,
119.5 m total, precast I-girders, circular piers, C30/37 concrete, from
a real drawing set) and verified live: MIDAS's total self-weight
reaction (7246.55 kN) matched an independent hand calculation almost
exactly. The model represents one girder line (not the real 6-girder
cross-section), uses continuous-beam-over-pier connections (the
engineer's own choice, to avoid an unverified beam-end-release schema
for a first pass), and fixed pier bases (no soil/pile stiffness data
yet) - explicitly flagged simplifications, not invented values.

## P10 UI shell (`frontend/`, out of milestone order)

The engineer chose to skip P07-P09 for now and build the professional UI
shell early, matching the target mockup (`Spanova_menÃ¼.jpg`). `App.tsx`
is now `Sidebar` + `TopBar` + a content area that swaps between
`GenerateWorkflow` (P02-P05's form/GENERATE/table/preview, relocated
unchanged) for "Design Space"/"Generate", `HomePanel` (only the Quick
Actions list is real, each a disabled button naming its own future
milestone), and `PlaceholderPanel` (an honest "not built yet - milestone
X" for everything else) for the rest. `index.css`/`App.css` replaced the
Vite template's centered-marketing-page styling with the mockup's dark
theme. New dependency: `lucide-react` (icons matching the mockup's
style) - a normal frontend dependency for a UI-design milestone.

No dashboard widgets (map, stats, Pareto chart, Recent Projects) exist
yet - they need real project/alignment/analysis backend data that
doesn't exist until P07-P09 land.

## SITE-P01 spatial-core + alignment (`backend/spatial-core`, `backend/alignment`)

First implementation step of `docs/SITE_LAYOUT_PLATFORM_ANALYSIS.md`
(site/corridor/bridge-layout platform proposal, sections A-Q). Per that
document's own roadmap (section L, step 1) and its "smallest first
milestone" reasoning (section M, further narrowed by addendum Q): the
chainage<->XYZ conversion is the one primitive every later
site/layout/corridor type depends on, so it comes first, on its own,
fully unit-tested against hand-verified reference points before
anything is built on top of it.

- **`spatial-core`** (new module, no dependencies): `CoordinateSystem`
  (EPSG code + name), `Point3D` (x, y, z in meters).
- **`alignment`** (new module, depends on `spatial-core`):
  `ChainagePosition` (chainageM, offsetM, elevationM),
  `HorizontalElement` (sealed interface, permits only `StraightElement`
  for now), `StraightElement`, and the `Alignment` class itself -
  `toXYZ(ChainagePosition)` and `toChainage(Point3D)`, implemented as
  linear interpolation / nearest-point projection onto a straight
  segment (or a sequence of straight segments, for future multi-segment
  alignments - the loop already handles more than one element even
  though only one is used today).
- **Scope deliberately narrow**, matching the site/layout document's own
  addenda:
  - Only straight horizontal geometry (`StraightElement`) - circular
    arcs and transition curves are not implemented; a transition curve
    additionally needs the engineer's clothoid convention before it can
    be added (never invented - spec section 22).
  - No vertical alignment model at all - elevation is always supplied
    directly via `ChainagePosition.elevationM()`, never derived. This
    matches addendum Q: pier/abutment heights are entered externally for
    now, not computed from terrain or a deck profile.
  - Chainage is measured along the horizontal projection only (never
    3D/slope distance) - standard alignment convention. Offset is
    positive to the right of the direction of travel - also standard,
    stated explicitly in `Alignment`'s class javadoc as a software
    convention, not an engineering rule requiring the engineer's sign-off.
- **Tests**: `AlignmentTest` (12 tests) - hand-verified reference points
  on an eastward and a northward straight alignment (start/midpoint/end,
  left/right offset sign, `toChainage` as the inverse of `toXYZ`,
  out-of-range chainage rejection, clamped nearest-point projection
  beyond a segment's end). All pass; full backend reactor (`mvn package`,
  all 8 modules) still builds and all existing tests still pass -
  no regression in `bridge-core`/`rules-engine`/`generative-engine`/
  `analysis-api`/`midas-adapter`/`api`.
- **Not done yet, by design**: no REST endpoint, no frontend, no
  `TerrainModel`/`constraints`/`Corridor`/`BridgeLayoutEngine` (those are
  later roadmap steps in `docs/SITE_LAYOUT_PLATFORM_ANALYSIS.md` section
  L), no `spanova-analysis-engine` (addendum P - a separate, unstarted
  roadmap item).

## LAYOUT-P01 bridge-layout engine (`backend/constraints`, `backend/bridge-layout`)

Second implementation step of `docs/SITE_LAYOUT_PLATFORM_ANALYSIS.md`,
following on from SITE-P01. Scope is the M/Q-narrowed LAYOUT-P01: one
straight `Alignment`, one `BridgeSite`, one (or more) `NoPierZone`,
walk candidate abutment (C1) positions and uniform span arrangements,
reject anything that doesn't fit the site or puts a pier inside a
no-pier zone, return every candidate (feasible and rejected) as a
`BridgeLayoutAlternative` for traceability.

- **`constraints`** (new module, no dependencies yet): `NoPierZone` as a
  chainage range (`startChainageM`, `endChainageM`) - a deliberate
  simplification of the full `ConstraintObject`/3D-volume model from the
  analysis document's section C (see that type's own javadoc for why:
  pier candidates are chainage-only for now, so a 2D/3D JTS geometry
  check isn't needed yet).
- **`bridge-layout`** (new module, depends on `alignment`, `constraints`):
  `BridgeSite`, `LayoutDesignSpace` (span-length/span-count/C1-chainage
  search ranges, with `spanLengthStepM`/`c1StepM` documented as
  combinatorial-search resolution, not engineering quantities - same
  reasoning already used for `bridge-core`'s `DesignSpace.girderDepthStepM`),
  `AbutmentCandidate`, `PierCandidate`, `FeasibilityStatus`
  (`FEASIBLE`/`REJECT` only - `WARNING` deferred until a soft-constraint
  check exists), `ConstraintCheckResult`, `BridgeLayoutAlternative`, and
  the `BridgeLayoutEngine` itself.
- **One class, not four**: the analysis document's `D` section named
  separate `AbutmentPlacementEngine`/`PierPlacementEngine`/
  `ConstraintEvaluator`/`SpanArrangementGenerator` sub-components: for
  LAYOUT-P01's actual logic size, that split would be premature
  abstraction, so `BridgeLayoutEngine` implements all of it as one class
  with clear private-method decomposition. Expect it to split once
  terrain-based height feasibility (a materially different, larger kind
  of check) is added to abutment/pier placement.
- **Uniform span layout only** - the same reading `generative-engine`'s
  `AlternativeGenerator` already uses for P03, extended here to a
  variable total bridge length (spanCount x spanLengthM) instead of a
  fixed one.
- **Not modelled at all in this milestone** (by design, not oversight):
  abutment/pier height (deferred to the native analysis engine
  milestone, addendum Q), terrain, geotechnical/hydraulic feasibility,
  preliminary foundations, earthwork, quantities, cost, carbon - all
  need an engineer-approved estimation method that does not exist yet;
  adding them now would mean inventing one (spec section 22).
- **Tests**: `BridgeLayoutEngineTest` (7 tests) - a hand-computed
  scenario (100 m straight alignment, full-length site, span range
  30-50 m step 10 m, span count 2-3) worked out in the test's own
  comments before asserting on it (same style as
  `AlternativeGeneratorTest`'s spec-example test): site-fit filtering
  (arrangements whose C2 would exceed the site are never generated,
  confirmed by an exact count of 4), a no-pier-zone rejecting exactly
  the one alternative whose pier lands inside it while leaving the
  others feasible, constraint-result traceability, and the usual
  invalid-range/throws cases. All pass; full backend reactor (10
  modules) still builds and all existing tests still pass.
- **Not done yet, by design**: no `StructuralAlternativeBuilder` seam
  into `bridge-core`/`generative-engine`, no `Corridor`/multi-`BridgeSite`
  aggregate (a single `BridgeSite` is passed directly for now).

## LAYOUT-P01 expanded: REST endpoint + Site & Layout frontend screen, new grouped sidebar (`backend/api`, `frontend/`)

Third step, same session: wired `BridgeLayoutEngine` to the frontend and
replaced P10's flat sidebar with the grouped structure
`docs/SITE_LAYOUT_PLATFORM_ANALYSIS.md` section K proposed - a smaller,
honest subset of it, not the full ~70-leaf tree (see that section's own
"scaffold the groups first, add leaves incrementally" guidance).

- **`api` module**: new `com.spanova.api.layout` package -
  `LayoutGenerationRequest` (mirrors `KernelStateRequest`'s
  request-&gt;domain-object mapping pattern: builds a single-segment
  straight `Alignment`, a `BridgeSite`, a `LayoutDesignSpace` from form
  fields), `NoPierZoneRequest`, `LayoutGenerationController`
  (`POST /api/layout/generate`), `LayoutAlternativeRow`/`PierRow` (flat
  presentation DTOs, same discipline as `AlternativeRow`). `api` now also
  depends on `spatial-core`, `alignment`, `constraints`, `bridge-layout`.
  Live-verified over real HTTP (curl) with the exact scenario
  `BridgeLayoutEngineTest` already proves by hand-computation - same
  result both ways, then the test process was stopped immediately (see
  `spanova_working_style` lesson on this).
- **Frontend navigation (`sections.ts`, `Sidebar.tsx`)**: `SIDEBAR_GROUPS`
  replaces the flat `SIDEBAR_SECTIONS` list - 7 collapsible groups
  (Project, Site & Corridor, Design, Generate, Analysis, Optimization,
  Results & Reporting) matching section K's category names, each holding
  only the leaves that are real today or realistically next (13 leaves
  total, not ~70). `Sidebar` now tracks per-group collapse state
  (`useState<Set<string>>`), chevron rotates on collapse. `TopBar`/step
  tabs unchanged in behavior, just gained a "Site & Layout" step.
- **`SiteLayoutPanel.tsx`** (new): 'site-alignment' is real now, not a
  placeholder - a form (alignment length, site chainage range, a
  repeatable no-pier-zone list with add/remove, span search ranges) +
  GENERATE LAYOUTS button + results table (C1, C2, bridge length, span
  count/length, pier chainages, feasible Y/N) + a "why rejected" detail
  panel when a rejected row is selected, listing each violated
  constraint's reason. Same fetch/table/selection pattern as
  `GenerateWorkflow`, no new UI library.
- **Verified live in the browser** (Vite dev server + the API jar, via
  the Browser pane): navigated to Site & Layout, generated with a
  151-candidate-shaped scenario (42 alternatives found, 22 feasible),
  confirmed rejected rows cite the exact pier chainage and zone id
  (`"Pier @ 70.00 m: Inside no-pier zone NPZ-1"`), confirmed no console
  errors, then stopped both the dev server and the backend process.
- **`PlaceholderPanel.tsx`**: `MILESTONE_BY_SECTION` updated - removed
  the now-real `site-alignment` entry, added `terrain`/`constraints`
  entries pointing at addendum Q / this milestone's "zones entered
  directly on the form for now" respectively.
- **Not done yet, by design**: no map (MapLibre - section F says add
  only once a milestone actually renders one), no multi-zone geometry
  beyond chainage ranges, no persistence of a generated layout (a fresh
  GENERATE each time, same as `GenerateWorkflow`'s existing behavior).

## LAYOUT-P01 seamed into P03 structural generation (`frontend/`, no new backend code)

Fourth step, same session: connects LAYOUT-P01's output to the
already-working structural alternative pipeline, without a formal
backend `StructuralAlternativeBuilder` (the analysis document's section
C interface) - the mapping (chosen layout -> `Bridge`/`DesignSpace`) is
small enough to do in the frontend and reuse the existing
`POST /api/alternatives` endpoint unchanged, rather than adding a new
Java module for it now. Revisit as a real backend interface once the
mapping grows (e.g. once girder/pier structural ranges also come from
the layout side, or once quantities/cost need the same mapping
server-side).

- **`layoutSeed.ts`** (new, frontend): `LayoutSeed { totalLengthM,
  spanLengthM }` - the hand-off type, lifted to `App.tsx` the same way
  `generationSummary.ts` already lifts the GENERATE summary to `App.tsx`
  for `HomePanel`.
- **`SiteLayoutPanel.tsx`**: selecting a *feasible* row now shows its
  bridge length/span breakdown plus a "USE THIS LAYOUT IN GENERATE"
  button, calling a new `onUseLayout` prop with the `LayoutSeed`.
- **`App.tsx`**: new `layoutSeed` state; `onUseLayout` stores it and
  switches `active` to `'generate'`.
- **`GenerateWorkflow.tsx`**: optional `layoutSeed` prop - when present,
  the form's initial state (not a live subscription - `useState`
  initializer, so re-applies fresh each time the component mounts, i.e.
  each time the engineer navigates back to Generate) pre-fills
  `totalLengthM` and locks `minSpanM = maxSpanM = spanLengthM` to the
  chosen layout's own values (still editable afterwards - nothing is
  disabled). A `.spn-hint` banner names the source layout's numbers so
  the origin is never silent.
- **Verified live in the browser**: picked a feasible Site & Layout
  candidate (C1=10, C2=85, bridge length 75 m, 3 x 25 m spans), clicked
  "Use this layout", landed on Generate with the hint banner reading
  "Bridge length and span locked from a Site & Layout candidate (75 m
  total, 25 m spans)" and the form pre-filled (Total length 75 m, Span
  range 25-25 m); GENERATE ALTERNATIVES then returned 40 real structural
  alternatives (5 girder counts x 8 depths) all at span count 3 / total
  length 75 m - exactly the picked layout, not a retyped one. No console
  errors. Both the dev server and backend process stopped immediately
  after.
- **Not done yet, by design**: no locking/disabling of the pre-filled
  span fields (still plain, editable inputs), no backend
  `StructuralAlternativeBuilder` type, no carrying girder/pier structural
  ranges from the layout side (those still come from `DesignSpace`'s
  existing defaults, unrelated to LAYOUT-P01).

## Full sidebar navigation, matching the engineer's own menu screenshot exactly (`frontend/`)

Fifth step, same session: the engineer posted a screenshot of the
complete target menu (7 groups incl. Home/3D & Visualization/Reports as
standalone items, ~45 leaves total, exact labels) and asked for all of
it - superseding the smaller 7-group/13-leaf scaffold from the earlier
"LAYOUT-P01 expanded" step. Rebuilt to match the screenshot exactly, not
a trimmed-down version of it.

- **`sections.ts`** rewritten: `SIDEBAR_TOP_ITEMS` (Home, standalone),
  `SIDEBAR_GROUPS` (Project / Site & Corridor / Design System / Bridges
  / Analysis / Optimization - 6 collapsible groups, exact leaf labels
  and order from the screenshot), `SIDEBAR_BOTTOM_ITEMS` (3D &
  Visualization, Reports - standalone, below the groups), unchanged
  `SIDEBAR_FOOTER_SECTIONS` (Settings, Help). ~45 `SectionId` values
  total.
- **Renamed/merged ids** to match the new leaf names: old `'project'` ->
  `'project-information'` (still `ProjectPanel`); old `'site-alignment'`
  -> `'layout-generator'` (still `SiteLayoutPanel` - the closest single
  semantic match among the screenshot's Alignment/Bridge Site/Layout
  Generator/Layout Alternatives/Constraints leaves, all of which
  `SiteLayoutPanel` already covers in one screen); old separate
  `'design-space'`/`'generate'` steps merged into one `'bridge-design'`
  leaf (`GenerateWorkflow` - the screenshot has no separate Design
  Space/Generate distinction, just "Bridge Design"). `WORKING_SECTIONS`
  now lists all three real non-Home leaves (`project-information`,
  `layout-generator`, `bridge-design`) so `TopBar`'s step tabs dim
  correctly - `App.tsx`'s routing is unaffected since those three are
  matched by earlier, more specific ternary branches before
  `WORKING_SECTIONS` is even consulted.
- **`Sidebar.tsx`**: renders `SIDEBAR_TOP_ITEMS` (plain), then
  `SIDEBAR_GROUPS` (collapsible, unchanged mechanism from the earlier
  step), then `SIDEBAR_BOTTOM_ITEMS` (plain, with a `spn-nav-standalone`
  top-border separating them from the last group). New icons picked per
  leaf (lucide-react - e.g. `Route` for Alignment/Layout Generator,
  `Anchor` for Abutment/Bearing Library, `GitBranch`/`Target`/`Network`
  for the three optimization-level leaves) - purely decorative, no
  functional meaning.
- **`PlaceholderPanel.tsx`**: `MILESTONE_BY_SECTION` rewritten for all
  ~40 placeholder leaves - each cites a specific reason (not scoped /
  covered by an existing real screen for now / needs an engineer-approved
  method first / needs a Corridor aggregate first), not a generic "later".
  Several explicitly point back at `layout-generator` (Alignment, Bridge
  Site, Constraints & No-Pier Zones, Layout Alternatives all say "covered
  by the Layout Generator screen for now") so the overlap between the
  screenshot's fine-grained menu and today's one coarser real screen is
  never silently hidden.
- **`HomePanel.tsx`/`ProjectPanel.tsx`/`TopBar.tsx`**: stale copy
  referencing the old "Design Space"/"Generate" tab names updated to
  "Layout Generator"/"Bridge Design".
- **Verified live in the browser**: `document.querySelector('.spn-sidebar').innerText`
  compared line-for-line against the screenshot - exact match, same
  order, same grouping (Home standalone; PROJECT/SITE & CORRIDOR/DESIGN
  SYSTEM/BRIDGES/ANALYSIS/OPTIMIZATION headers; 3D & Visualization/
  Reports standalone; Settings/Help footer). Re-verified Layout Generator
  and Project Information still work under their new ids. No console
  errors. Both test processes stopped after (see
  `spanova_working_style` memory - `preview_stop` left a stray
  `node.exe` behind twice this session; had to be killed manually via
  `Get-Process`/`Stop-Process` before the next `preview_start`).
- **Not done yet, by design**: the ~40 placeholder leaves are exactly
  that - placeholders. This step is a navigation/information-architecture
  change only, not ~40 new feature implementations.

## Native analysis engine - `spanova-analysis-engine` (`backend/analysis-engine`, addendum P)

Sixth step, same session: SPANOVA's own linear-elastic 3D direct-stiffness
solver - the FAST/primary tier of the FAST/INTERMEDIATE/FINAL
`AnalysisEngine` hierarchy this document already anticipated (section B;
addendum P). Implements the existing `AnalysisEngine` port from
`analysis-api` (same interface `midas-adapter` implements) - no new port,
just a second implementation. Built and validated against the engineer's
own worked test case (2026-09-10, a 5-span frame bridge with portal-frame
piers) rather than a synthetic example.

- **`analysis-api` additions**: `ElasticLinkElement` (2-node spring,
  kx/ky/kz/krx/kry/krz acting along GLOBAL axes - a deliberate
  simplification, see its javadoc for why) and `UniformElementLoad` (an
  externally-supplied UDL on one element, e.g. SDL - as opposed to
  `SelfWeight`, whose magnitude is computed from the element's own
  section/material). Both added as new `AnalysisRequest` fields (empty
  lists = existing MIDAS-P01 requests unaffected; the 3 existing MIDAS
  test call sites were updated to pass `List.of()`).
- **`analysis-engine`** (new module, depends only on `analysis-api`, no
  external linear-algebra library - a hand-rolled dense Gaussian-
  elimination solver is enough at this model size):
  - `FrameElementStiffness` - the standard published 12x12 Euler-Bernoulli
    3D frame element stiffness matrix (Przemieniecki/McGuire-Gallagher-
    Ziemian form) - a computational method, not an engineering judgment
    call, so no engineer sign-off needed (spec section 22's own
    carve-out); correctness verified by tests instead (below).
  - `FrameTransformation` - local/global axis transformation via the
    standard "reference vector" method (global Z for non-vertical
    members, global X for vertical ones - no member roll angle needed
    for this milestone's plumb columns/level deck/horizontal cap beams).
  - `RectangularSectionProperties` - area/Iy/Iz from standard formulas,
    torsion constant from Roark's approximate rectangular-section
    formula. Only `SolidRectangleSection` supported so far (matches this
    milestone's model - deck, columns, cap beams are all rectangular).
  - `ElasticLinkStiffness` - diagonal 12x12 spring matrix, global axes.
  - `UniformLoadDistribution` - the standard "fixed-end force" equivalent
    nodal load vector for a UDL (used for both self-weight and
    `UniformElementLoad`s - both are just "a UDL on this element" once
    magnitude/direction are known).
  - `DenseLinearSolver` - Gaussian elimination with partial pivoting.
  - `FrameSolver` - assembles the global stiffness matrix/load vector,
    applies boundary conditions (DOF reduction), solves, backs out
    reactions - the pure numerics, separated from the port/job wrapper
    so it is directly unit-testable.
  - `SpanovaAnalysisEngine implements AnalysisEngine` - same
    synchronous-submit-to-completion shape as `MidasCivilNxAnalysisEngine`
    (MIDAS-P01 precedent), in-memory job map.
- **Validated against textbook closed-form results**
  (`FrameSolverTest`, 3 tests, `docs/SITE_LAYOUT_PLATFORM_ANALYSIS.md`
  addendum P's own "hand-worked reference case" discipline): a horizontal
  cantilever's tip deflection under self-weight vs. `wL^4/(8*E*Iy)`; a
  vertical column's axial shortening under self-weight vs.
  `density*L^2/(2*E)`; an elastic link's spring compression under a
  cantilevered beam's self-weight vs. `F/k` - all match to a relative
  tolerance of 1e-9 (i.e. exactly, modulo floating point). These three
  cases independently exercise bending, axial, torsion-adjacent geometry,
  and the elastic link - not just one code path.
- **`backend/api`'s `com.spanova.api.fastsolver` package**: `FastSolverRequest`
  (the engineer's own form fields: span arrangement, pier heights, column/
  cap-beam dimensions, bearing stiffness, concrete fck, SDL),
  `FastSolverModelBuilder` (builds the actual `AnalysisRequest` - **modelling
  simplifications stated explicitly in its own javadoc**: deck is one
  continuous spine of frame elements, not 6 separate girders; each pier
  is a portal frame - 2 columns + a cap beam split into two segments
  meeting at a center node; bearings are zero-length elastic links
  connecting the deck spine directly to that center node, or directly to
  a fixed foundation node at the abutments - cap-beam depth and bearing
  height are captured only as section/spring properties, not separate
  node-elevation offsets), `FastSolverController`
  (`POST /api/fast-solver/solve`) - returns reactions/displacements as
  labelled rows (C1, P1-Left/Right, ..., C2) plus an independent
  equilibrium check (`totalAppliedLoadKn` computed directly from the
  model's own geometry vs. `totalReactionKn` from the solve).
- **`FastSolverPanel.tsx`** (new): 'spanova-fast-solver' is real now, not
  a placeholder - a form defaulting to the engineer's own given values
  (185 m, 30+40+50+40+25 spans, pier heights 10/15/20/8 m, 2m x 4m
  columns spaced 8 m apart, 3.0 x 1.5 m cap beams, C30/37, SDL 10 kN/m,
  bearing Kx=3000/Ky=30000/Kz=100000/Krx=Kry=Krz=100000) + RUN ANALYSIS +
  an equilibrium-check banner + reactions table + deck-displacements
  table.
- **Verified live** both via curl and in the browser (Vite dev server +
  the API jar) with the engineer's exact values: **total applied load
  96025.00 kN vs. total reaction 96025.00000000001 kN - equilibrium
  matches to floating-point precision** on the full 5-span/4-pier
  portal-frame model (not just the small validation cases), a strong
  correctness signal for the assembly logic on a real, non-trivial
  topology. Reactions/displacements are symmetric where the geometry is
  symmetric (e.g. P1-Left/P1-Right Fy equal and opposite), and every deck
  node deflects downward under its own weight, as physically expected.
  No console errors. Both test processes stopped immediately after.
- **Rotational-stiffness unit note** (flagged to the engineer, not
  silently resolved): the given Krx/Kry/Krz values were stated in kN/m
  in both the engineer's image and text, but a rotational spring is
  dimensionally kN.m/rad - the numeric value (100000) is used as-is,
  assumed kN.m/rad, per the engineer's own explicit restatement; revisit
  if this was meant as a genuine kN/m value (which would not be
  physically meaningful for a rotational DOF).
- **Not done yet, by design**: no REST/UI wiring for `midas-adapter` as
  the FINAL verification tier (addendum P's own plan - MIDAS is invoked
  once a design is selected, not from this screen); no LM1/traffic load
  (addendum P: still needs its own simplification-method decision when
  reached); no internal force/moment diagrams (reactions/displacements
  only, matching the existing `AnalysisResult` shape - same MIDAS-P01
  scope precedent); no `ISection`/`SolidCircularSection` support in
  `analysis-engine` yet (ties into `RectangularSectionProperties`'s own
  scope note).

## Menu refinement: Loads big-menu, Design Space split, Layout Design Space (`frontend/`)

Seventh step, same session: the engineer posted two more mockups - the
exact "PROJECT" group tree (with "Loads" meant to open a big card grid,
not a nested sidebar tree) and a "Layout Design Space" screen
(Abutments/Superstructure/Piers/Constraints checkboxes).

- **`sections.ts`**: PROJECT group replaced to match exactly (`Project
  Dashboard`, `Project Information`, `Design Codes`, `Units`, `Design
  Criteria`, `Materials`, `Loads`, `Cost Database`, `Carbon Database` -
  `design-codes-standards`/`cost-carbon` retired in favor of these).
  `Design System` gained a `Design Space` leaf (placeholder - distinct
  from `Layout Design Space`, see below). `Bridges` gained a `Layout
  Design Space` leaf, positioned before `Layout Generator` (defines the
  search space before generation runs).
- **`LoadsPanel.tsx`** (new): 'loads' is real now - a card grid of the 8
  EN 1991-series categories (Permanent, Traffic, Temperature, Wind,
  Seismic, Construction, Accidental, Load Cases & Combinations), each a
  disabled card naming what exists today (self-weight/SDL are real
  elsewhere) or what's still needed - per the engineer's own explicit
  instruction that clicking "Loads" shows the types in the main content
  area, not a nested sidebar tree.
- **`LayoutDesignSpacePanel.tsx`** (new): 'layout-design-space' is real
  now - matches the engineer's mockup exactly (Abutments: "SPANOVA
  determines C1/C2"; Superstructure: PC-01 30-40m/PC-02 35-45m/SC-01
  45-65m/SC-02 60-80m; Piers: Circular/Rectangular; Constraints: avoid
  road/railway/main river channel/poor ground, minimize tall
  piers/deep foundations - all checked by default, matching the mockup).
  **Presentation only, stated explicitly in its own javadoc-style
  comment** - local checkbox state, NOT wired into
  `BridgeLayoutEngine`/`LayoutGenerationRequest` yet. Today's engine only
  supports a uniform span range and chainage-range no-pier zones; the
  superstructure-type catalog, pier-shape options, and richer constraint
  set shown here don't exist in the backend - wiring them in is a later
  milestone, not silently implied by this screen existing.
- **`Design Space` vs `Layout Design Space`**: two deliberately distinct
  leaves now - `Layout Design Space` (Bridges group, real) is about
  *where/what kind* of bridge layout is searched (site-level);
  `Design Space` (Design System group, placeholder) is about
  *structural component* ranges (girder depth, slab thickness, pier
  diameter - `bridge-core`'s existing `DesignSpace`, currently only
  reachable embedded in the Bridge Design form).
- **Verified live in the browser**: full sidebar text compared against
  the engineer's PROJECT-group screenshot (exact match via
  `document.querySelector('.spn-sidebar').innerText`); Loads shows all 8
  cards; Layout Design Space shows all 14 checkboxes, all checked by
  default (2+4+2+6, matching the mockup), toggling one via a direct
  click works. No console errors. Test processes stopped after.
- **Not done yet, by design**: no backend wiring for either new screen's
  selections (Loads' categories are still placeholders; Layout Design
  Space's checkboxes are local state only).

## Final menu structure for all remaining groups (`frontend/`)

Eighth step, same session: the engineer posted the complete, final tree
for Site & Corridor, Design System, Bridges, Analysis, and Optimization
("SITE CORRIDOR bu ÅŸekilde olacak... diÄŸerleride aynÄ± mantÄ±kta" - Site &
Corridor will be like this, the others follow the same pattern) -
replacing every remaining group wholesale, not incrementally.

- **`sections.ts`** rewritten again: `BIG_MENU_ITEMS` (new) - a
  `Partial<Record<SectionId, string[]>>` map for every leaf whose mockup
  shows real sub-items (Alignment, GIS & Satellite, Geotechnical,
  Seismic, Meteorology, Hydrology & Hydraulic, Constraints,
  Superstructure Families) - `App.tsx` checks this map directly and
  renders a generic `BigMenuPanel` (new component, the same card-grid
  pattern `LoadsPanel` already established) rather than needing 8
  near-identical one-off components.
- **Site & Corridor** rebuilt: `Corridor Dashboard`, `Alignment`,
  `3D Terrain / DTM` (renamed from "3D Terrain & GIS"), `GIS &
  Satellite` (absorbs the old standalone "Satellite Imagery" leaf plus
  Roads/Railways/Rivers/Buildings/Utilities as sub-items), `Geotechnical`,
  `Seismic` (renamed from "Seismic Data"), `Meteorology` (renamed from
  "Meteorological Data"), `Hydrology & Hydraulic`, `Constraints`
  (renamed from "Constraints & No-Pier Zones").
- **Design System** rebuilt: `Superstructure Families` (renamed from
  "Superstructure Library"), `Girder Library` (unchanged), `Preferred
  Span Families` (new), `Pier/Abutment/Foundation/Bearing Families`
  (renamed from "...Library"), `Expansion Joints` (new), `Construction
  Methods`, `Standardization Rules` (unchanged). **The `Design Space`
  leaf added last session is retired** - not present in this tree.
- **Bridges** rebuilt: `Bridge Inventory`, `Bridge Site`, `Layout
  Generator`, `Layout Alternatives` (unchanged), `Selected Layout` (new),
  `Superstructure`/`Piers`/`Abutments`/`Bearings`/`Foundations` (new,
  ids prefixed `bridge-*` to avoid colliding with Design System's
  `*-families` ids), `Bridge Alternatives` (new). **`Layout Design
  Space` and `Bridge Design` are retired** - neither is in this tree.
- **Analysis** rebuilt: added `Analysis Queue`; `MIDAS NX Verification`
  renamed to `MIDAS NX Final Verification`.
- **Optimization** rebuilt: added `Standardization` (distinct id from
  Design System's `Standardization Rules`).
- **Real functionality re-pointed, nothing silently lost**:
  - `GenerateWorkflow` (P02-P05) now attaches to **`bridge-alternatives`**
    (label "Bridge Alternatives") instead of the retired `bridge-design` -
    the closest semantic match in the new tree (a results table of
    structural alternatives, exactly what that screen already produces).
    `layoutSeed`'s hand-off target, `TopBar`'s dimming, and all "Bridge
    Design"-referencing copy in `HomePanel`/`ProjectPanel`/`TopBar`
    updated to say "Bridge Alternatives".
  - `LayoutDesignSpacePanel.tsx` (built the previous step, matching the
    engineer's own mockup) has **no route into it anymore** - the leaf
    it was built for doesn't exist in this new tree. Kept the file, not
    deleted - it was real, working, explicitly-requested functionality;
    flagged to the engineer rather than silently discarded. Re-attach it
    somewhere, or remove it, once the engineer says which.
- **Verified live in the browser**: full sidebar text compared against
  all four new mockups via `document.querySelector('.spn-sidebar').innerText` -
  exact match, group by group. `Alignment` (a `BIG_MENU_ITEMS` leaf)
  correctly shows its 3 sub-items; `Bridge Alternatives` still runs the
  real P02-P05 flow correctly. A stale-HMR console error
  (`SlidersHorizontal is not defined`, from an import removed mid-session)
  showed up in `read_console_messages` even after a full page
  reload/dev-server restart - confirmed as a tool/HMR-cache artifact, not
  a real bug: the source has no remaining reference to it (`grep` clean),
  `npm run build` (a from-scratch build, not incremental HMR) passed with
  zero errors both before and after, and the live app rendered/functioned
  correctly throughout (non-empty React root, no crash overlay, correct
  content on every screen tested). Test processes stopped after.
- **Not done yet, by design**: none of the new leaves (Corridor
  Dashboard, Selected Layout, the `bridge-*` component screens, Analysis
  Queue, Standardization, or any `BIG_MENU_ITEMS` sub-item) have real
  functionality - this was a navigation/information-architecture change
  only.

## TopBar unified with the sidebar (`frontend/`)

Ninth step, same session: the engineer pointed out the top bar's step
tabs and the sidebar had become two independent, inconsistent navigation
structures (the old `TOP_STEPS` was a fixed 6-item list unrelated to the
sidebar's actual groups) - asked for one consistent hierarchy: the same
groups at the top, with a second row revealing a clicked group's leaves
(mirroring the sidebar exactly), rather than a separate concept.

- **`sections.ts`**: `TOP_STEPS` removed entirely - the top bar now
  reads `SIDEBAR_TOP_ITEMS`/`SIDEBAR_GROUPS` directly, so there is only
  one navigation data structure, not two that could drift apart again.
- **`TopBar.tsx`** rewritten: row 2 = "Home" + every sidebar group label,
  in the same order as the sidebar. Clicking a group does not navigate -
  it only sets which group's leaves row 3 shows (local `expandedGroupId`
  state), exactly mirroring the sidebar's own collapse/expand behavior.
  Clicking a leaf in row 3 calls the same `onSelect` the sidebar uses.
  A `useEffect` keeps `expandedGroupId` synced to whichever group
  contains `active` whenever `active` changes from ANY source (sidebar
  click, `layoutSeed`'s cross-screen navigation, etc.) - so navigating
  via the sidebar auto-updates which group is expanded at the top, and
  vice versa; there is exactly one active-section state
  (`App.tsx`'s `active`), the top bar and sidebar are just two views
  onto it now, not two separate ones that could disagree.
- **Verified live in the browser**: clicking "Project" in row 2 reveals
  row 3 with the exact 9 PROJECT-group leaves (dimmed for placeholders,
  bright for real ones, matching `WORKING_SECTIONS`); clicking "Project
  Information" there navigates correctly and the sidebar highlights the
  same item. Reverse direction also verified: clicking "Layout
  Generator" in the *sidebar* auto-expanded "Bridges" in the top bar's
  row 2 and highlighted "Layout Generator" in row 3 - confirmed via a
  direct DOM query comparing all three active-highlight elements
  (sidebar/row 2/row 3), all three agreed in both directions. No console
  errors beyond the same known stale-HMR artifact from the previous step
  (re-confirmed harmless the same way: clean `grep`, clean build, working
  live app). Test processes stopped after.

## Project Information rebuilt as a bridge inventory table (`frontend/`)

Tenth step, same session: the engineer posted a "Bridge Information"
mockup (Name/Chainage/Crossing Type/Estimated Length/Road Width/
Terrain/Status, one row per bridge - "50 kÃ¶prÃ¼ varsa, 50 satÄ±rda") and
asked for `Design Codes`/`Units`/`Design Criteria` to move from their
own sidebar leaves into three dropdowns at the top of Project
Information instead.

- **`sections.ts`**: `'design-codes'`/`'units'`/`'design-criteria'`
  removed from `SectionId` and the PROJECT group entirely - retired as
  standalone leaves (Sidebar's icon map and PlaceholderPanel's entries
  updated to match; `BookOpen` import dropped from `Sidebar.tsx`, now
  unused).
- **`ProjectPanel.tsx` rewritten**: top card = 3 dropdowns (Design Code -
  "Eurocode" only for now; Units - "kN-m"/"ton-m", defaulting to kN-m to
  match the project's existing SI convention; Design Criteria - "None"
  only for now) - **presentation only**, stated in the component's own
  comment: no backend computation actually reads these yet (every
  EN/kN-m calculation done so far - `EurocodeConcrete`, the fast solver -
  already assumes Eurocode/kN-m regardless of what's selected here).
  Middle card = the new "Bridge Information" table, exactly the
  engineer's column set, one row per bridge: **VIA-35** (using the real
  fields already known - total length, deck width; fields never given
  for VIA-35 - Chainage, Crossing Type, Terrain, Status - shown as "â€”"
  rather than invented) and **VIA-24** (the engineer's own mockup values,
  taken as real given data the same way VIA-35's original facts were -
  chainage 24+320, River + Highway, 280 m, 28.0 m, Valley, "In Design"
  shown as a green status badge matching the mockup). Bottom card =
  VIA-35's existing detailed facts (spans, girder, pier, concrete) -
  **kept, not discarded** - the new table's column set has no room for
  that detail and the engineer didn't ask for it to be removed, only for
  the new columns to exist.
- New `.spn-badge` CSS (status pill, green) - reused `.spn-table`
  (already used by three other screens) for the bridge table itself, no
  new table styling needed.
- **Verified live in the browser**: Project Information shows the 3
  dropdowns (Eurocode/kN-m/None, matching the engineer's exact given
  values) + the 2-row Bridge Information table matching the mockup
  exactly (including the "In Design" badge) + VIA-35's preserved detail
  section below. Confirmed the Units dropdown is genuinely interactive
  (changed to ton-m). Sidebar and top bar (both, per the previous step's
  unification) correctly show the PROJECT group without the three
  retired leaves. No console errors. Test processes stopped after.
- **Not done yet, by design**: no add/edit/remove-bridge UI (a fixed
  2-row example, not a CRUD table yet - ties into the still-placeholder
  `Bridge Inventory` leaf under Bridges, a separate concept the engineer
  hasn't asked to build yet); the 3 dropdowns don't drive any real
  computation.

## Real 12-bridge corridor inventory + Materials-by-element (`frontend/`)

Eleventh step, same session: the engineer shared a real corridor
bridge-inventory spreadsheet (VIA-01 through VIA-12: chainage, crossing
type, estimated length, road width, bridge type, span/girder
alternatives, pier shape), pier cross-section shape diagrams
(Rectangular/Box/Oval/Circular with their dimension labels), and a real
project spec's EN-exposure-class-driven concrete-grade-by-element table
- asked for Project Information to show this real data (superseding the
VIA-35/VIA-24 example), a per-bridge "additional details" panel using
range sliders (not fixed values) for span/girder alternatives, concrete
moved out to a real Materials screen, and Bridge Type/Pier Shape as
dropdowns with a specific option set.

- **`ProjectPanel.tsx` rewritten again**: the Bridge Information table
  now holds the engineer's real 12-row dataset (transcribed exactly -
  chainage, crossing type, length, road width; Terrain/Status columns
  stay "â€”" since the spreadsheet itself shows "-" there, not invented).
  Clicking a row opens an "additional details" card below with: **Bridge
  Type** dropdown (Precast Girder / Steel Composite Girder / Cantilever
  Bridge - VIA-01's spreadsheet label "Balanced Cantilever" mapped to
  "Cantilever Bridge", the engineer's own standardized 3-option set, same
  underlying method); **Span length** and **Girder depth** as
  `RangeSliderField` (two single-handle range inputs standing in for a
  min/max range - no native dual-handle slider element exists, this is
  the pragmatic equivalent) defaulting to the given alternative set's
  min/max, with the full original discrete list (e.g. "30, 35, 40") kept
  visible as a caption so nothing is lost by collapsing to two numbers;
  when Girder is non-numeric (VIA-01's "Box" cross-section, a
  balanced-cantilever/box-girder bridge has no depth *range*), a plain
  disabled note is shown instead of a slider; **Pier Shape** dropdown
  (Rectangular/Circular/Box/Oval). **No concrete field** - moved to
  Materials per the engineer's own instruction. Presentation/local state
  only, same discipline as `LayoutDesignSpacePanel`.
- **`MaterialsPanel.tsx`** (new): 'materials' is real now - the
  engineer's exact EN 1992-1-1/EN 206 concrete-class-by-structural-
  element table (9 rows, bilingual RO/EN element names, exposure class,
  concrete class). **Row 1's values were illegible in the source image**
  (obscured by a highlight bar) - shown as "â€”" with an explicit on-page
  note asking for confirmation, not guessed (spec section 22).
- **`Pier Families`/`Bridges > Piers` placeholder text updated** to
  record the 4 shapes and their dimension parameters (B, H, tw, tf1,
  tf2, C, R, D - from the engineer's own diagram) as context for when
  that screen is actually built - not built now, the engineer said
  they'll provide the per-shape dimensions later.
- New CSS: `.spn-slider-row`/`.spn-slider-value` (native `<input
  type="range">`, styled with `accent-color` to match the dark theme -
  no new dependency).
- **Verified live in the browser**: all 12 rows match the spreadsheet
  exactly; VIA-01 (Cantilever Bridge) correctly shows a fixed
  span=140/140 slider and the non-numeric "Box" girder note instead of a
  slider; VIA-05 (Steel Composite Girder) correctly shows span
  slider 45-90 and girder slider 300-400, both matching its given
  alternative set exactly; slider drag confirmed interactive via a
  direct value-change event; Materials screen matches the concrete
  table exactly including the flagged illegible row 1. No console
  errors. Test processes stopped after.
- **Not done yet, by design**: no add/remove-bridge UI (the 12 rows are
  a fixed dataset, not a CRUD table); Pier Families' per-shape numeric
  dimensions are not entered (engineer said they'll provide them); the
  additional-details selections don't feed into any backend
  generation/analysis yet.

## Materials/Loads revised + real Excel import (`frontend/`, 2026-09-11)

New day, three refinements: the engineer simplified the Materials table
(dropping the previous exposure-class column, bilingual names, and the
illegible "Foundation levelling" row entirely - resolving that open
item by removing it, not by supplying the value), asked for each
element's concrete class to become an EN-class dropdown, asked for Loads
to gain a top tab row (one tab per load category, detail parameters
"daha sonra vereceÄŸim" - given later), and asked for a real "From Excel"
import button on Bridge Information.

- **`MaterialsPanel.tsx` rewritten**: 8 rows (No., Structural Element,
  Concrete Class), matching the engineer's simplified table exactly.
  Concrete Class is now a `<select>` per row - options are the full EN
  1992-1-1 Table 3.1 strength-class set (C12/15 through C90/105, the
  same table `backend/analysis-api`'s `EurocodeConcrete` already computes
  Ecm/fcm from - not a second, divergent list), defaulting to the
  engineer's given class per element. Local state, not wired to any
  backend computation yet.
- **`LoadsPanel.tsx` rewritten**: a `.spn-steps-row`/`.spn-step` tab row
  (reusing TopBar's own step-tab styling, so it reads as the same UI
  language) - one tab per load category. Clicking a tab shows that
  category's detail area below; since the engineer hasn't given the real
  parameters yet, each shows an honest note (what's real elsewhere -
  self-weight/SDL for Permanent - or "not provided yet").
- **"From Excel" - a real import, not a placeholder button.** Added
  `xlsx` (SheetJS) as a new npm dependency - **installed from
  `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`, SheetJS's own
  official CDN, not the npm registry package**: the registry release has
  two unpatched high-severity advisories (prototype pollution,
  ReDoS - GHSA-4r6h-8v6p-xvw6, GHSA-5pgg-2g8v-p4x9) with "no fix
  available" via npm; SheetJS's own current documentation directs users
  to the CDN-hosted tarball for patched releases instead. `npm audit`
  confirms 0 vulnerabilities with this install method.
  `ProjectPanel.tsx`'s "From Excel" button (top-right of the Bridge
  Information card, via new `.spn-card-header-row` CSS) triggers a
  hidden file input; `handleExcelFile` reads the workbook, matches the
  first sheet's header row case-insensitively against the 7 known
  column names (No/KM/Crossing Type/Estimated Length/Road Width/
  Terrain/Status), and replaces the `bridges` table state. Columns the
  spreadsheet doesn't carry (Bridge Type, Span/Girder range, Pier Shape)
  get documented defaults (Precast Girder, 30-35-40 m, 160-190 cm,
  Rectangular) meant to be corrected per-row afterward via additional
  details, not invented per-bridge facts.
- **Verified live in the browser, including a genuine end-to-end import
  test** (not just UI inspection): generated a real 2-row .xlsx test
  file with the SheetJS library itself, injected it into the page's
  hidden file input via the browser's own File/DataTransfer APIs
  (`base64 -> Uint8Array -> File -> DataTransfer -> input.files`, since
  this harness cannot drive a native OS file-picker dialog), and
  confirmed the table was replaced with both rows, every column matching
  the source file exactly (including a numeric length field parsed
  correctly) - the import path is proven working end-to-end, not just
  wired up. Materials' 8 rows and their default EN class selections
  matched the engineer's table exactly; Loads' tab row switches content
  correctly (checked Permanent -> Traffic). No console errors. Test
  processes and generated test files cleaned up after.
- **Known cost, not addressed this pass**: the SheetJS library is large
  - the frontend's minified bundle grew from ~250 KB to ~620 KB (gzip
  ~202 KB), past Vite's 500 KB chunk-size warning threshold. Acceptable
  for now (this is still a dev-stage app), but worth revisiting with
  code-splitting (`import()`) if bundle size becomes a real concern
  later - not done now since it wasn't asked for and isn't blocking
  anything.

## Superstructure Families tabbed + real Pier Families with cross-section sweeps (`frontend/`, 2026-09-11)

Same day, next request: apply the Loads tab-row pattern to Superstructure
Families, and build Pier Families for real - 4 cross-section shapes with
a per-shape "use in SPANOVA analyses" checkbox and min/max/delta
dimension ranges (the engineer's own worked example: Circular D
200-300cm step 25cm -> SPANOVA analyzes 200/225/250/275/300cm), scoped
explicitly to only the bridges that selected that shape.

- **`TabDetailPanel.tsx`** (new, extracted from `LoadsPanel.tsx`): the
  generic "top tab row, click reveals a detail card below" pattern,
  taking a `DetailCategory[]` prop - `LoadsPanel.tsx` is now a thin
  wrapper around it (unchanged behavior/content, just de-duplicated), and
  `SuperstructureFamiliesPanel.tsx` (new) reuses it for 'superstructure-families'
  (Precast/PSC/Steel & Composite tabs) - removed from `BIG_MENU_ITEMS`
  (was a disabled card grid) since it now has real tab/detail
  interactivity, even though the detail parameters themselves aren't
  provided yet (same honest-placeholder text pattern as Loads).
- **`PierFamiliesPanel.tsx`** (new) - 'pier-families' is real now. Per
  shape (Rectangular/Circular/Oval/Box): a checkbox ("Use in SPANOVA
  analyses"), a redrawn inline-SVG cross-section diagram (cleaner than
  yesterday's source sketch - filled shape in the app's accent color,
  hand-drawn dimension-line arrows via small `HDim`/`VDim` helper
  components rather than relying on SVG marker auto-orientation quirks,
  which proved unreliable to get consistently correct), and a
  min/max/delta table per dimension (B/H for Rectangular; D for
  Circular; H/B/R for Oval; B/H/tw/tf1/tf2/C for Box - the engineer's own
  diagram's exact parameter set) with the **generated value set shown
  live** next to the inputs (e.g. typing 100/150/25 for a dimension
  shows "100, 125, 150" immediately - proves the sweep logic, doesn't
  just describe it).
- **No default min/max/delta invented** for Rectangular/Oval/Box (spec
  section 22) - only Circular carries the engineer's own given example
  (200/300/25); the rest start at 0/0/0 ("Not configured yet" shown
  instead of a degenerate single value) until the engineer provides real
  ranges.
- **The scoping rule is stated explicitly in the UI**, not just in code
  comments (the engineer's own explicit ask - "bununla ilgili bir
  aÃ§Ä±klama olmasÄ± lazÄ±m"): a `.spn-hint` banner at the top of the page
  says the min/max/delta sweep for each shape only applies to bridges
  whose Pier Shape (Project Information's per-bridge additional details)
  is set to that exact shape.
- New CSS: `.spn-pier-row` (checkbox | diagram | parameter table, side
  by side) and `.spn-pier-params`.
- **Verified live in the browser**: Superstructure Families renders the
  3-tab pattern matching the engineer's own screenshot structure exactly
  (tabs with icons, "Precast" active by default, detail card below);
  Pier Families renders all 4 diagrams and tables, Circular's D column
  shows "200, 225, 250, 275, 300" as given; live-edited Rectangular's B
  min/max/delta (100/150/25) and confirmed the value list recalculated
  to "100, 125, 150" immediately; confirmed the "Use in SPANOVA
  analyses" checkbox toggles. No console errors. Test processes stopped
  after.
- **Not done yet, by design**: none of this is wired into backend
  generation/optimization - the per-bridge Pier Shape selection
  (Project Information) and the per-shape dimension sweeps (Pier
  Families) are both still presentation/local state, waiting for a
  later milestone to actually connect them to `BridgeLayoutEngine`/
  `generative-engine`.

## Box section simplified, min/max/delta inputs fixed, real Project Dashboard (`frontend/`, 2026-09-11)

Same day, follow-up refinements: simplify the Box pier cross-section
(drop the inner-width `C` dimension, collapse `tw`/`tf1`/`tf2` into just
`tw1`/`tw2`), fix the Min/Max/Delta number inputs (the engineer's
screenshot showed a cramped, garbled-looking box - too narrow, native
spinner arrows overlapping the value), and build a real Project
Dashboard from the engineer's own mockup.

- **`PierFamiliesPanel.tsx`**: Box's dimension set reduced from
  B/H/tw/tf1/tf2/C (6) to **B/H/tw1/tw2 (4)** - `tw1` = top/bottom wall
  thickness, `tw2` = left/right wall thickness (a software/drawing
  convention, not an engineering choice - the engineer only specified
  "2 different wall thicknesses", not which pair is which). The Box SVG
  diagram redrawn to match - no more inner-width dimension line, no
  separate top-only/bottom-only flange indicators.
- **Number-input fix**: new `.spn-input-number` CSS class (`min-width:
  84px`, `-moz-appearance: textfield`, `::-webkit-inner/outer-spin-button
  { -webkit-appearance: none }`) applied to Pier Families' Min/Max/Delta
  inputs - removes the native browser spin-button UI entirely and
  guarantees a comfortably wide edit box, addressing the engineer's own
  screenshot of the cramped/garbled-looking rendering directly (confirmed
  via computed style: input width went from a cell-constrained ~40-50px
  to a reliable 84px).
- **`ProjectDashboardPanel.tsx`** (new) - 'project-dashboard' is real
  now, matching the engineer's own "1. PROJECT SUMMARY" mockup exactly
  (Project Name, Country/Region, Route Length, Number of Bridges, Design
  Code, Status, Last Update). **Route Length and Number of Bridges are
  real, computed live** from the same `bridges` data Project Information
  edits (parses each bridge's chainage, e.g. "13+180.000" -> 13.18 km,
  Route Length = max - min across the current bridge list - not
  invented, derived). Design Code mirrors Project Information's own
  dropdown. To make this possible, **`bridges`/`designCode` state was
  lifted from `ProjectPanel` to `App.tsx`** (same "lift shared state"
  pattern already used for `GenerationSummary`/`layoutSeed`) -
  `ProjectPanel` now takes them as props rather than owning them
  locally; `INITIAL_BRIDGES`/`BridgeRow`/`BridgeType`/`PierShape` are
  now exported from `ProjectPanel.tsx` for this. Project Name/Country-
  Region/Status/Last Update have no established real value for this
  corridor - left as empty, engineer-editable fields (Last Update
  defaults to today's date, a standard UI convention, not a fabricated
  fact).
- **Verified live in the browser**: Route Length computed to 11.49 km,
  Number of Bridges to 12, matching the real 12-bridge dataset exactly;
  Box's dimension table shows exactly B/H/tw1/tw2 (no C); Min/Max/Delta
  inputs confirmed wider (84px, up from a cramped cell-constrained
  width) via computed style, and visually confirmed clean/legible via
  screenshot (all 4 diagrams - Rectangular, Circular, Oval, Box - render
  correctly with clear dimension arrows). No console errors. Test
  processes stopped after.

## Pier Families alignment fix, shared param-sweep card, real Girder Library (`frontend/`, 2026-09-11)

Same day, two more follow-ups from the engineer's own screenshots: fix a
reported edit-box misalignment across Pier Families' shape cards
("kayÄ±klÄ±k"), and build a real Girder Library screen with a Precast
Girder parametric cross-section from the engineer's own detailed
drawing.

- **Root cause of the misalignment**: `.spn-table` used
  `table-layout: auto`, and each pier shape rendered its own,
  independent `<table>` - so each table picked its own Min/Max/Delta
  column widths from its own content (label text length, the length of
  its own "Values SPANOVA will use" list vs. "Not configured yet").
  Nothing tied one shape's table columns to another's.
- **`paramSweep.tsx`** (new, shared) - extracted the "checkbox + diagram
  + min/max/delta table" card into `ParamSweepCard` (plus `Dimension`,
  `generateValues`, `HDim`, `VDim`) once the exact same pattern was
  needed a second time (Girder Library), the same "extract when a
  pattern repeats 2+ times" convention already used for
  `TabDetailPanel`/`BigMenuPanel`. Its table now uses a fixed
  `<colgroup>` (`.spn-param-table` in `App.css`: 110px Dimension label
  column, 96px each for Min/Max/Delta, remaining space to the Values
  column) - identical column widths on every card using this component,
  regardless of that card's own content. `PierFamiliesPanel.tsx` was
  rewritten to use `ParamSweepCard` instead of its own inline table
  markup; its 4 SVG diagram functions (Rectangular/Circular/Oval/Box)
  are unchanged.
- **`generateValues` sweep convention extended**: a dimension whose
  min/max/delta are all exactly `0` still means "not configured yet"
  (unchanged). A dimension where `min === max` (and not the all-zero
  case) is now shown as that **one given value**, not stretched into an
  invented range and not shown as "not configured" either - needed for
  Girder Library's precast defaults, which are single numbers read off
  a drawing, not an engineer-given min/max/delta spread (unlike
  Circular pier's real 200/300/25 example).
- **`GirderLibraryPanel.tsx`** (new) - 'girder-library' is real now,
  same `ParamSweepCard` pattern as Pier Families:
  - **Precast Girder** (first row, per the engineer's own instruction):
    a new I/bulb-tee cross-section diagram (`PrecastGirderDiagram`) with
    the engineer's exact 8 dimensions in the engineer's exact given
    order - H, tf, bf, w, th1, th2, bh1, bh2 - defaults read directly
    off the engineer's drawing (H=190, tf=150, bf=80, w=20, th1=12,
    th2=10, bh1=28, bh2=15, all cm), entered as min=max=that value,
    delta=0 per the sweep convention above. **A visible warning banner
    on the page itself** (not just this doc) flags that `tf=150cm` reads
    implausibly large relative to `H=190cm` for a flange thickness, and
    asks the engineer to confirm `tf`/`th1`/`th2`/`bh1`/`bh2` (all read
    from stacked labels on the same drawing) against the original
    drawing before use - spec section 22 discipline: the assistant does
    not silently "correct" a number it cannot re-verify against the
    source image in this session.
  - **Steel Girder** and **Box Girder** (below it, per the engineer's
    own instruction - "onlarÄ±n bilgisini sonra vereceÄŸim, ama ÅŸimdiden
    yerini dÃ¼zenleyebilirsin"): honest placeholder rows
    (`GirderPlaceholderRow`) - checkbox present but disabled/unchecked,
    a dashed "No drawing yet" box in place of a diagram, and a note
    that no parameters are invented for these two - not even
    parameter names - until the engineer provides their own drawings.
  - `sections.ts` (`girder-library` added to `WORKING_SECTIONS`),
    `App.tsx` (explicit routing branch, following the same pattern as
    `pier-families`), and `PlaceholderPanel.tsx` (its old
    `girder-library` placeholder-text entry removed) were updated to
    route to the new screen.
- **Verified live in the browser**: computed `getBoundingClientRect()`
  on every `.spn-param-table`'s first-row cells confirmed Min/Max/Delta
  columns land at identical X-positions across tables that share the
  same diagram width (Rectangular/Circular's 150px-wide diagrams;
  Oval/Box's 168px-wide diagrams shift the whole params column right by
  exactly that width difference, not by table content - the expected,
  correct behavior now); screenshot confirmed Rectangular/Circular
  visually aligned. Girder Library's `get_page_text` confirmed all 8
  Precast Girder dimensions and values (190/150/80/20/12/10/28/15) and
  both placeholder rows render in the engineer's given order
  (Precast -> Steel -> Box); screenshot confirmed the bulb-tee diagram
  renders cleanly with all 8 dimension labels. No console errors.
  `npm run build` clean (tsc + vite). Test processes stopped after.
- **Not done yet, by design**: Girder Library is presentation/local
  state only, same as every other Design System screen this session -
  not wired into backend generation/optimization. Steel/Box Girder have
  no cross-section geometry or parameters at all yet, by the engineer's
  own instruction to fill those in later.

### Update, same day: Oval's squeezed Values column fixed; precast girder diagram corrected against a clean reference drawing

The engineer's very next message flagged two things still wrong: (1)
Pier Families' Oval card's "Values SPANOVA will use" text was still
visibly cramped (screenshotted, circled in red - "Not configured yet"
wrapping across 3 lines), and (2) sent a clean, purely-labeled reference
diagram of the precast girder (no dimension values, just names) that
clarified what each of the 8 parameters actually measures.

- **Root cause of the residual squeeze**: the fixed `<colgroup>` (added
  earlier the same day to fix cross-card misalignment) had no floor on
  the table's own overall width - on a card narrow enough, the browser
  shrank the whole table (including the "auto" Values column) well
  below what its text needed, wrapping "Not configured yet" onto 3
  lines. Fix: the table now sits in a `.spn-param-table-wrap`
  (`overflow-x: auto`) with `min-width: 620px` on `.spn-param-table`
  itself, and the Values cell gets `white-space: nowrap`
  (`.spn-col-result-cell`) - a narrow card now scrolls the table
  horizontally instead of crushing its last column. Verified live: all
  10 dimension rows across all 4 Pier Families shape cards measure
  exactly 52px tall (matched to the pixel), confirming no cell wraps
  anywhere anymore, Oval included.
- **Girder diagram corrected**: the engineer's clean reference drawing
  showed `tf`/`bf` as horizontal **width** dimensions (top and bottom
  flange width respectively, spanning the full flat cap), not a
  thickness as the first `PrecastGirderDiagram` mistakenly drew it (a
  vertical dimension near the top). This also resolves the "tf=150cm
  looks implausible next to H=190cm" concern raised in this session's
  first Girder Library pass - **tf is a width, not a thickness**, and
  150cm is a perfectly ordinary top-flange width next to an 80cm bottom
  flange; the on-page warning banner about it has been removed.
  `PrecastGirderDiagram` was redrawn from scratch to match the
  reference exactly: a flat top cap (`tf` wide, `th1` thick) tapering
  (`th2`) into a thin web (`w` wide), flaring back out (`bh2`) into a
  flat bottom block (`bf` wide, `bh1` thick) - symmetric about the
  vertical centerline, labels placed in the same relative positions as
  the reference (`tf`/`H` framing the shape, `th1`/`th2` stacked
  top-right, `bh2`/`bh1` stacked bottom-right, `w` at the waist, `bf`
  along the bottom). No numeric default values changed - only the
  geometry/labels were wrong, not the 8 given numbers.
- **Verified live in the browser**: `get_page_text` confirms the
  diagram's 8 labels render in the reference's own order (tf, H, th1,
  th2, w, bh2, bh1, bf); screenshot confirms the redrawn bulb-tee shape
  visually matches the reference (flat cap top, taper to web, taper out,
  flat block bottom); `npm run build` clean; no console errors.

## Frontend architecture migration - component-based, domain/feature-sliced (`frontend/`, 2026-09-12)

The engineer flagged architectural problems in the real SPANOVA frontend
(everything flat under one `src/components/` folder, navigation a
hand-rolled `active`-state switch, forms uncontrolled `useState` with no
validation, the 3 backend-calling screens mixing `fetch()` directly into
the UI) and provided a reference project,
`C:\_ZHarput_Data\spanova-frontend` (also `CemHarput/spanova-frontend` on
GitHub) - a **separate demo app** built to its own spec
(`SPANOVA_React_Implementation_Plani.md`), not something whose
screens/content should replace SPANOVA's own. The ask was to apply that
project's **architectural pattern** - `app/ -> pages/ -> features/<domain>/
-> shared/`, plus its full tech stack (React Router, TanStack Query, React
Hook Form + Zod, TanStack Table, Radix UI, Recharts, Vitest/RTL) - to the
real SPANOVA frontend, confirmed via a clarifying question (the engineer
chose full-stack adoption over a folder-only reorg), with the hard
requirement that nothing already working breaks.

Executed as 4 sequential milestones (matching this repo's own
`CLAUDE.md` milestone-gated method), each ending in a full
`npm run build` + live browser check before the next:

### Milestone 1 - dependencies + folder move, zero behavior change

- Added `react-router-dom`, `@tanstack/react-query`,
  `@tanstack/react-table`, `react-hook-form`, `@hookform/resolvers`,
  `zod`, `@radix-ui/react-tabs`, `@radix-ui/react-dialog`, `recharts`
  (deps) and `vitest`, `@testing-library/react`,
  `@testing-library/jest-dom`, `@testing-library/user-event`, `jsdom`
  (devDeps), pinned to the same majors the reference project already
  validated. `npm audit`: 0 vulnerabilities.
- Every file moved into the target shape (`app/`, `features/<domain>/`,
  `shared/ui/`, `pages/home/`) with only import paths fixed - `App.tsx`
  kept its old manual `active`-state if/else chain unchanged for this
  step, so "did the move break an import" and "did new routing logic
  break something" were never debugged at the same time. `ProjectPanel`'s
  inline `BridgeRow`/`INITIAL_BRIDGES`/Excel-parsing code split into
  `features/project/model/types.ts` and `features/project/api/
  excelImport.ts`; the src-root `generationSummary.ts`/`layoutSeed.ts`
  moved into their owning feature's `model/types.ts`
  (`bridge-alternatives`, `layout-generator`) with barrel `index.ts`
  re-exports.
- **Why `BigMenuPanel`/`PlaceholderPanel`/`sections.ts` live under
  `app/`, not `shared/`**: they depend on this app's own
  `SectionId`/`SECTION_LABELS` taxonomy - domain knowledge `shared/` is
  not allowed to have, per the reference's own rule.
- **Why there's only one `pages/` entry (`home`), not one per screen**:
  the reference's `pages/` composes *multiple* features into one screen;
  SPANOVA shows exactly one section at a time, and `app/router.tsx`'s
  route table plays that composition role for every other section - a
  separate pass-through `pages/<section>/` file per screen would be pure
  ceremony. `home` is different: it's the one screen that reads across a
  feature boundary (bridge-alternatives' results) to build a summary,
  exactly what `pages/` is for.
- Right after this milestone, `shared/ui/TabDetailPanel.tsx` was rebuilt
  on Radix UI's Tabs primitive (real keyboard nav + ARIA tab/tabpanel
  semantics) as an isolated, easy-to-verify follow-up - same visual
  classes, same `DetailCategory[]` prop contract, so `LoadsPanel`/
  `SuperstructureFamiliesPanel` needed no changes.
- **Verified live**: every `WORKING_SECTIONS` leaf, a `BIG_MENU_ITEMS`
  leaf, and a plain placeholder leaf all rendered identically to
  pre-migration; Radix Tabs switching confirmed interactive (Loads'
  Permanent -> Traffic). No console errors.

### Milestone 2 - real URL routing

- `app/router.tsx`: one `<Route path=":section">` reading
  `useParams().section`, reproducing `App.tsx`'s old branching (working
  section -> feature component; `BIG_MENU_ITEMS` key -> `BigMenuPanel`;
  else -> `PlaceholderPanel`), plus `/` -> `/home` and a `*` catch-all
  redirect. `Sidebar`/`TopBar` no longer take `active`/`onSelect` props -
  they read the active section via `useParams()` themselves and navigate
  with real `<Link>`s / `useNavigate()`. `app/providers/AppProviders.tsx`
  wraps `QueryClientProvider` (one shared `QueryClient`).
  `bridges`/`designCode`/the last `GenerationSummary`/`layoutSeed` stay
  exactly where they were - lifted in `App.tsx`, passed to `AppRoutes` as
  props; routing changes *only* which section is active, not this
  session's existing "lift shared state" pattern.
- Added a global `a { color: inherit; text-decoration: none; }` reset
  (`index.css`) since real `<Link>`s render as `<a>` now and none of the
  existing `.spn-nav-item`/`.spn-step` styling was element-qualified, so
  this was the only change needed to keep every nav link's appearance
  identical to the old `<button>`-based version.
- **Verified live**: every leaf reachable via sidebar click AND by typing
  its URL directly (deep-linking, confirmed on a fresh tab to rule out
  dev-server module-cache noise); browser back navigated correctly
  between two visited sections; `location.pathname` matched the clicked
  leaf in every case.

### Milestone 3 - the 3 real-backend forms onto React Hook Form + Zod + TanStack Query

`GenerateWorkflow` (bridge-alternatives), `SiteLayoutPanel`
(layout-generator, including its add/remove-able no-pier-zone list via
`useFieldArray`), `FastSolverPanel` (spanova-fast-solver, including its
fixed-length span/pier-height arrays, registered by index - no
`useFieldArray` needed since that test case's own geometry never
adds/removes a span or pier). For each: a Zod schema
(`model/*Schema.ts`) mirroring the old TypeScript request interface
field-for-field with **generic UI-level checks only** (required,
positive, min &lt;= max - never an invented engineering rule, spec
section 22); the one `fetch()` call relocated verbatim into
`api/*Service.ts`; a `hooks/use*.ts` wrapping it in TanStack Query's
`useMutation` (a "run a job" POST, not a cacheable GET, so mutation
fits, not query); the component swapped its manual `useState` fields for
`useForm({ resolver: zodResolver(schema) })`, same visual
layout/labels/order.

**Real regression caught and fixed during this milestone**: wrapping the
form in a real `<form>`+`type="submit"` (needed for `handleSubmit`)
activated the **browser's own native HTML5 number-input step
validation** (default `step=1`), which silently blocks submission for
any fractional value (`deckWidthM=13.8`, `capBeamDepthM=1.5`, etc.) -
`handleSubmit` never even runs, so neither Zod's validation nor the
mutation ever fires, with no visible error at all. This didn't exist
pre-migration because the old code used `type="button" onClick={...}`
outside any `<form>`, so native constraint validation never engaged.
Root-caused via a `zodResolver`-vs-`handleSubmit` isolation test
(confirmed the resolver itself was correct, then found the native
`input.validity`/`validationMessage` on the fractional fields) - not
assumed away as a tooling artifact, since it was reproducible on a
freshly-opened tab. Fixed with `noValidate` on all 3 `<form>` elements
(Zod is the single source of validation truth here, not native HTML5
constraints) - documented inline at each `<form>` tag.
- **Verified live** (post-fix, on fresh tabs each time): an empty
  `bridgeName` now correctly renders a "Required" error and blocks the
  mutation (no network request); a valid submit with the real default
  fractional values (13.8, 1.5) now correctly fires the POST and shows
  the mutation's own error state (`ERR_CONNECTION_REFUSED` - no backend
  running, expected); `SiteLayoutPanel`'s field array add/remove
  confirmed interactive; `watch()`-driven live hero-title updates
  (`GenerateWorkflow`) confirmed reactive.

### Milestone 4 - test safety net

`vite.config.ts` gained a `test` block (`vitest/config`'s `defineConfig`,
`environment: 'jsdom'`, `setupFiles: ['./src/test/setup.ts']`).
`src/test/setup.ts` registers `@testing-library/jest-dom/vitest`
matchers and an explicit `afterEach(cleanup)` - **without the latter,
RTL's automatic per-test cleanup never registers** (it depends on
`test.globals: true`, which this config deliberately doesn't set), so
every test's rendered tree stayed mounted into the next test's jsdom
document; caught by the `App` routing test seeing 2 copies of the
sidebar. 15 tests across 5 files: `ParamSweepCard.test.ts`
(`generateValues`'s 0/0/0, `min===max`, real-sweep, and invalid-range
cases - the exact logic behind this session's Oval-column bug), one
schema test file per Milestone-3 form (default-form-accepted,
one-rejection-case-each), and `App.test.tsx` (Home renders by default;
clicking the real Sidebar `<Link>` for Materials navigates and renders
`MaterialsPanel`). `npm test` (vitest run): 15/15 pass. `npm run lint`
(oxlint): 0 errors, 4 pre-existing-pattern warnings (React-Compiler-
readiness hints for `watch()`/an effect/a multi-export file - this
project doesn't enable React Compiler, so these are informational, not
blocking). Playwright e2e (present in the reference project) was **not**
set up this pass - flagged as a deferred follow-up needing its own
browser-install step and scenario design, not silently dropped.

### Explicitly deferred (installed, not force-applied to anything)

- **TanStack Table**: no current table needs sorting/filtering; forcing
  it onto `GenerateWorkflow`'s/`SiteLayoutPanel`'s read-only result
  tables would add UI capability nobody asked for.
- **Recharts**: nothing in SPANOVA has chart-able data yet (P08/P09
  aren't built); a demo chart with fake data would violate this repo's
  own "never invent engineering content" discipline.
- **Radix Dialog**: no modal/dialog exists in the app; not forced in
  (Radix Tabs *is* used, since `TabDetailPanel` is literally a tabs
  widget already).

### Verified end-to-end, whole-migration

Re-ran the real Excel-import test from the Materials/Loads round (a
genuine generated `.xlsx`, this time served from `public/` and fetched
in-page rather than base64-injected, after a manual base64 transcription
attempt corrupted the payload - `fetch()` + `File` avoids that failure
mode entirely) against the now-relocated `features/project/api/
excelImport.ts` - imported 2 test rows correctly. `npm run build`
clean; `npm run lint` 0 errors; `npm test` 15/15. No engineering content,
values, or behavior changed anywhere in this migration - only structure,
navigation mechanism, and form-state plumbing (plus the one real
`noValidate` bug fix, itself a plumbing-level fix, not a values change).

## TopBar simplified, dark/light theme toggle, active-nav bug fix (`frontend/`, 2026-09-12, same day)

The engineer marked up a screenshot of the shell (project picker, the
duplicate group-name row, the "which menu am I in" confusion) and asked
for: TopBar de-duplication, an instant dark/light theme switch, removing
Home's Quick Actions entirely, moving "Import Alignment"/"Import
Terrain" into Site & Corridor, a clearer active-menu indicator, and a
smaller/cropped sidebar logo.

- **TopBar simplified**: removed the decorative "Project VIA-35" picker
  (no project-switching backend exists) and the entire old row 2 (Home +
  every sidebar group name) - it duplicated the sidebar exactly.
  `TopBar` is now: row 1 (search, theme toggle, notifications, user),
  then a single leaf row showing the *active* sidebar group's own
  leaves, only rendered when the active section actually belongs to a
  group ("sadece alt menÃ¼ler olacak").
- **Real bug found and fixed while verifying this**: `Sidebar`/`TopBar`
  used `useParams()` to read the active section, but they are *siblings*
  of `<Routes>` in `App.tsx`, not descendants of the matched `:section`
  route's own rendered subtree - `useParams()` can only resolve inside
  that subtree, so it silently always returned `{}` there, and both
  components permanently fell back to `'home'` regardless of the real
  URL. This is exactly what the engineer was reporting
  ("hangi menÃ¼de olduÄŸumuz belli olmuyor"): the sidebar/topbar active
  highlight never actually tracked navigation - only the routed
  *content* did (via `SectionRoute`, which is genuinely inside the
  matched subtree and was never affected). Fixed by switching both to
  `useLocation()` (resolves from anywhere inside the router) and parsing
  the section straight out of `pathname` - correct for every route,
  independent of tree position. A caught-once-should-stay-caught
  regression test was added (`App.test.tsx`): navigate to Materials,
  assert Home's sidebar link loses `spn-nav-item-active` and Materials'
  gains it. (While writing it, also found and fixed a *test*-only bug:
  jsdom's `window.location` is a real shared global that RTL does not
  reset between tests, so a later test's fresh `<BrowserRouter>` mount
  inherited whatever path an earlier test had navigated to - fixed with
  `beforeEach(() => window.history.pushState({}, '', '/'))`.)
- **Active-menu indicator strengthened**: `.spn-step-active` gained a
  thicker (3px) bottom border plus a blue `box-shadow` glow and bold
  text, so the currently active TopBar leaf is unambiguous - compounding
  with the routing fix above (previously, without the fix, the
  underline just never appeared on the right item at all, no matter how
  strong the CSS was).
- **Dark/light theme toggle** (`shared/ui/ThemeToggle.tsx`, sun/moon
  icon in TopBar's row 1): toggles `data-theme` on `<html>` and persists
  to `localStorage` (`spanova.theme`); `main.tsx` applies the saved value
  synchronously before the first paint to avoid a flash. `index.css`
  gained a full `:root[data-theme='light']` palette (background/surface/
  border/text variables) alongside the existing dark set - every
  component already styled via `var(--...)` needed no further change.
  **The sidebar deliberately stays a fixed dark palette in both themes**
  (new non-themed `--sidebar-*` variables, not overridden by
  `[data-theme='light']`): the SPANOVA logo PNG has a dark navy
  background baked into the image itself, so a light sidebar would show
  it as a mismatched dark rectangle - a permanently-dark sidebar next to
  a light-or-dark content area is a common, deliberate pattern (VS Code,
  Vercel, Linear, etc.), not an oversight, and was the only way to keep
  the light theme looking coherent without re-exporting the logo image.
- **Logo cropped, not re-exported**: the PNG (1536x1024) has the bridge
  graphic + "SPANOVA" wordmark in its top ~74% and a barely-legible
  tagline ("COMPUTATIONAL & GENERATIVE BRIDGE DESIGN") in the rest -
  the engineer asked to make it legible or drop it, and not oversize the
  logo. Cannot edit a raster image's pixels directly, so
  `.spn-sidebar-logo-crop` (fixed `aspect-ratio: 1536/758` +
  `overflow: hidden`) clips the image to just the top portion, and
  `max-width` dropped from 180px to 160px.
- **Home page's Quick Actions removed entirely** (engineer's own words -
  "HOME sayfasÄ±ndaki butonlarÄ±n hepsini siilelim"). "Import Alignment"
  and "Import Terrain" moved into their matching Site & Corridor leaves
  rather than being deleted outright: a new `shared/ui/
  ImportActionScreen.tsx` (title + one disabled action button, same
  "Not built yet - P07" treatment the old Quick Actions used) is now
  rendered by `app/router.tsx`'s explicit `alignment`/`terrain-dtm`
  branches. `alignment` was removed from `BIG_MENU_ITEMS` (its old
  Horizontal Alignment/Vertical Profile/Cross Sections `BigMenuPanel`
  cards are gone - "orada sadece import aligment olsun"); `terrain-dtm`
  keeps its original deactivation rationale as this screen's `note`
  rather than losing that documented reasoning.
- **Verified live in the browser** (cross-checked on fresh tabs
  throughout, after two more one-time dev-server-cold-start/stale-HMR
  console artifacts were ruled out the same way as previous rounds):
  Home shows no buttons; Alignment shows only "Import Alignment";
  Terrain / DTM shows "Import Terrain" plus its original rationale;
  clicking through Girder Library, 3D Terrain / DTM, Materials, etc. now
  correctly highlights the right sidebar item AND the right TopBar leaf
  every time (confirmed programmatically via
  `document.querySelectorAll('.spn-nav-item-active')`, not just by eye);
  the theme toggle flips the whole content area instantly, persists
  across a full reload, and leaves the sidebar/logo dark in both modes.
  `npm run build`/`lint`/`test` all clean (16/16 tests, one new
  regression test added).

## Real Precast deck cross section, Project Dashboard real values, menu prunes, generic Cost Database import (`frontend/`, 2026-09-13)

The engineer sent a reference AutoCAD-style deck cross-section drawing
and a round of smaller shell/menu instructions.

- **Superstructure Families > Precast is real now**
  (`features/superstructure-families/components/PrecastCrossSection.tsx`):
  same "diagram + parameters" pattern as Pier Families/Girder Library
  (reuses `shared/ui/ParamSweepCard.tsx`'s `HDim` helper), but with plain
  stacked edit boxes instead of a min/max/delta table - Platform width,
  Left/Right walkway, Space of girder, Number of girders, Height of
  deck/asphalt/waterproofing, Prefabricated cap B x H (2 boxes). Wiring
  this into `TabDetailPanel` required extending its `DetailCategory`
  type with an optional `content: ReactNode` (alongside the existing
  `status: string` placeholder text) - a category now has real
  interactive content OR a plain status string, never both.
  - **Overhang is computed from the engineer's own given formula**, not
    invented or "corrected" to standard girder-spacing convention:
    `girderSpanWidth = spaceOfGirder Ã— numberOfGirders`,
    `overhang = (platformWidth âˆ’ girderSpanWidth) / 2`. Validated live
    against the engineer's own check (`overhang â‰¥ spaceOfGirder / 2`)
    with a green "OK..."/red "NOT OK!" indicator next to the (read-only,
    computed) value. The default values (13.80/1.00/1.50/2.00/5) give
    overhang = 1.90 m, OK.
  - The diagram's girder positions use this **exact same formula** (the
    girder group is `spaceOfGirder Ã— numberOfGirders` wide, centered in
    the platform width) - the drawing and the computed number always
    agree, never independently fudged. Layer thicknesses and girder
    shapes are schematic/not to scale, same convention as
    `GenerateWorkflow`'s `ElevationPreview`.
- **Project Dashboard now has the real project's own values** (not
  placeholders): Project Name = "Sibiu-Pitesti-Lot2", Country =
  "Romania", Status = "Continue...". Per the engineer's own layout
  instruction, this info block moved to the **top** of the page (was
  below the stats before); the stats block (Route Length/Number of
  Bridges/Design Code) is now second. The card title's "1." prefix was
  dropped ("Project Summary'deki '1.' yazÄ±sÄ±nÄ± sil").
- **Menu prunes** (`app/navigation/sections.ts`) - cancelled outright,
  not left as placeholders: `carbon-database` (Project group) and
  `construction-methods` (Design System group) removed from `SectionId`,
  `SIDEBAR_GROUPS`, `Sidebar.tsx`'s icon map, and `PlaceholderPanel`'s
  milestone map. `Construction` removed from `LoadsPanel`'s
  `LOAD_CATEGORIES` (engineer's own instruction, "LOAD's da construction
  load'u kaldÄ±r").
- **Cost Database is real now**
  (`features/cost-database/components/CostDatabasePanel.tsx`) - a
  generic "From Excel" import, not a specific cost-data schema (no
  column spec has been given yet, unlike Bridge Information's real
  7-column sheet, so none was invented): whatever column headers the
  uploaded sheet's first row has become the table's columns verbatim.
  Same `xlsx` (SheetJS) library already installed and `npm audit`-
  checked for the Bridge Information import.
- **Verified live in the browser** (fresh tab, no console errors):
  Precast's diagram/fields render and react correctly to input changes -
  tested both the default OK case (overhang 1.90 m) and a forced NOT-OK
  case (7 girders â†’ overhang âˆ’0.10 m, red "NOT OK!", diagram degrades
  gracefully, no crash); Project Dashboard shows the 3 real values in
  the right fields, "Project Summary" title has no "1."; Cost Database's
  "From Excel" imports a generic 4-column test sheet and renders it
  exactly as uploaded; sidebar/Loads no longer mention Carbon Database/
  Construction Methods/Construction anywhere
  (`document.body.innerText.includes(...)` checked, not just visual).
  `npm run build`/`lint`/`test` all clean (16/16 tests, no new
  warnings).

## Shape-card layout unified (diagram on top), Girder Library on tabs, static Precast diagram (`frontend/`, 2026-09-13, same day)

Same-day follow-up round on the Precast cross section and the shape-card
UI pattern in general.

- **Precast cross section simplified**: Height of deck/asphalt/
  waterproofing and Prefabricated cap B x H removed entirely
  ("ÅŸekildeki bilgileri superstructuras menÃ¼'den kaldÄ±r") - only
  Platform width, Left/Right walkway, Space of girder, Number of
  girders, and the computed Overhang remain.
- **Shape-card layout unified across Pier Families/Girder Library/
  Superstructure Families > Precast**: diagram is now a full-width row
  on top, parameters below it - not side by side as before ("Ã¼styapÄ±
  ÅŸekli Ã¼stte tam satÄ±r olsun, parametrik deÄŸerler onun altÄ±nda olsun").
  `shared/ui/ParamSweepCard.tsx` (used by Pier Families and Girder
  Library) restructured accordingly: new `.spn-shape-card-header`
  (title + checkbox) and `.spn-shape-card-diagram` (centered, full
  width) CSS classes replace the old side-by-side `.spn-pier-row`/
  `.spn-pier-params`. This is also what let the min/max/delta table fit
  its full 620px width without needing to horizontally scroll anymore -
  it's no longer squeezed into a narrow column next to a diagram.
- **Precast's diagram is now static, not reactive to girder count/
  spacing** ("aralÄ±k ve kiriÅŸ sayÄ±sÄ±na gÃ¶re ÅŸekli deÄŸiÅŸtirme, sadece
  hesap yap, uyar"): it always draws the same fixed 5-girder
  arrangement, using the *real* bulb-tee outline extracted from Girder
  Library (`shared/ui/BulbTeeGirderShape.tsx`, a new reusable geometry
  component - not the simplified trapezoid from the previous round).
  Only the dimension-line **labels** (platform width/walkways/space of
  girder) read the live entered values as text; the drawn geometry
  itself never changes. The Overhang calculation and its OK/NOT OK
  check still use the live values exactly as before - only the artwork
  is fixed, not the engineering.
- **Girder Library restructured onto top tabs** ("girder library'de 3
  tip iÃ§in 3 farklÄ± Ã¼st menÃ¼ olsun, aynÄ± superstructure familie'deki
  gibi"): now built on the same `shared/ui/TabDetailPanel.tsx` as
  Superstructure Families - Precast Girder/Steel Girder/Box Girder tabs,
  each rendering its own `content`. Precast Girder's `ParamSweepCard`
  and dimension-line overlays are unchanged in substance, just
  re-homed under a tab instead of being the first of 3 stacked cards;
  Steel/Box Girder's placeholder cards moved to their own tabs too
  (same honest "awaiting engineer input" text as before).
- **No visible scrollbar on overflowing tab rows** ("en altta slider
  olmasÄ±n", both for Loads and implicitly TopBar's own leaf row/Girder
  Library's tabs): `.spn-steps-row` gained `scrollbar-width: none` +
  `::-webkit-scrollbar { display: none }` - still scrollable via wheel/
  trackpad/touch/drag, just no visible track/thumb.
- **No vertical grid lines in parameter tables** ("edit box'larda dÃ¼ÅŸey
  Ã§izgiler ile edit box sÄ±nÄ±rÄ± Ã¼st Ã¼ste gelmesin... dÃ¼ÅŸey Ã§izgileri
  kaldÄ±r" - a screenshot showed a table cell's own vertical border
  visually clashing with an edit box's rounded border sitting right
  against it, e.g. Girder Library's bf/tf rows): `.spn-param-table th`/
  `td` now get `border-left: none; border-right: none` (only the
  existing horizontal row-separator border remains) - scoped to
  `.spn-param-table` specifically, not the general `.spn-table` used by
  Materials/Bridge Information/etc., so this doesn't change those.
- **Verified live in the browser** (fresh tab): Precast's diagram
  confirmed static across girder-count/spacing edits (only labels and
  the Overhang/OK-NOT-OK number change); Girder Library's 3 tabs all
  render correctly (Precast Girder's real table, Steel/Box Girder's
  placeholders); `.spn-param-table td` computed style confirmed
  `border-left/right: none` programmatically; `.spn-steps-row`'s
  computed `scrollbar-width: none` confirmed on both an overflowing row
  (TopBar's Design System leaf row) and a non-overflowing one (Loads).
  `npm run build`/`lint`/`test` clean, 16/16 tests, no new warnings.

## Menu reorg, sidebar theme reversal, real map, Bridge Information CRUD (`frontend/`, 2026-09-13, same day)

Another same-day round: engineer sent 3 screenshots (sidebar, TopBar tab
row, Project Dashboard/Bridge Information) with a numbered list of menu
and feature changes.

- **Menu reorganized** (`app/navigation/sections.ts`): Materials/Loads
  moved from the Project group into Design System (now its first two
  leaves, in that order - "Material ilk sÄ±rada olsun"). `seismic`
  removed from Site & Corridor entirely - its 4 items (Hazard Data/PGA-
  Spectral Data/Site Class/Design Spectrum) now render as real content
  inside Loads' own "Seismic" tab (`features/loads/components/
  LoadsPanel.tsx`), via a newly-extracted `shared/ui/
  DisabledItemGrid.tsx` (the same card-grid `BigMenuPanel` already used,
  now shared so Loads can reuse it without depending on `app/`).
  `meteorology` removed outright, not merged anywhere - the engineer's
  own reasoning: Loads already has Temperature/Wind, a separate leaf was
  redundant. Design System's "Families"/"Library" label suffixes dropped
  everywhere (Superstructure/Girder/Preferred Span/Pier/Abutment/
  Foundation/Bearing) - only the *displayed* label changed, the
  `SectionId`/route values are untouched, so nothing else needed
  updating.
- **Sidebar theme reversed back to following the app theme** - a
  deliberate fixed-dark-sidebar decision from the *previous* round was
  explicitly corrected by the engineer ("aÃ§Ä±k moda aldÄ±ÄŸÄ±n zaman
  yandaki menÃ¼de aÃ§Ä±k olsun, o koyu kalÄ±yor"). `.spn-sidebar`/
  `.spn-nav-item`/`.spn-nav-group-header`/etc. now use the themed
  `var(--surface-1)`/`var(--text-secondary)`/etc. variables again, not
  the fixed `--sidebar-*` constants. The one thing kept fixed: the logo
  now sits in its own small dark badge (`.spn-sidebar-logo`,
  `background: var(--sidebar-bg)`) so it doesn't show as a mismatched
  dark rectangle on a light sidebar - a proactive fix for the exact
  problem the earlier fixed-dark-sidebar was trying to avoid, now solved
  at the logo level instead of the whole sidebar.
- **Project Dashboard gets a real, live map**
  (`shared/ui/CountryMap.tsx`) - Google Maps' own no-API-key "embed a
  map" iframe (`output=embed`, the mechanism behind Google's own
  "Share > Embed a map", not the paid/keyed Maps JavaScript/Earth API),
  satellite/hybrid view (`t=k`). Country/Region is now a `<select>`
  (`shared/lib/countries.ts` - a standard country-name reference list,
  not an engineering value, so no "never invent" concern) instead of
  free text; changing it re-centers the map (the iframe is keyed on the
  place name, forcing a clean remount/reload rather than relying on
  `src` alone). Google auto-fits the zoom to the selected place's own
  extent - no hardcoded per-country zoom levels.
- **Bridge Information gets real row Edit/Delete + an Add form**
  (`features/project/components/ProjectPanel.tsx`) - a new
  `BridgeBaseFieldsForm` (shared by both Edit and Add) covers exactly
  the table's own 7 base columns (No/KM/Crossing Type/Estimated Length/
  Road Width/Terrain/Status); the existing per-bridge "additional
  details" panel (bridge type/span/girder/pier, opened by clicking the
  row) is untouched and reachable exactly as before. Edit/Delete buttons
  call `stopPropagation()` so they don't also trigger the row's own
  click-to-expand. Delete asks for confirmation (`window.confirm`).
  New bridges get the same documented defaults already used for
  Excel-imported rows lacking span/girder/pier data (Precast Girder,
  30-35-40 m spans, 160-190 cm girder depth, Rectangular piers) - not a
  new invented default. Adding/removing a row is just a `bridges` array
  length change, so Project Dashboard's Route Length/Number of Bridges
  (already derived live from that same array) update themselves with no
  extra wiring - confirmed live via client-side navigation (not a hard
  reload, which would have reset the in-memory `bridges` state and
  produced a false negative).
- **Verified live in the browser**: Design System's sidebar order/labels
  confirmed; Seismic/Meteorology confirmed absent from the sidebar via
  `.innerText`, not just visually; Loads' Seismic tab shows its 4 merged
  items; light theme confirmed on the sidebar (background/nav-item
  colors) with the logo's dark badge still legible; the map iframe
  loaded real satellite tiles for Romania, then correctly re-zoomed to
  Turkey after changing the dropdown; Edit pre-filled VIA-01's real
  values, saved a Status change, and the table reflected it; Delete
  removed VIA-12 (row count 12 -> 11) and Project Dashboard's Number of
  Bridges updated to 11 via a real in-app navigation; Add created
  VIA-13 with the documented defaults (row count back to 12). No
  console errors throughout. `npm run build`/`lint`/`test` clean, 16/16
  tests, no new warnings.

## Root `README.md` added, `frontend/README.md` rewritten (`frontend/`, 2026-09-13, same day)

A new root-level `README.md` (project overview, doc index, repository
layout, `start-dev.bat`/manual quick start, build status summary).
`frontend/README.md` was still the unedited Vite template text (never
mentioned SPANOVA) - rewritten with the real feature-sliced
architecture, the actual `npm` commands, notable dependencies (React
Router/TanStack Query/RHF+Zod/`xlsx` from the official SheetJS CDN/
Radix Tabs/the still-unused TanStack Table+Recharts+Radix Dialog), and
what the Vitest suite actually covers. Doc-only change - no build/test/
lint re-run needed beyond confirming the repo still built clean from
the prior round.

## Loads > Self Weight & Permanent real load-breakdown calculator + Superstructure Carriageway, cross-feature reactivity (`frontend/`, 2026-09-13, same day)

The engineer's own numbered spec (2 reference images: the Loads tab
row, and the Precast deck cross-section diagram) turned Loads'
"Permanent" tab from an honest placeholder into a real permanent-load
breakdown, and added a computed field to Superstructure Families'
Precast cross section that feeds it - the first genuine cross-feature
*reactive* data flow in the app (one feature's edit live-updates
another feature's calculation, no page reload).

- **Superstructure Families > Precast gets Carriageway**
  (`features/superstructure-families/components/PrecastCrossSection.tsx`) -
  a new computed, read-only field: horizontal distance at the base of
  the sidewalk, `platformWidthM - leftWalkwayM - rightWalkwayM`
  (`carriagewayWidthM`, `features/superstructure-families/model/types.ts`
  - the engineer's own given definition, spec section 22). This is also
  the first Superstructure Families value another feature needs live,
  so `CrossSectionValues` moved out of `PrecastCrossSection`'s local
  `useState` into `App.tsx` (`crossSectionValues`/`setCrossSectionValues`),
  threaded through `router.tsx` to both the `superstructure-families`
  and `loads` routes - the same "lift shared state" pattern already used
  for `bridges`/`designCode`/`summary`/`layoutSeed`, applied for the
  first time across a feature boundary rather than within one screen's
  own sub-panels.
- **Loads' "Permanent" tab renamed "Self Weight & Permanent"** and
  rebuilt as a real calculator
  (`features/loads/components/SelfWeightPermanent.tsx`), implementing
  the engineer's 8 rows exactly as given (spec section 22 - no invented
  formula):
  - Concrete Self Weight = 25 kN/m&sup3; - flat, passive, no edit box (the
    engineer's own explicit instruction).
  - Asphalt = thickness (edit) x Carriageway (passive, cross-fed live
    from Superstructure) x unit weight (edit) kN/m.
  - Kaldirim (Sidewalk) = thickness (edit) x (Left walkway + Right
    walkway) (passive, cross-fed live from Superstructure, displayed as
    e.g. "1.00 + 1.50") x unit weight (edit) kN/m.
  - Precast facia, Guardrail, Pedestrian railing, Protective fence,
    Sound panel - each exactly the engineer's given formula
    (`count x width x thickness x unit weight` or `count x unit load`),
    every term a live edit box (no exception was given for these rows,
    so - consistent with Asphalt's own explicit "all 3 values in edit
    boxes" instruction - every term stays editable except the three
    the engineer named passive).
  - TOTAL = sum of the 7 kN/m line-load rows (Concrete Self Weight is a
    kN/m&sup3; material property, not a line load, so it's excluded from
    the sum - the engineer's own "45.67 kN/m"-style example only sums
    line loads).
  - New `.spn-formula-row`/`.spn-formula-input`/`.spn-formula-total`
    etc. CSS (`app/styles/App.css`) - a label + "x"-joined term boxes +
    "= result" row, reusing the existing `.spn-input`/`.spn-input-number`
    control styling rather than inventing a new input look.
- **Verified live in the browser** (fresh tab, dev server cold-start
  avoided per established practice): with the default Superstructure
  values (platform 13.8 m, walkways 1.00/1.50 m -> Carriageway 11.30 m),
  every row's live-computed result matched a hand check (Asphalt 27.12,
  Kaldirim 15.63, facia 2.80, guardrail 4.00, pedestrian railing 3.00,
  fence 2.00, sound panel 1.00, TOTAL 55.55 kN/m). Then, via real in-app
  `<Link>` navigation (not the Browser tool's hard `navigate()`, which
  would reset in-memory state and produce a false negative): changed
  Left walkway 1.00 -> 2.00 m in Superstructure Families, confirmed
  Carriageway updated to 10.30 m there, then navigated to Loads and
  confirmed Asphalt (24.72), Kaldirim (21.88, width now "2.00 + 1.50"),
  and TOTAL (59.39 kN/m) all updated with no reload - the cross-feature
  reactivity the engineer asked for. No console errors. `npm run
  build`/`lint`/`test` clean, 16/16 tests, no new warnings.

## Loads/Superstructure follow-up: dynamic girder diagram, Carriageway label, dark-green walkways, 2-decimal formatting (`frontend/`, 2026-09-13, same day)

The engineer sent 4 more reference images (the Self Weight & Permanent
table and the Precast field grid, each with red/blue circles marking
which fields are exceptions; two versions of a redrawn target deck
cross section) with 7 numbered follow-ups to the round above.

- **Diagram is dynamic again** - reverses this same day's earlier
  "keep the diagram static" decision. `PrecastCrossSection.tsx`'s
  `DeckCrossSectionDiagram` now derives girder count/positions,
  walkway widths, and the Carriageway/Overhang dimension lines from
  `values` on every render, using the *same* overhang formula already
  shown numerically below the diagram (girder `i` centered at
  `overhangM + spaceOfGirderM x (i + 0.5)` from the left edge - derived
  from, not separate from, the existing formula) - so the drawing and
  the numbers can never disagree, including the "NOT OK" case (girders
  drawn past the deck edge when overhang goes negative, an honest
  visual warning rather than a hidden one). Girder render scale shrinks
  adaptively with spacing to reduce overlap at high girder counts,
  floored/capped so it never vanishes or exceeds the original look.
- **New "Carriageway: X m" dimension line** in the middle of the
  diagram (between the walkway row and the deck), and two new
  "Overhang: X m" dimension lines below the girders (one each side,
  from the deck edge to the outermost girder center) - both the
  engineer's own requested additions, both reusing the existing `HDim`
  helper, no new diagram primitive needed.
- **Walkway zones are dark green and resize live** (`#1f6f40` fill,
  literal hex - "koyu yeÅŸil" is a specific color choice, not a
  theme-driven one) - width is now `leftWalkwayM`/`rightWalkwayM`
  scaled to the diagram's pixels-per-meter, so a wider walkway visibly
  extends inward and a narrower one shrinks, instead of the previous
  fixed 150px.
- **New shared `shared/ui/DecimalInput.tsx`** - a text input that shows
  2 decimals (`value.toFixed(2)`) while unfocused and the user's raw
  typed text while focused (so "0.1" doesn't snap to "0.10" mid-
  keystroke and block further typing), reformatting on blur. Used for
  every editable decimal field in both `PrecastCrossSection.tsx`
  (Platform width/Left walkway/Right walkway/Space of girder) and
  `SelfWeightPermanent.tsx` (every editable term except the integer
  "count" fields). `Number of girders` and the 5 count fields
  (facia/guardrail/pedestrian-railing/protective-fence/sound-panel)
  stay plain `<input type="number">`, unformatted - the engineer's own
  circled exception ("kÄ±rmÄ±zÄ± iÅŸaretli sayÄ±lar dÄ±ÅŸÄ±ndakilerin hepsi 2
  desimalli olsun").
- **New `.spn-input-passive` CSS class** (`app/styles/App.css`) -
  grayed-out background/text/cursor for every computed, read-only
  field (Concrete Self Weight, Asphalt's and KaldÄ±rÄ±m's width terms in
  `SelfWeightPermanent.tsx`; Carriageway and Overhang in
  `PrecastCrossSection.tsx`) so a passive field visually reads as "not
  enterable" instead of looking identical to a live edit box - the
  engineer's own circled distinction ("mavi iÅŸaretli sayÄ±larÄ±n edit
  box'Ä±nÄ± gri gÃ¶rÃ¼nÃ¼mlÃ¼ yap").
- **Verified live** (fresh tab): Superstructure's diagram confirmed
  redrawing correctly at girder count 5 -> 8 (including the NOT OK
  negative-overhang case, girders visibly spilling past the deck) and
  Left walkway 1.00 -> 3.00 m (green zone widened inward, Carriageway
  label updated 11.30 -> 9.30 m live in the diagram itself, not just
  the field grid); typing "3.00" into a `DecimalInput` worked
  character-by-character with no mid-keystroke reformatting fighting
  the input. Loads' Self Weight & Permanent then correctly showed the
  same 3.00+1.50 walkway
  sum (gray KaldÄ±rÄ±m width term) and 9.30 m gray Asphalt width term,
  both results recomputed. No console errors. `npm run build`/`lint`/
  `test` clean, 16/16 tests, no new warnings.

### Update, same day: Space of girder moved to the bottom row, between the 2nd and 3rd girder

A follow-up reference image showed "Space of girder" at the bottom of
the diagram, alongside the two Overhang labels. First pass added it
there as a *second* label (kept the original one above the girders
too, spanning the first two girder centers) - the engineer then
clarified: remove the top one, keep only the bottom one, and anchor it
between the 2nd and 3rd girder specifically (not the 1st/2nd). Final:
one `HDim` at `overhangDimY` (same row as the two Overhang labels)
spanning `girderCentersPx[1]` to `girderCentersPx[2]` - reuses the
existing live `spaceOfGirderM` value and the same `HDim` helper, no
new state or formula; only rendered when there are at least 3 girders
(guards the array access). Verified live: reads "Overhang: 1.90 m ...
Space of girder: 2.00 m ... Overhang: 1.90 m" along the bottom row,
centered between girders 2 and 3, with no duplicate label above the
girders anymore. `npm run build`/`lint`/`test` clean, 16/16 tests.

## Design System reorder, Load Combination rename, real Terrain/DTM import (`frontend/`, 2026-09-14)

Three small, independent asks from the engineer's own screenshots.

- **Design System's Materials/Loads moved to the end** of the group
  (`app/navigation/sections.ts`'s `SIDEBAR_GROUPS`) - previously first,
  now after Standardization Rules. `TopBar.tsx` reads the same array
  (no separate ordering to maintain), so both the sidebar and the top
  tab row updated together.
- **"Load Cases & Combinations" -> "Load Combination"**
  (`features/loads/components/LoadsPanel.tsx`) - label only, the
  category's placeholder content is unchanged.
- **3D Terrain / DTM's Import Terrain button is real now**
  (`features/terrain-dtm/components/TerrainDtmPanel.tsx`, new feature,
  replaces the disabled `shared/ui/ImportActionScreen` placeholder on
  this route only - Alignment keeps its own disabled placeholder,
  untouched). Terrain itself is still explicitly deactivated
  (`docs/SITE_LAYOUT_PLATFORM_ANALYSIS.md` addendum Q - no
  `TerrainModel`, pier/abutment heights stay external), so this screen
  only *ingests and summarizes* whatever DTM/point file is uploaded -
  it does not generate a surface, TIN, or contours, which would be real
  unbuilt engineering functionality, not a side effect of "activating
  the button." A text point file (`.xyz`/`.csv`/`.txt`, X/Y/Z per line,
  comma- or whitespace-separated) is parsed client-side: point count,
  X/Y/Z bounding box, and a row preview (first 10) - same "generic
  import, no invented schema" discipline as Cost Database's/Bridge
  Information's Excel imports, and a non-numeric header row is silently
  skipped rather than aborting the import. A file that doesn't parse as
  a plain point list (e.g. a binary GeoTIFF) is still accepted and
  recorded (filename/size) but honestly labeled as not previewable yet,
  not faked or silently dropped.
- Verified live (fresh tab): sidebar and TopBar both show Materials/
  Loads last; Loads' tab row reads "Load Combination"; Alignment
  confirmed still disabled/untouched; a real 5-point `.xyz` test file
  (header row + 5 data rows), injected via the browser's File/
  DataTransfer APIs (no native file-picker automation in this harness),
  correctly parsed to "5 point(s). Bounds: X [100.00, 106.00], Y
  [200.00, 201.50], Z [15.50, 16.90]" with all 5 rows in the preview
  table; Clear correctly reset the screen to empty. No console errors.
  `npm run build`/`lint`/`test` clean, 16/16 tests, no new warnings.

## TERRAIN-P01: real 3D terrain from DTM import (`backend/`, `frontend/`, 2026-09-14)

The engineer asked for a full research-then-plan pass before any code (a
large architecture prompt covering DTM import through corridor-scale
tiling/LOD) and, in the plan-approval step, scoped the *first*
milestone tightly: **DTM -> Java `TerrainModel` -> elevation query ->
React Three Fiber mesh -> alignment overlay** - no satellite imagery,
no 50-bridge corridor, no LOD, no automatic bridge-layout placement.
Research (3 parallel Explore agents over backend/frontend/docs) found
that `docs/SITE_LAYOUT_PLATFORM_ANALYSIS.md` sections C-F/L had already
designed almost exactly this `TerrainModel`/coordinate/GIS architecture
once, then deliberately deactivated it in "addendum Q" purely because
no real DTM data existed yet - so this round **reactivates and extends
that already-agreed design**, it is not a redesign. One deliberate
deviation from that older doc: its roadmap sequenced a 2D map
(MapLibre) before 3D (Three.js); the engineer's own instruction this
round skips straight to Three.js/React Three Fiber, so no MapLibre was
added - flagged explicitly, not silently contradicted.

- **New backend module `backend/terrain`** (Spring-free, depends only
  on `spatial-core` + JTS Topology Suite `jts-core:1.20.0` - JTS's
  license was already checked and confirmed clear in the docs; not
  exposed anywhere in this module's own public API):
  - `TerrainModel` (record: id/projectId/`CoordinateSystem` label/
    bounds/min-max elevation/`vertices`/`triangles`/`localOrigin`/
    version/status) - solver- and rendering-independent, same
    discipline as `bridge-core`.
  - `XyzTerrainParser` - tolerant whitespace/comma X/Y/Z parsing,
    silently skips a non-numeric header row, mirroring the client-side
    prototype from the 2026-09-14 "Import Terrain" round exactly.
  - `TerrainImportService` - dedupes points sharing an (x,y) (a TIN is
    single-valued), triangulates via JTS's `DelaunayTriangulationBuilder`
    (2D Delaunay over x,y; z reattached per site afterwards - the
    standard "2.5D" TIN approach), computes bounds/`localOrigin`
    (= bounds min).
  - `TerrainQueryService.getElevation(terrain, x, y)` - barycentric
    interpolation over whichever triangle contains (x,y), a plain
    linear scan (fast enough at single-bridge-site scale; a spatial
    index is deferred to the corridor-scale/tiling milestone where it
    would actually matter).
  - `InMemoryTerrainRepository` - no persistence layer exists anywhere
    else in this app yet either (`BridgeLayoutEngine`/`GenerateWorkflow`
    results aren't persisted server-side today), so this matches the
    rest of the codebase rather than introducing a database decision
    nobody asked for.
- **New `backend/api` endpoints**: `com.spanova.api.terrain.TerrainController`
  (`POST /api/terrain/import`, `GET /api/terrain/{id}/mesh` - a flat,
  indexed-buffer-friendly payload, "do not send one object per
  triangle", vertices already translated by `localOrigin` so real-world
  coordinates never reach the frontend; `GET /api/terrain/{id}/elevation`)
  and `com.spanova.api.alignment.AlignmentController`
  (`POST /api/alignment/sample`) - a thin wrapper reusing the existing,
  already-tested `Alignment.toXYZ` to sample a straight alignment's
  (x,y) at a chainage step; **deliberately returns no z** (no vertical
  alignment model exists - see `Alignment`'s own javadoc) so the
  frontend drapes the overlay onto the terrain via a real elevation
  query instead of a fabricated value.
- **New backend tests** (`backend/terrain`, 6 tests): a hand-built
  planar surface (z = 2 + 0.5x + 0.3y over a 2-triangle quad) where
  barycentric interpolation of a planar function is exact everywhere,
  regardless of which triangle a query point falls in - a solid,
  engineer-independent correctness check ("compare selected terrain
  elevations against source DTM values"); plus a real parse-triangulate-
  query round trip confirming a header row is skipped and a known
  vertex's elevation comes back exactly.
- **New frontend feature `features/terrain-viewer/`** (wires into the
  sidebar's already-existing, previously-empty "3D & Visualization"
  leaf, whose own placeholder text already named Three.js/react-three-
  fiber as the intended stack): `TerrainViewerPanel.tsx` (Canvas +
  `@react-three/drei`'s `OrbitControls`/`Bounds`/`Html`), `TerrainMesh.tsx`
  (builds a `THREE.BufferGeometry` from the flat mesh payload, normals
  computed client-side via Three's own `computeVertexNormals()` rather
  than sent by the backend, click-to-inspect elevation via the real
  query endpoint), `AlignmentOverlay.tsx` (drapes a sampled alignment
  polyline onto live-queried terrain elevation, drei's `Line`),
  `lib/coordinateTransform.ts` (the **single** engineering-Z-up ->
  Three.js-Y-up axis swap point, used nowhere else). The alignment's
  start/end default to the terrain's own bounding-box diagonal (an
  honest "corner to corner across the imported data" default, editable)
  since there is still no dedicated alignment-definition screen.
- **`features/terrain-dtm/components/TerrainDtmPanel.tsx` now round-
  trips through the real backend** instead of only parsing client-side:
  a new "Coordinate system" text field (honest label, spec section 22 -
  "if coordinate system cannot be reliably determined, ASK THE USER",
  no silent EPSG guess, no reprojection math anywhere in this
  milestone), and a "View in 3D" link once import succeeds. The preview
  table now sources from the backend's own deduplicated vertex list
  (`TerrainImportResponse.previewPoints`), not a second client-side
  parse.
- **New dependencies**: `three`, `@react-three/fiber`, `@react-three/drei`,
  `@types/three` - installed with `--legacy-peer-deps` because
  `@react-three/fiber@9.7.0`'s published peer range (`react >=19 <19.3`)
  is stale against this project's React 19.3.0 (confirmed via `npm
  view`); no other peer conflicts. That flag also revealed
  `@testing-library/dom` had been an implicit, undeclared peer of
  `@testing-library/react` - added explicitly as a devDependency so the
  test suite doesn't depend on npm's legacy auto-peer-install behavior.
- **Verified live** (fresh tab): a real 49-point synthetic `.xyz` grid
  (7x7, sinusoidal elevation variation, injected via the browser's
  File/DataTransfer APIs) imported to "49 point(s), 72 triangle(s)";
  curl-verified every new endpoint directly first (import/mesh/
  elevation-inside/elevation-outside/alignment-sample) before the
  browser pass. In the viewer: the terrain rendered as a real undulating
  3D surface; orbit-drag rotated the camera correctly; clicking the
  terrain returned "X 55.88 m, Y 19.81 m - elevation 115.06 m" (matches
  the backend's own query, not a separate client computation); "Fit to
  Terrain" re-framed the camera with no error; the alignment overlay
  (orange line, corner-to-corner default) was visible draped across the
  terrain surface after rotating for a clear view. No console errors
  throughout. `mvn -B package` clean (6/6 new backend tests, whole
  reactor green); `npm run build`/`lint`/`test` clean, 16/16 tests, no
  new warnings.
- **Explicitly deferred** (not silently dropped - see docs/roadmap.md's
  TERRAIN-P02-P04 entries): satellite/orthophoto draping, bridge/pier/
  abutment 3D geometry, terrain longitudinal profile chart, a layer on/
  off manager, terrain tiling/LOD/corridor-scale streaming, terrain
  versioning/dependency invalidation, and - separately, the actual
  addendum-Q reactivation - `AbutmentPlacementEngine`/
  `PierPlacementEngine` consuming `TerrainQueryService` to *compute*
  heights instead of reading external input; `BridgeLayoutEngine` is
  completely untouched by this round.

## LANDXML-P01: LandXML import - terrain TIN + alignment + vertical profile (`backend/`, `frontend/`, 2026-09-14)

While testing TERRAIN-P01 with the engineer's own real DTM file,
importing it produced a degenerate result (X bounds collapsed to
0.00/0.00) - the raw XYZ export wasn't a clean 2D terrain point cloud.
The engineer's own conclusion: import the real source format instead -
a LandXML file from Civil 3D, carrying a proper pre-triangulated TIN, a
horizontal alignment, and a vertical profile together as one coherent,
traceable dataset. Another research-then-plan-then-approve round (this
time a single, lighter Explore pass, since most of the relevant code
had just been built this same session): the research confirmed
`docs/SITE_LAYOUT_PLATFORM_ANALYSIS.md` had already anticipated exactly
this ("LandXML/DEM/TIN import each produce this [TerrainModel]") as a
later, separate effort from the synthetic-TIN first milestone - so this
round **extends** TERRAIN-P01's domain objects and the entire
`features/terrain-viewer` 3D stack rather than rebuilding them.

- **New backend module `backend/landxml-import`** (Spring-free, flat
  `com.spanova.landxml` package - matches this project's actual module
  convention, not the deeply-layered domain/application/infrastructure
  structure the engineer's own reference prompt suggested, which
  doesn't match how `terrain`/`alignment`/`constraints` are actually
  built here): `LandXmlParser` (JDK-built-in StAX, `javax.xml.stream` -
  no new dependency; streams forward-only so a Civil 3D surface export
  with hundreds of thousands of `<P>`/`<F>` elements doesn't need to be
  held as an in-memory DOM tree), the `LandXml*` DTOs (never leak past
  the mappers - anti-corruption layer), `LandXmlTerrainMapper`
  (preserves the source TIN's own `<F>` faces 1:1 as `TerrainTriangle`s
  - no JTS re-triangulation, unlike the XYZ import path),
  `LandXmlAlignmentMapper`/`LandXmlProfileMapper`, and
  `LandXmlImportService` (the two-step `inspect`/`commit` flow below).
- **Point ordering caveat, documented prominently in `LandXmlParser`'s
  own javadoc**: a LandXML `<P>` element's text is "Northing Easting
  Elevation" per the schema's own documented default - **not** "X Y
  Z" - a real, known source of import bugs if a given file uses a
  different convention. No real Civil 3D sample file exists in this
  repo yet to verify against (confirmed by research); the import
  preview is expected to be visually sanity-checked against known
  survey coordinates on a real file before trusting it in production.
- **`backend/alignment` gains real geometry it never had**:
  `CurveElement` (circular arcs - standard closed-form geometry, safe
  without engineer sign-off per spec section 22, unlike spirals/
  clothoids which stay deferred exactly as `HorizontalElement`'s own
  javadoc already said) and `VerticalProfile`/`Pvi` (PVI-based,
  mirroring LandXML's own `<ProfAlign><PVI>` shape directly - linear
  grade interpolation plus the standard symmetric parabolic vertical-
  curve equation at any PVI declaring a curve length). `Alignment`
  itself was refactored from straight-only inline math to a sealed-
  switch dispatch over `HorizontalElement` (`elementLengthM`/`pointAt`/
  `rightUnitVectorAt`/`projectOntoElement`, exhaustive and compiler-
  enforced) - **behavior-preserving**: all 12 pre-existing straight-
  element tests still pass unchanged. A new additive overload,
  `Alignment.toXYZ(chainageM, offsetM, VerticalProfile)`, derives
  elevation from a real profile; the original `toXYZ(ChainagePosition)`
  (caller-supplied elevation) and every existing caller are untouched.
- **Two-step import flow** (`docs/roadmap.md` sections 24-26 - never
  auto-import when a file has multiple surfaces/alignments):
  `POST /api/landxml/inspect` (multipart, parses only, returns
  surface/alignment/profile names + units + CRS status/label +
  warnings - no persistence) and `POST /api/landxml/import` (multipart
  + the engineer's selection, commits into real `TerrainModel`/
  `Alignment`/`VerticalProfile`). Multipart from the start, not JSON
  with the file embedded in a string field - the exact ~20MB-file
  mistake from TERRAIN-P01, already fixed once, not repeated here.
- **A real cross-controller bug fixed as part of this wiring**:
  `TerrainController` previously did `new InMemoryTerrainRepository()`
  inline - fine when it was the only writer, but `LandXmlController`
  needed to write into the *same* repository so the existing
  `/api/terrain/{id}/mesh`/`elevation` endpoints could find a LandXML-
  imported terrain too. New `com.spanova.api.config.SharedRepositoriesConfig`
  (`@Configuration`, two `@Bean`s: `TerrainRepository`,
  `LandXmlImportRepository`) - the only two components in this app that
  needed Spring-managed singleton sharing; every other service stays a
  plain per-controller field, unchanged convention.
- **New `GET /api/alignment/{id}/sample`** (alongside the existing raw-
  coordinates `POST /api/alignment/sample`) samples a *real*, committed
  LandXML alignment (arcs included) instead of a manually-typed
  straight line. **New `GET /api/landxml/{id}/profile`** - ground
  (terrain-queried) vs. design (`VerticalProfile.elevationAt`)
  elevation along the alignment, the data behind the new frontend
  longitudinal profile chart.
- **New backend tests** (`backend/alignment` +18: `CurveElementTest`
  hand-verifies a quarter-circle's geometry including offset direction
  on both cw/ccw curves and `toChainage` round-tripping;
  `VerticalProfileTest` hand-verifies linear-grade and parabolic-
  vertical-curve elevations against the standard formula;
  `backend/landxml-import` +10: a hand-written, schema-compliant
  `sample.landxml` test fixture, since no real Civil 3D file exists in
  the repo - parser-level assertions on point/face/line/curve/PVI
  values, an end-to-end `LandXmlImportServiceTest` confirming the
  committed `TerrainModel` queries correctly, the committed
  `Alignment`'s curve geometry matches, and `VerticalProfile` elevations
  match hand-calculated values).
- **New frontend feature `features/landxml-import/`**
  (`LandXmlImportPanel.tsx` - upload, inspect-preview with surface/
  alignment dropdowns and CRS/units/warnings display, commit) wired
  into Site & Corridor's **"Alignment" leaf**, whose own disabled
  placeholder button already said "Import Alignment" - the obvious,
  already-declared home for this, not a new sidebar leaf. Reuses
  `features/terrain-viewer`'s `TerrainPreview` directly for the
  embedded 3D view (zero duplication - both this and
  `features/terrain-dtm` produce the same `TerrainModel` shape, just
  from a different source format).
- **`features/terrain-viewer` learns a second alignment source**:
  `TerrainViewerPanel` now accepts `landXmlImportId` alongside
  `terrainId` - when present, the real imported alignment (curves
  included) is sampled via the new endpoint and the manual start/end
  (x,y) input fields are hidden entirely; when absent (a plain XYZ-only
  terrain), the existing manual-straight-line behavior is completely
  unchanged. `App.tsx`/`router.tsx` lift `landXmlImportId` the same way
  as `terrainId` - importing a plain XYZ DTM explicitly clears it back
  to `null` (falls back to manual mode), matching whichever import path
  the engineer actually used most recently.
- **New `LongitudinalProfileChart.tsx`** (`recharts` `LineChart`,
  ground vs. design) - the first real use of the `recharts` dependency,
  installed since the architecture migration and flagged idle ever
  since ("available for when one genuinely does [need chartable
  data]") - this is that need.
- **Verified live end-to-end** (fresh tab): curled every new endpoint
  directly against the real test fixture first (inspect, import,
  cross-controller shared-repo elevation query, imported-alignment
  sample including the arc, longitudinal profile); then the identical
  flow through the actual UI - uploaded the fixture via the browser's
  File/DataTransfer APIs, confirmed the inspect preview listed "Existing
  Ground"/"Main Alignment"/"Design Profile" with the Spiral-skipped
  warning, committed the selection, confirmed "4 point(s), 2
  triangle(s) - alignment length 178.54 m, with a vertical profile"
  (matches hand-calculated `100 + 50*pi/2`), the embedded 3D preview and
  the longitudinal profile chart (correct parabolic-curve shape,
  correct chainage axis) both rendered, and the full "3D &
  Visualization" viewer showed the real curved alignment overlay with
  the manual-coordinate fields correctly hidden. No console errors
  throughout. `mvn -B package` clean (whole reactor, all alignment/
  landxml-import tests including the refactored `Alignment`'s original
  12 straight-element tests); `npm run build`/`lint`/`test` clean,
  16/16 frontend tests, no new warnings.
- **Explicitly deferred**, matching the approved plan: spiral/clothoid
  alignment elements (blocked on the engineer's own clothoid
  convention), real spatial indexing at corridor scale, multiple-
  alignment semantic classification, terrain/alignment versioning +
  dependency invalidation, and - still - the actual addendum-Q
  reactivation (`BridgeLayoutEngine` remains completely untouched).

## TRAFFIC-P01: Traffic Loads module, EN 1991-2 road bridges (`backend/`, `frontend/`, 2026-09-14)

The engineer sent a large architecture prompt for a "Traffic Loads"
screen to replace the Loads > Traffic placeholder tab, with explicit,
self-imposed scope limits stated up front: road bridges only
(pedestrian bridges excluded), LM1 active, LM2 visible in the menu but
non-functional, Load Groups its own section, and EN 1990 load
combinations explicitly out of scope for this module - a separate,
future Combination Engine that will merge traffic groups with permanent/
temperature/wind loads later, chosen deliberately for a cleaner future
MIDAS NX load export path. Researched (one Explore pass over
`bridge-core`'s domain model, existing traffic/EN1991/National-Annex/
load-combination code - none existed - `Alignment`'s curvature-query
capability, and `MaterialsPanel`'s provenance-UI precedent - none
existed either, so the CODE/NA/OVERRIDE badge UI here is new), planned,
approved, then implemented.

- **New backend module `backend/traffic-loads`** (Spring-free, flat
  `com.spanova.trafficloads` package - same convention as `terrain`/
  `landxml-import`): `ParameterProvenance` (`CODE_DEFAULT`/
  `NATIONAL_ANNEX`/`PROJECT_OVERRIDE`) and `ParameterValue<T>` (a
  generic record with a *nullable* `value` - represents "genuinely
  unconfirmed EN value," never a fabricated placeholder number, and
  Jackson correctly serializes/deserializes this generic shape nested
  inside concretely-typed containing records, confirmed via curl).
  `CarriagewayInput.carriagewayWidthM()` mirrors the frontend's own
  formula exactly (deck width - left walkway - right walkway).
  `NotionalLaneGenerator` implements only the single engineer-confirmed
  EN 1991-2 Table 4.1 data point (3.00 m/lane, floor division) -
  deliberately does **not** implement the narrow-carriageway special
  cases (<5.4 m, 5.4-6 m two-lane split), since those exact thresholds
  were never confirmed in this project's history; a runtime validation
  warning flags a narrow carriageway instead of guessing. `LaneFactor`
  (characteristic value x adjustment factor -> nullable effective value,
  propagating `null` naturally rather than defaulting to 0).
  `Lm1DefaultsFactory` seeds up to 3 lanes' worth of tandem/UDL rows,
  each starting `CODE_DEFAULT`/unconfirmed (characteristic) and
  `NATIONAL_ANNEX`/1.00 (adjustment factor - the P07-round-confirmed
  alphaQi=alphaqi=1.0, base EN, no National Annex adjustment).
- **`TrafficLoadGroupCatalog` - a deliberate self-correction while
  writing it**: the first draft wrote EN 1991-2 Table 4.4a-style group
  descriptions (gr1a/gr1b/gr2/etc.) from memory; caught before
  finalizing that this directly violated the engineer's own explicit
  instruction ("DO NOT invent group membership from memory" - spec
  section 22's discipline). Rewritten to return only the six bare group
  code identifiers (gr1a, gr1b, gr2, gr3, gr4, gr5 - the codes
  themselves were explicitly named as acceptable to list) with a single
  generic constant description ("Not yet defined - awaiting validated
  EN 1991-2 group rules") applied uniformly, empty `components`, and
  `status = "NOT_DEFINED"`.
- **One consolidated `POST /api/traffic-loads/resolve` endpoint**
  (plus `GET /lm1-defaults`, `GET /load-groups`), not one per sub-page -
  the frontend holds raw editable parameter state locally (matching
  `SelfWeightPermanent.tsx`'s established local-state pattern) and this
  single call returns computed notional lanes, resolved LM1 effective
  values, and validation - all "engineering computation" stays
  server-side, never in a React component (the engineer's own repeated
  instruction, principle #18 of the approved plan).
- **16 new backend tests** (`NotionalLaneGeneratorTest`,
  `LaneFactorTest`, `Lm1DefaultsFactoryTest`, `TrafficLoadsServiceTest`)
  - all pass; `mvn -B package` clean across the whole reactor.
- **New frontend `features/loads/components/traffic/`** - `TrafficLoadsPanel.tsx`
  is the orchestrator: owns `lm1` edit state (seeded once from
  `useLm1Defaults(3)` via an effect scoped to `[lm1Defaults]` only - the
  same "seed once, don't fight later edits" pattern already used in
  `TerrainViewerPanel.tsx`), computes `carriageway` from the
  already-lifted `crossSectionValues` prop (no duplicate geometry
  entry), and renders a *second-level* nested `TabDetailPanel` (Traffic
  itself is a tab inside Loads' own tab row, and now contains 10 more
  sub-tabs of its own) - `General`, `Carriageway & Notional Lanes`
  (a live cross-section preview SVG using the `HDim` helper from
  `PrecastCrossSection.tsx`'s own convention), `LM1`, `LM2` (a distinct,
  visibly-disabled component, not a placeholder - it reads differently
  from "not built yet," since it's deferred by design), `LM3/LM4/
  Braking/Centrifugal` (a new small reusable `TrafficPlaceholder.tsx`,
  the same honest-status convention as `app/components/PlaceholderPanel.tsx`
  scoped to a single sub-tab), `Load Groups`, and `Preview & Validation`
  (a read-only summary, deliberately with no "Generate ULS Combinations"
  action - non-negotiable per the engineer's own plan).
- **New reusable `shared/ui/ParameterProvenanceTable.tsx`** -
  Parameter/Value/Unit/Source/Effective/Restore columns, CODE/NA/OVERRIDE
  badges (new `.spn-badge-code`/`.spn-badge-na`/`.spn-badge-override`
  CSS classes extending the pre-existing but previously-unused
  `.spn-badge` base). A `null` characteristic value renders as a blank
  input with a "not confirmed" placeholder via a new
  `NullableDecimalCell` (deliberately not `DecimalInput`, which always
  formats to a real number and would show a misleading "0.00").
  Editing a value flips that row's provenance to `PROJECT_OVERRIDE`
  client-side; "Restore" resets it back to the code default and its
  original provenance. Generic enough to be reused by any future
  code-value-with-provenance screen, not Traffic-specific.
- **Verified live** (fresh tab, backend curl-verified first): all three
  endpoints matched expected values exactly (13.8/1.0/1.5 m cross
  section -> 3 lanes @ 3.00 m + 2.30 m remaining area). Through the UI:
  all 10 Traffic sub-tabs render; Carriageway & Notional Lanes reflects
  the live 11.30 m carriageway (13.80 - 1.00 - 1.50) and the same
  3-lane breakdown with no duplicate geometry entry; editing LM1's Q1k
  to 300 flipped its badge Code -> Override, the adjustment-factor row's
  Effective column updated live to 300.00 (300 x 1.00, backend-computed,
  confirmed via the real DOM `value`, since `get_page_text` doesn't
  surface `<input>` values as text), and Restore reverted both the value
  and the badge back to Code/unconfirmed; Load Groups listed all six
  codes as `NOT_DEFINED` with no invented membership; Preview &
  Validation showed the correct summary and the expected "LM1 not
  resolved" warning, with no combination/export action present. No
  console errors at any step. `npm run build`/`lint`/`test` clean, 16/16
  frontend tests (two new oxlint warnings introduced during development
  - a `set-state-in-effect` and a variable-reassignment-during-render
  warning - were both fixed before finalizing, matching this project's
  existing zero-new-warnings bar).
- **Explicitly deferred**, matching the approved plan: EN 1990 load
  combinations (separate future module, never touched here), real LM2/
  LM3/LM4/Braking/Centrifugal calculations, Load Group membership
  population, National Annex tables beyond the single "EN Base" option,
  project-vs-bridge parameter inheritance (no multi-bridge backend model
  exists yet - `Project` still owns exactly one `Bridge`), and
  alignment-aware centrifugal radius (`Alignment` has `CurveElement.radiusM()`
  but no public query method yet, and no Bridge-to-alignment-chainage
  link exists either - both are additive, not built now).

## Open questions carried into P07+

- Whether `midas-adapter` ends up embedded in the `api` process or
  deployed as its own "separate Windows worker" (per the engineer's own
  architecture table) - MIDAS-P01 ran it embedded in a throwaway `main()`,
  not yet decided for the real `api` Spring Boot process.
- `ModelMapping`, `AnalysisJobManager`/queueing/concurrency policy,
  result caching/fingerprinting, and engineering QA post-MIDAS are all
  designed in `docs/MIDAS_INTEGRATION_ANALYSIS.md` but not built - next
  MIDAS milestones, not yet scheduled against the P00-P12 numbering.

## Workspace shell, Phase 1 (`frontend/src/app/`, 2026-09-17)

- Added a permanent top workspace navigation for Project, Bridge
  Definition, Family Tables, Graph, Loads, Analysis, Optimization,
  Results, and BIM / Export. Workspace selection is URL-backed at
  `/<workspace-id>` (for example `/project`); the Phase 1
  `/workspace/<workspace-id>` path remains a compatibility alias.
- `app/workspaces/registry.ts` is the shared workspace configuration for
  labels, icons, left navigation, center titles, and inspector headings.
  `TopWorkspaceNav.tsx` and `WorkspacePage.tsx` consume that registry;
  `WorkspaceLayout.tsx` supplies independently scrollable, collapsible
  left and right panels around a flexible center.
- Bridge Definition currently lists only Span Arrangement and
  Superstructure. Family Tables mounts existing Assembly, Superstructure,
  Girder, Preferred Span, Pier, Pier Cap, Foundation, Bearing, and
  Materials components. Its Pile entry opens the Foundation editor with
  PILED selected; it does not define a separate pile catalog. Abutment
  and Standardization Rules have no corresponding current editor and
  remain Phase 1 placeholders. Loads mounts the existing Loads panel.
  Existing one-segment feature routes continue to render their original
  feature screen in the new shell's center panel. The old sidebar and
  section toolbar source files remain temporarily for migration/reference
  but are no longer mounted.
- Existing cross-feature React state and the shared QueryClient remain
  above workspace routing in `App.tsx`/`AppProviders.tsx`. No React Flow,
  graph engine, new analysis behavior, or optimization behavior was
  introduced. The existing terrain 3D viewer remains on its current
  legacy route and was not duplicated or migrated.
- Next: Phase 2 may define the engineer-approved graph/node model and
  interaction scope, then mount it in the Graph workspace; this Phase 1
  shell does not pre-implement that editor.

## Unified application shell, Phase 2A (`frontend/src/app/`, 2026-09-17)

- `/` and `/home` now redirect to `/project`; the SPANOVA wordmark also
  navigates to `/project`. The legacy Home screen is no longer a separate
  application entry point.
- Every path renders the permanent TopWorkspaceNav. Workspace routes use
  the same three-panel WorkspaceLayout. Existing one-segment feature
  routes render through the retained `AppRoutes` router inside the center
  panel, so they no longer mount the old full-height Sidebar/TopBar shell.
- Cross-feature state remains owned by `App.tsx`; BrowserRouter links,
  browser back/forward, and refresh retain the active workspace URL.
- Legacy-to-workspace migration map (components remain in place):
  - Project: Project Dashboard, Project Information, Cost Database.
  - Bridge Definition: Alignment, Terrain/DTM, GIS & Satellite,
    Geotechnical, Hydrology & Hydraulic, Constraints, bridge inventory/
    layout routes, and 3D Visualization.
  - Family Tables: System Assembly, Superstructure, Girder, Preferred
    Span, Pier, Pier Cap, Abutment, Foundation, Bearing, Materials, and
    Standardization Rules. Pile remains a Foundation type/shortcut.
  - Loads: Loads and Load Combinations.
  - Analysis: Model Reduction, Fast Solver, Analysis Queue, and solver
    verification routes.
  - Optimization: layout/structural/bridge/corridor optimization and
    Pareto routes.
  - Results: results and alternatives. BIM / Export: Reports and export
    destinations.
  - Settings and Help remain in Project for now.
- This is routing and shell unification only. Legacy feature source,
  HomePanel source, Sidebar, and TopBar have not been deleted; Graph,
  React Flow, and feature migration work remain deferred.

## Project workspace, Phase 2B (`frontend/src/features/project/`, 2026-09-17)

- The Project workspace provides Overview, hierarchical Project Information /
  Design Settings / Site & Environment / Data navigation, and a Project
  Properties inspector inside the shared top navigation.
- `ProjectWorkspaceData` is the canonical frontend project metadata/settings
  shape. It stores identity, stakeholder/date/description, location, design
  code selections, units, coordinate system fields and extensible criteria.
  Existing `BridgeRow[]` remains the bridge inventory model. Both are held in
  app-owned state and persisted together in `spanova.project-workspace.v1`;
  no second project persistence mechanism was added.
- Edit Project uses an inspector draft. Save updates shared app state and
  persistence; Cancel discards the draft. Workspace navigation preserves
  state and reload restores it from localStorage.
- Overview derives bridge count, total listed bridge length and bridge types
  from existing `BridgeRow[]`. Alternatives remain `â€”` because no active
  alternatives source exists. Empty metadata and unavailable last-modified
  data are not fabricated. The new workspace does not seed a real project name.
- Existing Bridge Information and Cost Database components are reused.
  Bridge Information remains reachable under Project Information; Cost
  Database import behavior is unchanged and remains component-session state.
  Files & Documents is a UI shell only.
- Terrain/GIS, geotechnical, hydrology, seismic and climate entries are
  integration placeholders. No GIS engine, calculations, document store or
  Bridge Definition migration was introduced.
- Legacy `/project-dashboard` redirects to `/project`, avoiding its former
  local sample identity values. Its source is retained. Legacy
  `/project-information` and `/cost-database` URLs redirect to their
  canonical Project workspace sections. The bridge inventory source remains
  mounted at Project Information > Bridge Information.
- Unit preferences use SI display defaults (`m`, `kN`, `kNÂ·m`, `MPa`, `t`,
  `Â°C`) without implementing conversions. Eurocode carries forward the
  existing app-level design-standard selection.

## Bridge Definition workspace, Phase 2C (2026-09-17)

- Added the canonical Bridge Definition workspace with the requested hierarchical Alignment, Span Arrangement, Superstructure, Supports, Foundations, Bearings, Construction, Constraints and Assembly navigation. A selector reuses the existing project bridge inventory; selection and each bridge definition are persisted in `spanova.bridge-definitions.v1`.
- Bridge-instance spans are explicitly entered as individual lengths. Existing `BridgeRow.spansM` values remain inventory alternatives and are shown as such; they are not silently copied into a selected layout. Support axes and chainages are derived from the explicit sequence. Family relationships are stored as existing catalog IDs, including girder variant/family IDs and pier, pier cap, foundation and bearing IDs. Bridge-specific heights, elevations, bearing arrangement, deck override, constraints, method and descriptive stage note stay on the bridge definition.
- Project terrain dataset and LandXML import references were added to the existing Project workspace record, so multiple bridges can share source data. Existing LandXML import, terrain DTM, terrain viewer and profile chart components are mounted in the new workspace. Plan/Profile drawings are schematic views of the same entered span/axis data; the 3D viewer currently displays the existing terrain/alignment content and does not generate a bridge model.
- Migration map: `/alignment`, `/terrain-dtm`, `/3d-visualization`, `/constraints`, `/bridge-site`, and existing bridge component URLs now enter Bridge Definition. `/bridge-inventory` enters Project > Bridge Information. GIS/Satellite, Geotechnical and Hydrology remain Project-level integrations. Layout Generator, Layout Alternatives, Selected Layout and Bridge Alternatives remain generation workflows (Graph workspace/legacy feature routes), and were not moved into Bridge Definition.
- Code inspection found the Layout Generator creates candidate alternatives, while Project Information span values are alternatives, not an instance sequence. Preferred Span uses girder variant IDs. System Assembly is a reusable family-composition/template screen, not an instance assembly or engineering validator, so its template logic remains in Family Tables. The existing constraint screen did not expose a reusable bridge-instance constraint model; Bridge Definition therefore stores bridge-local named chainage references only and does not claim clearance/feasibility checks.
- The current source has no stable Abutment Family catalog IDs or bridge model geometry generator. A1/A2 family references are reserved in instance state, but cannot be selected until the catalog supplies stable IDs. No Graph, Analysis, Optimization, geometry duplication, or legacy module deletion was included; Phase 2D remains deferred.

## Family Tables consolidation, Phase 2D (2026-09-17)

### Existing family audit / migration map

| Category | Existing model and editor | Preview / persistence / identity | Phase 2D destination |
|---|---|---|---|
| Superstructure | `SuperstructureFamiliesPanel` with existing Precast cross-section inputs; PSC and Steel/Composite are placeholders | Existing diagram; values stay in app-owned cross-section state; no stable superstructure family ID | Reused under Family Tables. No new family record or ID invented. |
| Girder | `GirderLibraryPanel`; Precast parameter sweep and generated variants; Steel/Box remain placeholders | Existing girder shape; dimensions/enabled persisted at `spanova.girder-library.precast`; canonical `PG-200`, generated variant IDs `PG-Hâ€¦` | Reused; registry adapter maps existing definition to `PG-200`, without another store. |
| Pier | Most complete existing family workflow, used as interaction reference | Existing section generator, shape preview, height applicability and persisted stable IDs at `spanova.project-design-system.pier-families` | Reused unchanged in its engineering calculations; catalog selection also updates Family Inspector. |
| Pier Cap | Existing Pier Cap rule model, variant generator, schematic and catalog | Persisted stable IDs at `spanova.project-design-system.pier-cap-families` | Reused; Bridge Definition usage is indexed for delete protection. |
| Abutment | No reusable Abutment family model/editor/catalog found; prior route is a placeholder | No stable family IDs or reusable geometry/persistence to migrate | Shown disabled with an explicit unavailable state; no fake family created. |
| Foundation | Existing shallow/piled family model, generator, validation and plan/elevation schematic | Persisted stable IDs at `spanova.project-design-system.foundation-families`; current service derives piled Lx/Ly using X/Y spacing independently | Reused in one Foundation editor; clicking a catalog row loads it for editing. |
| Bearing | Existing Elastomeric family/rule model, generator, validation and schematic | Persisted stable IDs at `spanova.project-design-system.bearing-families` | Reused; Bridge Definition usage is indexed for delete protection. |
| Material | Existing concrete class by structural element table, using EN 1992-1-1 class names | Previously transient; assignments now persist under `spanova.project-design-system.material-assignments` with stable element keys. This is still a class assignment table, not a full material property model. | Reused under Family Tables; class-code adapters identify the shown material entries. No mechanical properties invented. |

- Added a Family Tables workspace with the supported categories above, central existing editors/tables/previews and a context Inspector. Foundation replaces the separate Pile shortcut with its existing Shallow/Piled type selector. Existing `SystemAssemblyPanel` is a family-composition template, Preferred Span is a girder rule, and Standardization Rules are not reusable component families; their source/legacy routes remain, but they are not shown as family categories.
- The new `family-registry` module is a read-through adapter over feature-owned stores, not a second database. It supplies stable-ID lookup and bridge-usage references. Pier, Pier Cap, Foundation and Bearing deletion is blocked while an ID is referenced by a bridge definition; the error lists bridge and axis. Girder, Superstructure and Material have no family deletion operation in their existing editors.
- Selecting a catalog family updates a shared category/ID selection event consumed by the right Inspector. Existing feature-owned generators and previews remain the source of geometry. Family data are not copied into Bridge Definition; family IDs remain in bridge assignment state.
- Old Design System sidebar entries and the separate Materials entry were removed after mounting the existing screens in Family Tables. Legacy family URLs and source components are retained for compatibility. No import/export format existed to migrate; disabled Import/Export affordances are shown, without adding a new package format.
- Superstructure currently has no family identity or its own catalog, only app-level cross-section input. Abutment has no family model. Material has class selections but no material property registry. These remain explicit gaps before Graph work; this phase did not implement Graph, Analysis, Optimization, or engineering design checks.

## Architecture realignment and Family Repository, Phase 2E (2026-09-17)

- Removed Bridge Definition from primary top navigation while retaining `/bridge-definition` as an internal compatibility/development route. Existing bridge definitions and UI modules remain intact. See `docs/spanova-data-architecture.md` for the ownership boundary and reuse inventory.
- Added `family-registry/model/familyRepository.ts` as the shared access boundary over existing catalog keys, plus `useFamilyCatalog` for the supported editable family catalogs. Pier, Pier Cap, Foundation and Bearing editors now publish edits through the shared repository subscription. Existing keys, payload formats and IDs are preserved.
- Bridge Definition and System Assembly resolve those family records through the repository. Girder Library's existing singleton payload is read/written through a repository adapter without changing its storage shape. Family selection/Inspector records remain projections, not another catalog.
- Added a Graph family reference/parameter-schema adapter. References contain category and stable `familyId`; resolution reads the current persisted family data. Added the `GeneratedBridgeModel` output boundary only; no Graph nodes, generation, FEM or optimization were implemented.
- Piled foundation Lx/Ly remain calculated only by `derivePiledFoundationDimensions`; UI previews and variants consume the same domain calculation. Ly uses pile spacing Y.
- Remaining pre-Graph gaps: Girder and Superstructure lack the same stable family domain model; Abutment has no family catalog; Material remains a concrete-class assignment table rather than a material-property catalog. These were not converted into synthetic engineering families. Alignment import/terrain references remain in Project environment state; bridge-local spans, axes, assignments and constraints remain in the retained legacy Bridge Definition store pending a deliberate migration.

## Visual Graph Foundation, Phase 3A (2026-09-17)

- The Graph workspace uses the existing `WorkspaceLayout`; its left panel is the registry-driven Node Library, the center is the XYFlow canvas, and the right panel is the node Inspector. The canvas adapter translates between XYFlow view nodes/edges and the independent, serializable SPANOVA graph domain.
- The graph registry currently exposes only Number, Integer, Boolean, Range, Add, Subtract, Multiply, Divide and Watch. Registry schemas define ports, parameters, defaults, validation and execution. Engineering, family, bridge, loads and analysis nodes are reserved types only and are not exposed or executable in this phase.
- The graph engine validates node types, parameter keys and values, port compatibility, single-input connections, required inputs and cycles before topological execution. It reports per-node results and errors to Watch, node states and Graph Log.
- `GraphStore` persists multiple graph documents at `spanova.graph.documents.v1`, with per-document edit history and JSON round-trip. React Flow remains a replaceable UI adapter and does not own authoritative graph data.
- Phase boundary: no Family Repository, Loads, Bridge Definition, generated bridge model or Analysis integration was added. The next integration point is Phase 3B family data nodes.

## Graph Connection Stability and Authoring Architecture Lock, Phase 3A.1 (2026-09-17)

- Live browser reproduction identified a React Flow `StoreUpdater` update-depth loop. `onSelectionChange` unconditionally created new selected-ID arrays; those arrays rebuilt the controlled node objects, React Flow synchronized them back into its store, and repeated selection updates re-entered the cycle. The development console reported `Maximum update depth exceeded` from `StoreUpdater` / `setNodes`.
- The Graph Store is now the sole persistent topology source. Node and edge props are memoized projections; selection updates are ignored when IDs did not change. Only in-progress node drag positions live temporarily in UI state and commit once at drag end. Interactive connection checks are pure Level 1 port/existence/type/multiplicity checks; cycles and readiness are checked by full validation on Run. A valid connection causes one store update and one undo entry; duplicate/invalid connections are ignored.
- Watch uses the explicit `display:any` sink type for supported display values (number, integer, boolean, string, and numeric arrays). Engineering port types remain domain-specific and cannot connect to this display sink.
- **Architecture lock:** Graph is SPANOVA's future primary engineering definition and authoring environment. Engineering values and candidate families will be node-driven; Family Tables remains transitional UI and stays in primary navigation for now. Reuse validated domain calculations from existing features as one implementation, called by nodes, rather than copying calculations into UI or graph code. Graph execution remains headless and independent from React/XYFlow. Generated bridge models are outputs of Graph generation, not manually authored Bridge Definition state.
- Future node classes are Data, Engineering, and Logic/Generator. Future ports are typed domain values and candidate lists (materials, girders, piers, caps, piles, foundations, bearings, alignments, terrain, bridges, analysis, design and optimization results); these are documented direction only and are not implemented in Phase 3A.1. Scalar/list propagation and candidate pairing semantics must be specified before engineering-node implementation. Project environmental data remains Project-owned; Loads workspace remains unchanged in this phase.
- Phase 3B replaces the former read-only Family Repository node proposal: begin the engineering node library for Material, Pier and Foundation, with exact domain contracts and reuse boundaries defined before implementation. No engineering nodes were added in this stability phase.

## Engineering quantities and material references, Phase 3B.1 (2026-09-17)

- Graph value type, physical `QuantityKind`, and display `UnitId` are separate. `EngineeringQuantity` stores a canonical numeric value plus its quantity kind and selected display unit. Canonical units are `-`, m, m², m³, rad, kN, kN·m, MPa, t, t/m³, kN/m³, °C, °C difference, m/s², kN/m and kN·m/rad. Conversions live in `graph/domain/quantities.ts` and are applied at node input/output boundaries.
- Quantity and Range carry kind/unit parameters in the existing JSON node parameter record. Existing Range documents without those new keys remain dimensionless. New node defaults read the existing Project units; no unit preferences are duplicated in Graph document state.
- Math ports accept number/quantity values. Add/Subtract require two quantities of the same kind; Multiply permits a quantity and dimensionless number; Divide permits quantity divided by dimensionless number. Derived dimensions and multiplication of two quantities are deliberately unsupported.
- Watch and Inspector display quantities and explicit material value objects. The material node contracts are ConcreteMaterial, ReinforcementMaterial, PrestressingSteelMaterial and StructuralSteelMaterial. Only the existing concrete class IDs are configured; steel nodes stay unavailable until project-owned grade/property data exists.
- The existing Materials UI class IDs are shared from `materials/model/materialCatalog.ts`. Graph does not create a second material catalog. Family Tables and their persisted data remain unchanged.
- Concrete graph execution resolves through `/api/materials/concrete?materialId=...`, which invokes the existing `EurocodeConcrete` utility. The endpoint exposes only properties supported there: fck, fcm, Ecm, reinforced-concrete unit weight, derived mass density and uncracked Poisson ratio. Unsupported fctm and thermal data are omitted. Graph Engine remains headless; a resolver service is injected by the workspace and can be replaced in tests.
- No Pier, Foundation, Girder, Bearing, Bridge Generator, Analysis or Optimization nodes are implemented in this phase.

## Graph connection display styles, Phase 3A.2 (2026-09-17)

- The Graph canvas exposes Smooth and Orthogonal connection rendering. With installed `@xyflow/react` 12.11.3, Smooth maps to its built-in `default` Bezier edge and Orthogonal maps to built-in `step` routing.
- The preference is stored separately from graph documents at `spanova.graph.view-preferences.v1`, defaults to Smooth, and is restored when the Graph workspace opens. It is not part of `SpanovaConnection` or graph undo history.
- Switching style only remaps the memoized React Flow edge projection. It does not write GraphStore, alter IDs/topology/node positions, validate or execute the graph, or serialize connections.

## Pier engineering nodes, Phase 3B.2 (2026-09-18)

- Pier Families are authored in Graph through Circular, Rectangular, Oval, Box and H Pier design-space nodes. Family Tables remain transitional and unchanged; Graph candidates are execution outputs and are not serialized as inputs.
- `PierCandidate` is a UI-independent output with deterministic ID, pier type, canonical metre geometry keyed by `D`, `B/D`, `B/D`, `B/D/tw`, or `B/D/tw/tf`, column count, canonical metre height and the structured `ConcreteMaterial` reference. Graph parameters and XYFlow state are not stored in the candidate.
- Legacy `generatePierVariants` establishes the dimension Cartesian sweep semantics. The clarified Graph geometry rules are authoritative: Oval uses overall `B/D`; Box uses uniform `tw`; H uses symmetric `B/D/tw/tf`. Legacy defaults/applicability rules are not copied.
- Scalar inputs normalize to one value; list inputs preserve their source order. Inputs are canonical metres before candidate construction. Cartesian order follows stable geometry parameter order (`D`, `B/D`, `B/D`, `B/D/tw`, `B/D/tw/tf` respectively), with Height varying fastest; later geometry parameters vary faster than earlier ones.
- Candidate generation is headless and occurs only during Run. A connected value replaces its local default. Geometry combinations are filtered using Box (`2tw < B` and `2tw < D`) and H (`tw < B` and `2tf < D`) consistency checks; generated combination, invalid geometry, and valid candidate counts are available on the node/Inspector. Other checks are positivity, finite Length values, valid ConcreteMaterial and one or two columns. No structural design checks are included.
- `MAX_NODE_CANDIDATES` is 10,000 combinations, checked before expansion. Exceeding it fails that node with a message to reduce input ranges. Candidate IDs are deterministic from normalized input values; identical physical lengths in different display units therefore produce the same geometry and identity.
- Watch previews at most five candidate summaries plus the total count. Inspector previews at most ten, reports generation counts and validation state, and includes schematic section glyphs. No Pier Cap, Foundation, Bearing or Bridge Generator node was added.

## Engineering Graph input and node layout, Phase 3B.2B (2026-09-18)

- `resolveEngineeringInput` is a headless execution-boundary conversion. A raw `number` or dimensionless numeric list entering a quantity-typed port is interpreted using that target's `quantityKind` and current project display unit, then converted to the canonical unit by `makeQuantity`. Explicit `EngineeringQuantity` values retain their own unit and canonical value. Wrong-kind explicit quantities remain errors.
- `Number` remains a dimensionless `number`; `Integer` remains `integer`. Target-aware coercion is allowed only for Number/numeric-list sources. Integer is not coerced to Length or Columns; Number is not accepted by integer Columns. Typed Stress/Force quantities do not connect to Length ports. Connection validation checks compatibility only and performs no value conversion or node execution.
- Graph Run captures resolved inputs for transient canvas display. Project units come from the Project workspace; defaults are used only if no preference is set. Coercion supports any target `QuantityKind`, including future Force, Moment, Stress, Temperature and Stiffness ports.
- Structural nodes use the shared `EngineeringNodeShell`, with independent input rows and a separate output section, handles on opposite sides, 340 px starting width, truncated labels with full-title tooltips, and no raw port type strings on the canvas. Port hover titles retain target type, accepted source forms and default unit. Local numeric defaults are inline editable; connected inputs replace the editor with source/resolved-value information. Pier statistics remain execution metadata for the footer and Inspector; Candidates is the sole Pier graph output.
- The React Flow adapter only projects graph topology, last-run resolved values, and current project unit preferences. GraphStore remains authoritative. Interactive validation and smooth/orthogonal edge rendering behavior remain unchanged.

## Graph authoring and Pier-to-Watch reliability, Phase 3B.2C (2026-09-18)

- Integer remains an integer/dimensionless output and can feed continuous engineering quantity targets through the target-aware Run resolver. It uses the target quantity kind and project display unit; discrete Columns remains an integer port and Number is not accepted there.
- Primitive number and integer editors use a text buffer during entry, commit on Enter/blur, preserve empty or malformed commits as invalid values for validation, reject fractional integer input, and stop key propagation to canvas shortcuts.
- Ctrl+C copies selected nodes and internal edges. Ctrl+V creates fresh node/edge IDs with an offset; Ctrl+D duplicates with fresh IDs. GraphStore applies each paste as one history operation and selects the pasted nodes.
- The adapter projects Watch `value` and Pier `candidates` explicitly before falling back to other outputs. The Pier-to-Watch path is exercised end to end; Watch formatting covers primitives, quantities, ranges, concrete references and candidate summaries.
- React Flow edge elevation on selection is disabled; canvas nodes and edges have explicit stacking order, and node shells have opaque backgrounds. Edge paths are unchanged.
- Connected engineering input rows omit source node names on canvas. Source identity and resolved values remain available in the Inspector. Columns is documented as one or two physical columns at one support axis.
- No Pier Cap or other structural families are included in this phase.

## Graph interaction stabilization, Phase 3B.2D (2026-09-18)

- Existing XYFlow edge endpoints enter a temporary reconnection interaction. GraphStore changes only on release: valid replacements preserve the connection ID and commit as one undoable update; returning to the same source or releasing on empty canvas removes the connection in one undoable update; Escape calls XYFlow's cancellation action and preserves the edge. Invalid drops on another handle preserve the original edge.
- Reconnect validation projects a temporary graph without the edge being edited. This permits replacing an occupied target input while retaining pure compatibility checks and avoiding GraphStore changes during pointer movement.
- React Flow selection arrays are compared by membership before state updates. Selection/runtime state remains outside GraphStore and clipboard data. Clipboard stores only cloned SpanovaNode/SpanovaConnection authoring data and clones with fresh IDs.
- The adapter cheaply previews deterministic primitive, range, quantity and configured concrete input outputs, resolving them at the target port with project units. Run results override preview values; failed resolution/execution displays an error state. Pier generation is not run during rendering.
- Added generic read-only List output node; it accepts the generic display input, renders primitive/quantity/domain rows, formats PierCandidates with project units, and expands candidate fields. It renders 50 rows per page inside a fixed-height scroll region.
- Exact mixed-input Pier generation and Range-to-Pier-to-List execution order are covered by engine tests. No additional engineering family was added.

## Browser interaction hotfix, Phase 3B.2D.1 (2026-09-18)

- Normal connection creation replaces any prior incoming edge on the same scalar target port. Validation runs against the candidate graph after removing those prior edges; GraphStore commits the replacement as one undoable graph change.
- Ctrl-drag from an occupied input handle enters an input-origin reconnect. Dropping on empty canvas or the original source disconnects the incoming edge; dropping on another compatible output atomically replaces its source. Escape cancels and retains the original edge.
- Selection callbacks compare ID sets and update synchronous refs before scheduling React state, preventing re-entrant React Flow selection notifications from queuing stale selection updates. Pasted nodes are inserted as one GraphStore batch and are not force-selected, avoiding a controlled-node selection feedback loop.
- Development-only graphDiagnostics counters cover paste transactions, node and edge batch insertion/projection, selection callbacks/effects, history commits and viewport movement. With graphDiagnostics enabled, browser paste x10 and duplicate x10 produced finite counters and no console exceptions.
- After a successful Run, an authoring graph signature marks results DIRTY when engineering values/topology change. Dirty results are visibly labeled, and stale resolved input previews are cleared.
- Headless Chrome against the local Vite and Spring Boot development servers verified occupied-input replacement; Ctrl-drag to empty, original source and another source; Escape cancellation; paste x10; duplicate x10; mixed local/connected Pier inputs producing one candidate; canvas List output; and Range-to-Pier-to-List output producing three candidates.
- No Pier Cap or additional engineering family was started.

## Material selector and output availability, Phase 3B.2D.2 (2026-09-18)

- The Concrete canvas selector reuses `materials/model/materialCatalog.ts` and the typed `MaterialValue` / `ConcreteMaterial` graph contract. It stores the chosen grade in the existing `materialId` graph parameter, defaults new Concrete nodes to C40/50, and preserves the `concreteMaterial` output port.
- The selector is directly editable on the node and uses React Flow `nodrag` / `nowheel` behavior with stopped pointer/click propagation. Grade changes use the existing GraphStore parameter/history path, update source previews immediately and invalidate the last execution signature without rerunning.
- Concrete Inspector details resolve through the existing `/api/materials/concrete` endpoint and `EurocodeConcrete` implementation. The UI displays the authoritative API properties fck, fcm, Ecm, unit weight, mass density and uncracked Poisson ratio. The endpoint does not expose fck,cube, tensile strength or thermal alpha as typed properties; this phase adds no fabricated values.
- Number, Integer, Range and Concrete outputs can be previewed directly in Watch/List from authoring data. Pier candidates remain execution-dependent: before Run, Watch and List say Run required. After Run, Watch condenses a candidate collection to its count, while List renders each candidate and its material/column summary inside the canvas node.
- After authoring changes, direct source previews remain current; stale execution-dependent Watch/List results are suppressed and marked Results outdated - Run required until another Run.
- Headless Chrome verified default C40/50 and all 14 selector values; mouse/keyboard selector operation without node movement, selection change or viewport zoom; immediate Concrete-to-Pier and Concrete-to-Watch updates; Number 8 Watch preview; pre-run Run-required states; one- and three-candidate Pier-to-Watch/List results; dirty result invalidation; localStorage reload; copy/paste grade preservation; and Ctrl+Z/Ctrl+Y grade history.
- No new material definitions, Pier Cap or structural families were added.

## Canvas select hotfix, Phase 3B.2D.3 (2026-09-18)

- The Concrete node now uses the reusable generic `CanvasSelect<T>` control. It receives items, value, key/label accessors, change handler, disabled state and placeholder; Concrete supplies the existing `EN_CONCRETE_CLASS_IDS` catalog.
- The former native `<select>` had complete option data, so an empty catalog or missing adapter was not the failure. Its browser/OS-managed popup is outside the rendered node DOM and cannot be layered, scrolled or keyboard-routed consistently with React Flow. The replacement is a controlled DOM listbox portaled to `document.body`, positioned from the trigger rectangle and outside the React Flow viewport clipping/transform stack.
- The control explicitly stops pointer, click and wheel propagation at the trigger and portaled menu. The portal places menu gestures outside the canvas subtree; `nodrag`/`nowheel` markers remain on trigger/menu, graph wheel zoom is disabled, and menu scrolling is contained. Escape and outside pointer-down close without changing the value; keyboard arrows/Enter navigate and commit.
- Committed grade changes still call the existing `onParameterChange` → GraphStore path, so preview values, downstream Pier input preview, dirty state, undo/redo, copy/paste and localStorage persistence use the existing graph authoring model. Opening and dismissing the menu do not write graph state. Normal canvas output rows no longer render developer port type labels.
- Automated verification: all frontend tests pass (134 tests across 28 files); TypeScript and production Vite build pass. No new catalog or engineering values were introduced.
- A new dev server returned HTTP 200 for `/graph`; a temporary headless Chrome page opened. The Graph route rendered in headless Chrome and the Concrete library item was located and clicked; however, the follow-up browser DOM query did not return a usable result. The Phase 3B.2D.3 browser interaction matrix and screenshot are therefore not verified; earlier phase tests of the native select do not validate this custom control.
- No Pier Cap or other engineering family was started.

## Node category visual system, Phase 3B.2E (2026-09-18)

- `NodeCategory` remains metadata on `NodeDefinition` and is now a shared closed union containing INPUT, MATH, MATERIALS, GEOMETRY, SUPERSTRUCTURE, SUBSTRUCTURE, LOADS, ANALYSIS, DESIGN, OPTIMIZATION and OUTPUT. Existing graph node records are unchanged; no saved graph migration or per-node color serialization is needed.
- `domain/nodeVisualThemes.ts` owns `NODE_THEME_REGISTRY` and a separate `DATA_TYPE_THEME_REGISTRY`. BaseNode, EngineeringNodeShell, ListOutputNode and NodeLibrary resolve theme classes from definition category. Central CSS custom properties define low-saturation accent, border, header and text variants for each category.
- Current mapping remains registry-driven: Number, Integer, Boolean, Quantity and Range → INPUT; Add/Subtract/Multiply/Divide → MATH; Concrete → MATERIALS; all five current Pier types → SUBSTRUCTURE; Watch and List → OUTPUT. Geometry, Superstructure, Loads, Analysis, Design and Optimization are theme-ready categories only; no nodes or execution behavior were added.
- Selected borders use the same category accent. Category border/header identity remains present during SUCCESS, DIRTY, ERROR and RUNNING; status text has a separate semantic color. Bodies remain neutral dark.

## Generative numeric pipeline, Phase 3B.2F (2026-09-18)

- Range retains its persisted `min`/`max`/`step` parameter keys for saved graph compatibility, and renders them as directly editable Start/End/Step fields. Optional scalar `start`/`end`/`increment` input ports override their local fields; connected controls are disabled and show the resolved scalar.
- One shared deterministic Range generator is used for execution and live authoring previews. It supports positive ascending and negative descending steps, includes a reached endpoint within floating-point tolerance, rejects zero/wrong-direction/nonfinite values, and caps output at 10,000 items.
- Math Add/Subtract/Multiply/Divide accept scalar or list design values. A scalar broadcasts across a list, one-item lists broadcast, and equal-sized lists operate element-wise; incompatible list lengths and divide-by-zero fail with explicit errors. Math results keep the scalar/list runtime shape; downstream engineering inputs use the same target-aware quantity resolver for both shapes.
- Range and Math are previewed recursively through numeric inputs to Watch/List and Range input fields without Graph Run. Pier remains a generic consumer of scalar or list Length inputs; its established Cartesian generator and ordering remain unchanged. Local Pier dimensions continue to enter that same generator as singleton scalars.
- Connected list previews remain compact in structural canvas rows. The Inspector uses source topology plus current previews/last resolved values and offers complete list values with type, quantity kind, unit, count, min and max metadata.
- Ctrl+middle drag zooms continuously around the pointer, upward to zoom in and downward to zoom out, bounded by the existing 0.5–2.0 zoom limits. Middle drag without Ctrl and wheel panning retain React Flow behavior; viewport interaction is not stored in GraphStore history.
- Automated coverage exercises Range generation and invalid values, Math broadcast/list errors, target-aware list coercion, Pier Cartesian counts/identity, serialization/history, UI editors, previews and Inspector details. All 20 requested rendered-browser scenarios passed, including real handle connection, Range/Math/Pier Run chains, viewport gestures, shortcuts, persistence, history and repeated paste.
- Full frontend suite: 153 tests passed across 29 files. TypeScript and production Vite build passed; Vite retains its existing large JavaScript chunk advisory (>500 kB). No Pier Cap or additional node family was started.
- React Flow edge geometry and Smooth/Orthogonal selection are unchanged. Edge stroke is resolved only from the source port's `GraphPortType` using `DATA_TYPE_THEME_REGISTRY`, not node category. The node library uses the same category theme for its group heading and hover accent.
- Headless Chrome rendered all six requested current nodes. DOM theme classes and computed colors showed Number/Range sharing INPUT blue (#5798ed), Concrete MATERIALS teal (#39b7a8), Rectangular Pier SUBSTRUCTURE purple (#a68ae3), and Watch/List OUTPUT lavender (#a690df). The rendered Concrete listbox contained 14 grades and Escape closed it. Reloading the saved browser graph restored all six nodes and their registry-derived category classes without migration. The phase's browser coverage is limited to rendered category identity, Concrete dropdown open/close and graph reload; selection/status/copy stress/edge interactions are covered by focused automated tests and existing phase checks, not all repeated in this browser session.
- Frontend suite: 138 tests passed across 29 files. TypeScript and production Vite build passed; Vite reported its existing >500 kB bundle-size advisory. No Pier Cap or engineering functionality was added.

## Graph UI cleanup, Phase 3B.2G (2026-09-18)

- Primitive Number/Integer canvas outputs keep the Value port name and omit raw technical type labels. Add, Subtract, Multiply and Divide canvas ports show A, B and Result without `numeric` labels; schemas and Inspector type information remain intact.
- List disclosure controls use plain Details/Hide text. Candidate summaries place material and column count on a second line and retain the full geometry/material data.
- `STRUCTURAL_FAMILY` is a presentation category in `NODE_THEME_REGISTRY`; all five existing Pier definitions use its shared muted orange accent, border and header tokens. The dark node body remains neutral. Future structural family definitions can reuse this category; no family generator was added.
- `DATA_TYPE_THEME_REGISTRY` continues to set connection colors by source port data type. Browser checks confirmed numeric, integer and candidate-list edge colors remain independent from orange family styling.
- BaseNode now routes the structural family category through the engineering node shell. Number/Integer output rows are raised slightly to leave execution status clear of the output label. React Flow permits middle-button canvas pan while Ctrl+middle remains pointer-centered zoom; GraphStore and execution behavior are unchanged.
- Headless Chrome verified primitive/Math labels, all five orange Pier family nodes, type-colored edges, List candidate detail/encoding, handle bounds, status spacing and live Watch/List execution (8 visual assertions). The interaction regression browser matrix passed 27 assertions, including numeric editing, Range/Pier, scalar/list Math, quantity conversion, dropdown, connection drag, history, clipboard, save/reload, pan and zoom.
- Frontend tests: 161 passed across 29 files. TypeScript and production Vite build passed with the existing >500 kB JavaScript chunk advisory. Stop here; do not start Pier Cap.- A final real-browser rerun added occupied Math input reconnection and Number/Integer edit commits; all 28 interaction/regression assertions passed. The 8 visual acceptance assertions also passed.
## Pier Cap family nodes, Phase 3B.3 / Phase 3C (2026-09-18)

- The roadmap milestone is Phase 3B.3; the engineering brief calls this same Pier Cap scope “Phase 3C.”
- `domain/pierCapCandidates.ts` is a headless generator. `PierCapCandidate` is distinct from `PierCandidate`; it stores deterministic identity, `RECTANGULAR` or `T` cap type, canonical metre geometry, and the existing `ConcreteMaterial` reference. It contains no formatted engineering values or design results.
- Rectangular Cap geometry is `length` (transverse), `width` (longitudinal), and `height` (structural depth), defaulting to 12/3/2 m. T-Cap geometry is `length`, `topWidth`, `stemWidth`, `totalHeight`, and `flangeThickness`, defaulting to 12/3/1.5/2.5/0.8 m. Graph defaults use Project display units; generated candidate geometry uses metres.
- Every dimension must be positive. T-Cap additionally requires `stemWidth < topWidth` and `flangeThickness < totalHeight`. Invalid combinations are filtered without clamping inputs. Both families use the shared 10,000 raw-combination limit and stable Cartesian ordering/IDs.
- Registry definitions reuse generic Graph execution, target-aware scalar/list Length conversion, Range/Math previews, ConcreteMaterial resolution, authoring-state persistence and existing history/clipboard paths. Candidate values are derived live and are not persisted or stored in Family Tables.
- Watch shows a compact single-candidate geometry/material summary or family candidate count. List renders indexed geometry/material rows. Inspector shows resolved sources, scalar/list values, candidate counts, validation and illustrative 2D SVG sections. Node Library groups both definitions under Structural / Pier Cap. Shared orange `STRUCTURAL_FAMILY` node styling remains separate from the candidate collection edge color.
- Real Chrome verified visible-handle Number, Integer, Range, Math and Concrete connections; a 12-combination three-Range product; Watch/List; T-Cap valid/invalid/recovery and mixed valid/invalid filtering; replacement and Ctrl-drag disconnect/reconnect; copy/paste; undo/redo; reload; pan/zoom; both edge modes; and no browser exceptions or Maximum update depth errors. The acceptance script passed 28/28 checks.
- Automated coverage includes defaults, generation/order/IDs, quantity conversion, invalid geometry, safety-limit recovery, live Range/Math/Concrete previews, persistence/history, clipboard cloning, shell styling, List, Inspector and schematic. Frontend tests passed (183/30 files), TypeScript passed, and production build passed with the existing >500 kB chunk advisory.
- Pier and Pier Cap remain independent family generators. No Pier compatibility/assembly, foundation, bearing, structural design or later family was implemented.

## Foundation family nodes and derived geometry, Phase 3D (2026-09-18)

- Graph provides Shallow Foundation and Piled Foundation candidate nodes under the existing `STRUCTURAL_FAMILY` presentation category. The Graph authoring generators are separate from the existing Foundation Family Tables catalog and variant workflow; this phase does not merge or replace that product feature.
- Both generators consume typed scalar/list geometry inputs, the existing ConcreteMaterial reference, shared unit resolution, deterministic Cartesian ordering/IDs, and the 10,000 raw-combination safety limit. Generated dimensions are canonical metres. Local defaults use the selected Project display unit.
- Shallow Foundation dimensions are Lx, Ly and height; each candidate requires positive values. Piled Foundation dimensions are pile diameter D, integer pile counts nx/ny, independent spacings ax/ay and cap height. It derives `Lx = 2D + (nx - 1)ax` and `Ly = 2D + (ny - 1)ay` for each candidate.
- Pile counts accept dimensionless integer inputs/lists. Length quantities, including Length-kind Range outputs, are rejected for count ports rather than silently reinterpreted. Non-integer or non-positive counts and non-positive dimensions are filtered as invalid candidate combinations.
- Range/Math authoring previews flow live into the family nodes and Watch/List without Run. Inspector shows resolved sources, candidate statistics, derived Lx/Ly and an illustrative plan schematic. Candidate values are derived and are not persisted in Foundation Family Tables.
- A raw product beyond 10,000 reports a generation error and does not materialize candidates; the Inspector distinguishes this failure from invalid geometry counts. No bearing/soil/pier connections, foundation checks, geotechnical properties, pile length, structural analysis or design acceptance are implemented in this phase.
- Real Chrome verified visible-handle connections for shallow dimensions and materials, piled dimensions/counts and materials, Range → Math → piled spacing, live Watch/List outputs, count type rejection, occupied-input replacement, drag-disconnect/reconnect and over-limit/recovery behavior. Frontend automated suite passed (202 tests / 31 files); TypeScript and production build passed with the existing >500 kB chunk advisory.
