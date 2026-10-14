# KOPRUQ Architecture

Status: **P06's MIDAS-P01 round trip + real VIA-35 model done; P10's UI
shell also done, out of milestone order; SITE-P01's `spatial-core` +
`alignment` modules done; LAYOUT-P01 done end-to-end (`constraints` +
`bridge-layout` + REST endpoint + Layout Generator frontend screen) and
seamed into Bridge Design (P03's structural generation - pick a feasible
layout -> runs with its bridge length/span locked in); sidebar
navigation now matches the engineer's full target menu exactly (~45
leaves, 6 collapsible groups + Home/3D & Visualization/Reports
standalone); **the native `kopruq-analysis-engine` (addendum P) is now
real** - a linear-elastic 3D direct-stiffness solver, verified against
closed-form results and live-run on the engineer's own 5-span
frame-bridge test case (KOPRUQ Fast Solver screen)** for the new
polyglot stack - see `docs/roadmap.md`. This document describes the *shape* of the system as
of `docs/ARCHITECTURE_AMENDMENT_V2.md`, now also being extended per
`docs/SITE_LAYOUT_PLATFORM_ANALYSIS.md` (site/corridor/layout platform +
native analysis engine - engineer approved starting with its first
roadmap step, `spatial-core`/`alignment`, on 2026-09-10; the rest of
that document's proposal is implemented incrementally, module by
module, not all at once); it will be extended, not rewritten, as
milestones land.

## Core architectural principle (spec section 3, unchanged)

## Project Bridge -> Graph workspace integration (Phase 3)

The frontend Project `BridgeRow[]` remains the single bridge-list source. A
bridge may carry a persistent `id`; `readProjectState` performs a backward-
compatible one-time migration for older records and persistence retains the
identity across reloads, edits, sorting and imports. The display `no` value
(`VIA-01`, etc.) is not used as the Graph identity.

Graph documents retain the existing `kopruq.graph.documents.v1` format and
schema, with optional `bridgeId` and `projectId` ownership metadata. Selecting
a Project bridge reuses its owned document or creates one empty document with
no default nodes. Legacy unassigned documents remain in the same store and
are not assigned by name. Graph-store history remains keyed by Graph document
ID, so switching bridges does not share undo/redo state.

KOPRUQ has its own independent **Bridge Core**. It must never depend on
MIDAS, ALLPLAN, SCIA, a specific FEM solver, or a specific BIM format.
External engineering applications are reached only through adapter
modules.

```
                    KOPRUQ
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

BACKEND-MODULAR-MONOLITH: the former 17 Maven modules are one Spring Boot module with package-level boundaries.

```
KOPRUQ/
|-- frontend/                      React + TypeScript (Vite), web app (browser-based)
|-- backend/                       ONE Maven module (kopruq-backend, packaging jar), Java 21
|   |-- pom.xml                     Spring Boot 3.5.16 BOM + JUnit 5 BOM; jts-core, jackson-databind
|   `-- src/
|       |-- main/java/com/kopruq/
|       |   |-- KopruqApplication.java       @SpringBootApplication (component scan base com.kopruq)
|       |   |-- shared/{config,exception,validation}/
|       |   `-- <domain>/{api,application,domain,model,enums,infra}/   (created only when needed)
|       |         geometry (spatial-core)         alignment        terrain         landxml
|       |         loads (traffic + environmental) materials        layout (bridge-layout + constraints)
|       |         bridge (bridge-core)            rules            generative
|       |         analysis (analysis-api port in application, model-builder in domain,
|       |                   native engine in infra/nativeengine, MIDAS adapter in infra/midas)
|       |-- main/resources/application.properties
|       `-- test/java/com/kopruq/    each test beside its subject; architecture/ and contract/
|-- services/                       Python, deferred to after P01
|   |-- optimization-service/        placeholder only
|   `-- ai-service/                  placeholder only
|-- docs/
|   |-- KOPRUQ_MASTER_SPEC.md       authoritative spec (v1, kept verbatim)
|   |-- ARCHITECTURE_AMENDMENT_V2.md  supersedes spec sections 3/4/12-14/19-20 tech choices
|   |-- architecture/backend-reference.md  the reference package layout (R1-R15)
|   |-- architecture.md              this file
|   `-- roadmap.md                   milestone status
`-- archive/                        two earlier build generations - reference only
```

## Domain dependency graph (packages)

Since BACKEND-MODULAR-MONOLITH the domain boundaries are packages, not Maven modules. The graph is pinned exactly by
`backend/src/test/java/com/kopruq/architecture/ArchitectureTests` (rules in `ArchitectureRules`, plain JUnit over the real
source tree and `backend/pom.xml`, no ArchUnit). Direct domain dependencies of the core layers (`model`, `domain`, `enums`),
`CORE_DEPS`:

```
geometry                                  (none)
alignment            -> geometry
terrain              -> geometry          (+ JTS, external, in terrain.domain only)
landxml              -> geometry, alignment, terrain   (+ javax.xml in landxml.domain)
loads                                     (none; EN 1991-2 traffic loads and wind/seismic/temperature)
materials                                 (none)
layout               -> alignment
bridge                                    (none)
rules                -> bridge
generative           -> bridge, rules
analysis             -> materials
```

All layers (`api`, `application`, `infra` included), `DOMAIN_DEPS`: the same, plus `alignment -> landxml`
(AlignmentController reads LandXML imports) and `layout -> geometry`. `shared.exception -> landxml`
(`ApiExceptionHandler` maps `LandXmlParseException`); `shared.config` is the composition root and is exempt.

What `ArchitectureTests` enforce (a rule that cannot fail proves nothing, so each has a violating and a clean synthetic test):
T1 every main package is `com.kopruq.<domain>/{api,application,domain,model,enums,infra[.sub]}`, `com.kopruq.shared.*` or
`com.kopruq` (only `KopruqApplication`); T2 `model`/`domain`/`enums` import no Spring, jakarta (persistence included), Hibernate, lombok,
application, api, infra or `shared.config`; T3 their imports stay on an allow-list; T4 the domain edges equal the pinned graph
(an unused pinned edge is a violation too); T5 external imports only where allowed (`infra.nativeengine` java.* only,
`infra.midas` java.* plus Jackson); T6 MIDAS/SCIA/ALLPLAN types only under `analysis.infra` (`com.kopruq.analysis.infra.midas`
reachable only from itself and `shared.config`); T7 exactly 12 `@RestController` classes, only in `<domain>.api`; T8 no
`@CrossOrigin`, no controller builds collaborators with `new`; T9 `application` does not import `api`; T10 `pom.xml` has no
`<modules>`, packaging `jar` and exactly the approved eleven dependencies (the original six plus Spring Data JPA, Flyway core/PostgreSQL, the PostgreSQL driver and H2 for tests); T11 JPA, Spring Data and Hibernate imports occur only in `<domain>.infra.persistence`.

Rule evaluation decision (BACKEND-ARCHITECTURE Faz 6, assumption A1): the rule engine is part of alternative
generation. `EvaluatedAlternativeGenerator` runs every alternative through the `RuleEngine`, so `generative -> rules` is a
used edge. No rule is approved yet, so every alternative is feasible and nothing changed in the REST response.

The MIDAS adapter (`analysis.infra.midas`) is wired by `shared.config.CoreConfiguration`; `bridge-layout` and `bridge-core` do
not depend on each other yet - the seam between them (`StructuralAlternativeBuilder`, per the analysis document section C)
is a later milestone.

### Package layout

```
com.kopruq.<domain>
  api/            @RestController + request/response records (HTTP mapping only)
  application/    use cases, ports and repository interfaces (Spring is allowed; no <x>.api imports)
  domain/         framework-free services/algorithms spanning several models
  model/          framework-free models that own their business rules and invariants
  enums/          domain enums
  infra/          port implementations (terrain, landxml, bridge: persistence/ JPA adapters; analysis: nativeengine/, midas/)
com.kopruq.shared/{config,exception,validation}   composition root, single error contract, field checks
```

### Analysis port units and the MIDAS notes for P07

The `analysis-api` port is in m / kN (kN/m2, kN/m3, t/m3, rad, 1/degC, kN/m, kN*m/rad) and uses KOPRUQ enums
(`MaterialKind.CONCRETE`, `LoadCaseKind.DEAD|WIND`); the MIDAS codes are in `midas-adapter`'s `MidasVocabulary`.
For P07: (1) `LoadCaseKind.WIND` is refused by the adapter (`UnsupportedOperationException`) until its MIDAS code is
verified on a live session; (2) the adapter does not set the MIDAS session unit, so the session must already be in
kN and m - verify or add the unit call live; (3) the model-builder module is where the MIDAS path should get its
`AnalysisRequest` from (the same builder as the native engine).

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
tauri dev` opened a real "KOPRUQ" window, confirmed by screenshot; a
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
DTOs live in `com.kopruq.api.kernel`. Note for every future endpoint:
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
(`com.kopruq.api.alternatives`) built from `bridge-core`'s
`BridgeAlternative` - kept out of `bridge-core` itself since it's purely
an API/table-shaping concern.

`AlternativeGenerator` (`com.kopruq.generative`) enumerates uniform
span layouts x girder count x girder depth within the posted
`DesignSpace`, stepped by `DesignSpace.DEFAULT_GIRDER_DEPTH_STEP_M`.
"Feasible" at generation time means exactly this generator's own
definitional feasibility (fits within the min/max ranges).

`frontend/src/App.tsx`'s GENERATE button now calls `/api/kernel-state`
then `/api/alternatives` in sequence and renders the result as a plain
table - no dashboard styling yet (P10 scope).

## P04 Rules Engine (`backend/rules-engine`, `backend/api`, `frontend`)

`com.kopruq.rules`: `EngineeringRule` interface (`id()`,
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

`com.kopruq.analysis` (solver-independent - no MIDAS reference
anywhere): `AnalysisEngine` port (`submit`/`getStatus`/`getResults`/
`cancel`), `AnalysisRequest` (nodes/elements/materials/sections/
supports/loadCases/selfWeights), `AnalysisResult` (reactions/
displacements), `AnalysisJob`/`AnalysisJobId`/`AnalysisStatus`. Fields
are MIDAS-P01-minimal on purpose (a single hand-built beam, self-weight
only) - the record shapes are already generic enough that load
combinations, moving loads, construction stages etc. add new fields
later without reshaping the port.

`com.kopruq.midas` implements that port:
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
(KOPRUQ id <-> MIDAS id, needed once real `BridgeAlternative`s with
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
shell early, matching the target mockup (`Kopruq_menÃ¼.jpg`). `App.tsx`
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
  L), no `kopruq-analysis-engine` (addendum P - a separate, unstarted
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

- **`api` module**: new `com.kopruq.api.layout` package -
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
  `kopruq_working_style` lesson on this).
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
  `kopruq_working_style` memory - `preview_stop` left a stray
  `node.exe` behind twice this session; had to be killed manually via
  `Get-Process`/`Stop-Process` before the next `preview_start`).
- **Not done yet, by design**: the ~40 placeholder leaves are exactly
  that - placeholders. This step is a navigation/information-architecture
  change only, not ~40 new feature implementations.

## Native analysis engine - `kopruq-analysis-engine` (`backend/analysis-engine`, addendum P)

Sixth step, same session: KOPRUQ's own linear-elastic 3D direct-stiffness
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
  - `KopruqAnalysisEngine implements AnalysisEngine` - same
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
- **`backend/api`'s `com.kopruq.api.fastsolver` package**: `FastSolverRequest`
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
- **`FastSolverPanel.tsx`** (new): 'kopruq-fast-solver' is real now, not
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
  now - matches the engineer's mockup exactly (Abutments: "KOPRUQ
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
a per-shape "use in KOPRUQ analyses" checkbox and min/max/delta
dimension ranges (the engineer's own worked example: Circular D
200-300cm step 25cm -> KOPRUQ analyzes 200/225/250/275/300cm), scoped
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
  shape (Rectangular/Circular/Oval/Box): a checkbox ("Use in KOPRUQ
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
  to "100, 125, 150" immediately; confirmed the "Use in KOPRUQ
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
  its own "Values KOPRUQ will use" list vs. "Not configured yet").
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
Pier Families' Oval card's "Values KOPRUQ will use" text was still
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

The engineer flagged architectural problems in the real KOPRUQ frontend
(everything flat under one `src/components/` folder, navigation a
hand-rolled `active`-state switch, forms uncontrolled `useState` with no
validation, the 3 backend-calling screens mixing `fetch()` directly into
the UI) and provided a reference project,
`C:\_ZHarput_Data\kopruq-frontend` (also `CemHarput/kopruq-frontend` on
GitHub) - a **separate demo app** built to its own spec
(`KOPRUQ_React_Implementation_Plani.md`), not something whose
screens/content should replace KOPRUQ's own. The ask was to apply that
project's **architectural pattern** - `app/ -> pages/ -> features/<domain>/
-> shared/`, plus its full tech stack (React Router, TanStack Query, React
Hook Form + Zod, TanStack Table, Radix UI, Recharts, Vitest/RTL) - to the
real KOPRUQ frontend, confirmed via a clarifying question (the engineer
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
  KOPRUQ shows exactly one section at a time, and `app/router.tsx`'s
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
`useFieldArray`), `FastSolverPanel` (kopruq-fast-solver, including its
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
- **Recharts**: nothing in KOPRUQ has chart-able data yet (P08/P09
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
  to `localStorage` (`kopruq.theme`); `main.tsx` applies the saved value
  synchronously before the first paint to avoid a flash. `index.css`
  gained a full `:root[data-theme='light']` palette (background/surface/
  border/text variables) alongside the existing dark set - every
  component already styled via `var(--...)` needed no further change.
  **The sidebar deliberately stays a fixed dark palette in both themes**
  (new non-themed `--sidebar-*` variables, not overridden by
  `[data-theme='light']`): the KOPRUQ logo PNG has a dark navy
  background baked into the image itself, so a light sidebar would show
  it as a mismatched dark rectangle - a permanently-dark sidebar next to
  a light-or-dark content area is a common, deliberate pattern (VS Code,
  Vercel, Linear, etc.), not an oversight, and was the only way to keep
  the light theme looking coherent without re-exporting the logo image.
- **Logo cropped, not re-exported**: the PNG (1536x1024) has the bridge
  graphic + "KOPRUQ" wordmark in its top ~74% and a barely-legible
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
mentioned KOPRUQ) - rewritten with the real feature-sliced
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
- **New `backend/api` endpoints**: `com.kopruq.api.terrain.TerrainController`
  (`POST /api/terrain/import`, `GET /api/terrain/{id}/mesh` - a flat,
  indexed-buffer-friendly payload, "do not send one object per
  triangle", vertices already translated by `localOrigin` so real-world
  coordinates never reach the frontend; `GET /api/terrain/{id}/elevation`)
  and `com.kopruq.api.alignment.AlignmentController`
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
  `com.kopruq.landxml` package - matches this project's actual module
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
  imported terrain too. New `com.kopruq.api.config.SharedRepositoriesConfig`
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
  `com.kopruq.trafficloads` package - same convention as `terrain`/
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

- `/` and `/home` now redirect to `/project`; the KOPRUQ wordmark also
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
  app-owned state and persisted together in `kopruq.project-workspace.v1`;
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

- Added the canonical Bridge Definition workspace with the requested hierarchical Alignment, Span Arrangement, Superstructure, Supports, Foundations, Bearings, Construction, Constraints and Assembly navigation. A selector reuses the existing project bridge inventory; selection and each bridge definition are persisted in `kopruq.bridge-definitions.v1`.
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
| Girder | `GirderLibraryPanel`; Precast parameter sweep and generated variants; Steel/Box remain placeholders | Existing girder shape; dimensions/enabled persisted at `kopruq.girder-library.precast`; canonical `PG-200`, generated variant IDs `PG-Hâ€¦` | Reused; registry adapter maps existing definition to `PG-200`, without another store. |
| Pier | Most complete existing family workflow, used as interaction reference | Existing section generator, shape preview, height applicability and persisted stable IDs at `kopruq.project-design-system.pier-families` | Reused unchanged in its engineering calculations; catalog selection also updates Family Inspector. |
| Pier Cap | Existing Pier Cap rule model, variant generator, schematic and catalog | Persisted stable IDs at `kopruq.project-design-system.pier-cap-families` | Reused; Bridge Definition usage is indexed for delete protection. |
| Abutment | No reusable Abutment family model/editor/catalog found; prior route is a placeholder | No stable family IDs or reusable geometry/persistence to migrate | Shown disabled with an explicit unavailable state; no fake family created. |
| Foundation | Existing shallow/piled family model, generator, validation and plan/elevation schematic | Persisted stable IDs at `kopruq.project-design-system.foundation-families`; current service derives piled Lx/Ly using X/Y spacing independently | Reused in one Foundation editor; clicking a catalog row loads it for editing. |
| Bearing | Existing Elastomeric family/rule model, generator, validation and schematic | Persisted stable IDs at `kopruq.project-design-system.bearing-families` | Reused; Bridge Definition usage is indexed for delete protection. |
| Material | Existing concrete class by structural element table, using EN 1992-1-1 class names | Previously transient; assignments now persist under `kopruq.project-design-system.material-assignments` with stable element keys. This is still a class assignment table, not a full material property model. | Reused under Family Tables; class-code adapters identify the shown material entries. No mechanical properties invented. |

- Added a Family Tables workspace with the supported categories above, central existing editors/tables/previews and a context Inspector. Foundation replaces the separate Pile shortcut with its existing Shallow/Piled type selector. Existing `SystemAssemblyPanel` is a family-composition template, Preferred Span is a girder rule, and Standardization Rules are not reusable component families; their source/legacy routes remain, but they are not shown as family categories.
- The new `family-registry` module is a read-through adapter over feature-owned stores, not a second database. It supplies stable-ID lookup and bridge-usage references. Pier, Pier Cap, Foundation and Bearing deletion is blocked while an ID is referenced by a bridge definition; the error lists bridge and axis. Girder, Superstructure and Material have no family deletion operation in their existing editors.
- Selecting a catalog family updates a shared category/ID selection event consumed by the right Inspector. Existing feature-owned generators and previews remain the source of geometry. Family data are not copied into Bridge Definition; family IDs remain in bridge assignment state.
- Old Design System sidebar entries and the separate Materials entry were removed after mounting the existing screens in Family Tables. Legacy family URLs and source components are retained for compatibility. No import/export format existed to migrate; disabled Import/Export affordances are shown, without adding a new package format.
- Superstructure currently has no family identity or its own catalog, only app-level cross-section input. Abutment has no family model. Material has class selections but no material property registry. These remain explicit gaps before Graph work; this phase did not implement Graph, Analysis, Optimization, or engineering design checks.

## Architecture realignment and Family Repository, Phase 2E (2026-09-17)

- Removed Bridge Definition from primary top navigation while retaining `/bridge-definition` as an internal compatibility/development route. Existing bridge definitions and UI modules remain intact. See `docs/kopruq-data-architecture.md` for the ownership boundary and reuse inventory.
- Added `family-registry/model/familyRepository.ts` as the shared access boundary over existing catalog keys, plus `useFamilyCatalog` for the supported editable family catalogs. Pier, Pier Cap, Foundation and Bearing editors now publish edits through the shared repository subscription. Existing keys, payload formats and IDs are preserved.
- Bridge Definition and System Assembly resolve those family records through the repository. Girder Library's existing singleton payload is read/written through a repository adapter without changing its storage shape. Family selection/Inspector records remain projections, not another catalog.
- Added a Graph family reference/parameter-schema adapter. References contain category and stable `familyId`; resolution reads the current persisted family data. Added the `GeneratedBridgeModel` output boundary only; no Graph nodes, generation, FEM or optimization were implemented.
- Piled foundation Lx/Ly remain calculated only by `derivePiledFoundationDimensions`; UI previews and variants consume the same domain calculation. Ly uses pile spacing Y.
- Remaining pre-Graph gaps: Girder and Superstructure lack the same stable family domain model; Abutment has no family catalog; Material remains a concrete-class assignment table rather than a material-property catalog. These were not converted into synthetic engineering families. Alignment import/terrain references remain in Project environment state; bridge-local spans, axes, assignments and constraints remain in the retained legacy Bridge Definition store pending a deliberate migration.

## Visual Graph Foundation, Phase 3A (2026-09-17)

- The Graph workspace uses the existing `WorkspaceLayout`; its left panel is the registry-driven Node Library, the center is the XYFlow canvas, and the right panel is the node Inspector. The canvas adapter translates between XYFlow view nodes/edges and the independent, serializable KOPRUQ graph domain.
- The graph registry currently exposes only Number, Integer, Boolean, Range, Add, Subtract, Multiply, Divide and Watch. Registry schemas define ports, parameters, defaults, validation and execution. Engineering, family, bridge, loads and analysis nodes are reserved types only and are not exposed or executable in this phase.
- The graph engine validates node types, parameter keys and values, port compatibility, single-input connections, required inputs and cycles before topological execution. It reports per-node results and errors to Watch, node states and Graph Log.
- `GraphStore` persists multiple graph documents at `kopruq.graph.documents.v1`, with per-document edit history and JSON round-trip. React Flow remains a replaceable UI adapter and does not own authoritative graph data.
- Phase boundary: no Family Repository, Loads, Bridge Definition, generated bridge model or Analysis integration was added. The next integration point is Phase 3B family data nodes.

## Graph Connection Stability and Authoring Architecture Lock, Phase 3A.1 (2026-09-17)

- Live browser reproduction identified a React Flow `StoreUpdater` update-depth loop. `onSelectionChange` unconditionally created new selected-ID arrays; those arrays rebuilt the controlled node objects, React Flow synchronized them back into its store, and repeated selection updates re-entered the cycle. The development console reported `Maximum update depth exceeded` from `StoreUpdater` / `setNodes`.
- The Graph Store is now the sole persistent topology source. Node and edge props are memoized projections; selection updates are ignored when IDs did not change. Only in-progress node drag positions live temporarily in UI state and commit once at drag end. Interactive connection checks are pure Level 1 port/existence/type/multiplicity checks; cycles and readiness are checked by full validation on Run. A valid connection causes one store update and one undo entry; duplicate/invalid connections are ignored.
- Watch uses the explicit `display:any` sink type for supported display values (number, integer, boolean, string, and numeric arrays). Engineering port types remain domain-specific and cannot connect to this display sink.
- **Architecture lock:** Graph is KOPRUQ's future primary engineering definition and authoring environment. Engineering values and candidate families will be node-driven; Family Tables remains transitional UI and stays in primary navigation for now. Reuse validated domain calculations from existing features as one implementation, called by nodes, rather than copying calculations into UI or graph code. Graph execution remains headless and independent from React/XYFlow. Generated bridge models are outputs of Graph generation, not manually authored Bridge Definition state.
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
- The preference is stored separately from graph documents at `kopruq.graph.view-preferences.v1`, defaults to Smooth, and is restored when the Graph workspace opens. It is not part of `KopruqConnection` or graph undo history.
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
- React Flow selection arrays are compared by membership before state updates. Selection/runtime state remains outside GraphStore and clipboard data. Clipboard stores only cloned KopruqNode/KopruqConnection authoring data and clones with fresh IDs.
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
- The control stops pointer and click propagation at the trigger and portaled menu. The closed trigger allows wheel events to reach React Flow for canvas zoom. The menu is portaled outside the canvas subtree so its native list scrolling remains available. Numeric editors retain `nowheel` markers. Escape and outside pointer-down close without changing the value; keyboard arrows/Enter navigate and commit.
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
- Graph wheel behavior is corrected in Phase 3D.1A: wheel rotation zooms around the cursor with React Flow (`zoomOnScroll`, `zoomOnPinch` enabled, `panOnScroll` disabled, `panOnDrag={[1]}`, zoom bounds 0.20–2.50). A non-passive capture listener prevents browser scrolling inside the canvas while allowing React Flow to receive the event. Closed Concrete selectors pass wheel events to the canvas; open portaled menus keep native option scrolling, and numeric editors opt out of React Flow wheel handling. Automated regression tests pass; physical-wheel Chrome verification remains outstanding.
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

## Elastomeric Bearing family node, Phase 3E (2026-09-18)

- Graph exposes one Structural / Family node: Elastomeric Bearing. It generates family alternatives for later assembly use and does not assign a bearing to a bridge location.
- `BearingCandidate` stores a deterministic ID, `ELASTOMERIC` type, canonical metre geometry (`lengthX`, `widthY`, `totalHeight`) and six local-axis canonical stiffness values (`kx`, `ky`, `kz` in kN/m; `krx`, `kry`, `krz` in kN·m/rad). It contains no formatted strings, location, orientation, quantity, material or runtime cache.
- Geometry uses the existing Project length display unit. Translational and rotational stiffness use the existing typed quantity kinds and conversions; absent project preferences resolve to canonical kN/m and kN·m/rad. Numeric scalars/lists at typed ports are interpreted in those display units, while explicit quantities retain their unit metadata. Math output remains generic numeric authoring data until the bearing port resolves it.
- Generation is deterministic Cartesian product, last field varying fastest, with a 10,000 raw-combination ceiling. All values must be finite; dimensions must be positive and stiffness values non-negative. Zero stiffness remains exactly zero and valid. Invalid combinations are counted; oversized products fail before candidate materialization.
- Range/Math inputs preview candidates without Run. Connected canvas rows show resolved engineering values. Watch reports candidate counts; List shows geometry and all stiffness values; Inspector shows input groups, raw/valid/invalid counts and an illustrative plan/section schematic.
- The stored axes are bearing-local. Bridge Assembly will later assign a candidate to support/girder/location and define orientation; a later FEM stage can map these local stiffness components into link/spring elements.
- No bearing assignment/location, orientation, count, rubber or steel-plate material, EN 1337 check, bearing design, FEM element, Pot/Spherical family or downstream design/optimization work is part of this phase.
- Automated tests and the production build cover domain generation, quantity resolution, live previews, Watch/List/Inspector, copy/paste, history and persistence. The requested physical-wheel Chrome acceptance matrix remains outstanding because this checkout has no browser automation harness.

## Graph Inspector Standardization and CAD Selection, Phase 3E.1 (2026-09-18)

- Structural node definitions carry `engineeringInspector` metadata for schematic family and engineering parameter order. A shared `EngineeringNodeInspector` renders General, Type / Schematic, Parameters and Family for Pier, Pier Cap, Foundation and Elastomeric Bearing nodes.
- Structural Inspectors show editable local values or resolved connected values, and hide Graph ports, data types, source IDs and node IDs. A multiple selection displays type counts. The empty state is minimal. Node Library and Inspector typography use shared sizing rules.
- Pier schematics appear near the top. The T-Cap schematic explicitly draws a wide upper flange and a stem extending downward, with dimension labels at the corresponding geometry. Structural schematic graphics use `--graph-structural-accent`.
- Empty-canvas left-to-right selection requires full node enclosure; right-to-left selection includes intersecting or touching node bounds. A temporary box is rendered during drag and only the final ID list is committed at release. Bounds are converted with React Flow `screenToFlowPosition`, so pan and zoom are included. Selection is node-only and does not auto-pan.
- Shift adds IDs to the existing selected-node state; Escape cancels the rectangle. Selection does not enter graph authoring history. Existing copy/paste, delete, undo and group movement use the same selected-ID state and GraphStore operations. Node clicks and box selection update that state directly; React Flow's selection callback updates edges only to prevent stale node selection from overwriting it.
- Chrome smoke checks with 12 nodes verified window enclosure, partial-window exclusion, crossing inclusion, Shift-add, the multiple-selection summary, multi-node Ctrl+C/Ctrl+V and Escape preservation. All 10 current structural node types rendered the shared section order, orange schematic and no PORTS. Pure coordinate tests cover zoom scales 0.5, 1.0 and 2.0 plus pan. Physical mouse-device interaction is not covered.

## Engineering Schematics and Inspector Cleanup, Phase 3E.2 (2026-09-19)

- Structural Inspector diagrams are SVG engineering views built from shared dimension, axis, centerline, outline and value-formatting primitives. Geometry uses the centralized `--graph-structural-accent`; dimension and axis graphics use shared secondary tokens.
- Dimension annotations pair the engineering parameter with its current resolved value and Project display unit. Local values use the same unit preference, connected values use the live preview, and multi-value candidates display the minimum-to-maximum preview range. Schematic scaling clamps display proportions while leaving authoritative candidate geometry untouched.
- Pier section convention is transverse horizontally and longitudinal vertically: B is transverse and D is longitudinal. Circular Pier uses a diameter; Oval Pier is a B-by-D obround, Box Pier retains its hollow void, and H Pier is drawn in the required 90-degree rotated orientation with B, D, tw and tf.
- Pier Cap diagrams show length and section dimensions. T-Cap is drawn with its wide flange at the bottom and its stem extending upward. Shallow Foundation and Piled Foundation each show PLAN and SECTION; pile locations use the existing nx, ny, ax, ay and D geometry and the candidate-derived Lx/Ly dimensions. No foundation candidate equations or other engineering rules changed.
- All current structural family Inspectors, including Elastomeric Bearing, use the shared schematic renderer. Node-definition metadata remains the extension point for future Girder and Abutment diagrams.
- Every Inspector now uses presentation labels rather than Graph port definitions, internal data-type strings or source/target IDs. Non-family nodes use concise Parameters / Value and Result / Preview sections; family nodes retain the common General, Type / Schematic, Parameters and Family order.
- Node Library names and Inspector labels/values share `--graph-panel-body-font-size`. SVGs use responsive viewBoxes and separate compact single-view and two-view sizing.
- Chrome smoke verification at the 284 px Inspector width checked all current structural schematics, unit/value labels, shared orange, text bounds, Inspector/Library font sizing and absence of port/debug text. Browser screenshots also reviewed Pier, T-Cap and both foundation diagrams. Chrome interaction was simulated through DevTools; physical mouse hardware was not tested.
- A connected live-preview browser fixture linked Number and Math into Watch/List, a Range into Pier width, and Concrete into Pier material. Resolved values and candidate range appeared without implementation IDs or browser exceptions.
- Graph gesture smoke checks verified wheel zoom without document/viewport vertical scrolling, middle-button pan and Ctrl+middle pointer-centered zoom. The temporary fixture was removed afterwards.

## Inspector Schematics, Theme Toggle and Logo Integration, Phase 3E.3 (2026-09-19)

- Foundation Inspector SVGs now show the actual shallow footing and piled cap bodies in PLAN and SECTION, including pile positions/extensions, dimensions, derived Lx/Ly and Bridge Axis. Pile extension is schematic only when no engineering length exists.
- Bearing PLAN dimension spacing separates the title, arrows, labels and outline at compact Inspector widths. H-section Pier remains 90-degree oriented and uses a visibly substantial continuous concrete web while reading the unchanged B, D, tw and tf values.
- The active workspace navigation mounts the shared persisted Dark/Light toggle. Theme variables cover the shell, graph, nodes, Inspector, controls and dialogs while preserving structural orange and connection visibility.
- The original `Kopruq_logo.png` is served unchanged from `frontend/public/Kopruq_logo.png` and is displayed with contain sizing in the navigation brand link.

## Light Mode, Foundation, H-Section and Bearing Drawing Corrections, Phase 3E.4 (2026-09-19)

- React Flow canvas, dot grid and minimap now consume theme variables, so Light mode uses a light canvas and contrasting grid while Dark mode retains its existing palette. Node, toolbar, connection and selection styling remains category-aware.
- Light mode overrides the graph node bodies, numeric edit boxes, unit selectors and canvas menus with readable light surfaces and dark text.
- Foundation SECTION renderers retain explicit solid footing/cap rectangles and vertical schematic pile extensions; no candidate or dimension formulas changed.
- H-section visual web thickness is strengthened through SVG presentation constraints only; resolved B, D, tw and tf values remain authoritative.
- Bearing PLAN/SECTION coordinates remain separated for title, dimensions and geometry.

### Phase 3E.4 revision

The foundation section rendering defect was caused by SVG `<rect>` elements receiving `w` and `h` properties instead of SVG `width` and `height`; both section renderers now use explicit SVG dimensions. H Pier display dimensions intentionally map the existing depth input to transverse B (1.50 m) and width input to longitudinal D (3.00 m), with a presentation-only three-times-thicker web. Candidate generation and authoritative engineering values are unchanged.

## Inspector Unit Conversion and H-Section Geometry, Phase 3E.5 (2026-09-19)

Local numeric unit selectors now use `convertQuantity` to convert the paired value before persisting the new unit. The canonical engineering value therefore remains unchanged when switching display units, while editing the converted value still follows the existing node parameter path. H Pier schematic dimensions map the existing depth input to transverse B and width input to longitudinal D for the requested orientation; tw/tf drive a single solid SVG silhouette and do not alter candidate generation.

## Graph Node Headers, Selection and Light Canvas, Phase 3E.6 (2026-09-19)

Node title rows now use shared category accent variables for their full background while retaining the existing category border. Selection is rendered as a category-independent blue border and glow. The Light graph canvas uses the requested #E6E6E6 variable and a contrasting React Flow dot grid; node positions, graph state and selection logic are unchanged.

## Precast and Steel Girder Family Nodes, Phase 3F (2026-09-19)

Graph now exposes `structural.girder.precast` and `structural.girder.steel`. Both use typed length ports, deterministic Cartesian candidate generation and shared span metadata. Precast candidates use the existing Family dimension vocabulary. Steel candidates model a welded three-plate I-section and calculate geometry-only properties (`hw`, A, centroid, Ix/Iy and elastic moduli). Material completeness is independent: missing Structural Steel density/mechanical properties marks dependent outputs `INCOMPLETE` without suppressing valid geometric candidates. EN 10025 catalog completion remains a later phase; no engineering constants were invented.

### Phase 3F Node Library integration correction

The Phase 3F girder nodes were registered as `structural.girder.precast` and `structural.girder.steel`, but `NodeLibrary.tsx` only rendered Structural/Family subgroups for `substructure.pier`, `substructure.pier-cap`, `substructure.foundation` and `substructure.bearing`. The registry and execution chain were therefore intact while the entries were invisible. A shared prefix filter now renders both definitions under a Girder subgroup with the existing add/drag behavior.

## Precast Girder Integration Corrections, Phase 3F.1 (2026-09-19)

Precast Girder local defaults now use independent existing Family dimension values rather than repeating girder height for every field. Girder candidates are recognized by List output and display geometry, material and preferred span without JSON conversion; the existing typed `girderCandidate[]` output and live Graph execution path remain unchanged.

## Precast Inspector Geometry and Unit Precision, Phase 3F.2 (2026-09-19)

`convertQuantity` now removes binary floating-point presentation noise with a precision-preserving significant-digit normalization. The shared `bulbTeeGirderPath` function is used as the canonical Family/Inspector outline source, with independent H, tf, bf, w, th1, th2, bh1 and bh2 dimensions. Chrome verification captured `%TEMP%/kopruq-precast-3f2.png` and confirmed the Girder Height unit switch displays exactly `1900` for `mm`.

## Precast Girder Candidate Preview and List Compatibility, Phase 3F.3 (2026-09-19)

The 0-candidate live display was caused by the React Flow adapter's preview resolver excluding `structural.girder.*` nodes, even though the registry executor and candidate generator were present. The adapter now resolves Girder previews through the same path used by the other structural family nodes and publishes their candidate count before RUN. The typed connection whitelist also includes `girderCandidate[]`, so Candidates can feed List and Watch `display:any` inputs without weakening validation for unrelated types.

## Steel Girder Welded I Section and Material Catalog, Phase 3F.4 (2026-09-19)

Steel Girder remains a registry/domain node. Its six length inputs are converted to canonical metres before deterministic Cartesian generation. Valid candidates carry welded-I geometry and section properties; invalid rows are rejected with geometric validation rules. The Structural Steel node now exposes S235, S275, S355, S420 and S460 identifiers. Since verified product-standard and thickness-band strength tables are not present in the current catalog, strength properties are not invented and density-dependent results remain INCOMPLETE when density is absent. This keeps geometry generation independent from material verification.

## Shared Material Inspector Integration, Phase 3F.5 (2026-09-19)

Material display now uses a shared `MaterialProperties` component for material nodes and girder engineering Inspectors. Structural Steel grade options are sourced from the existing catalog; the current verified catalog subset exposes E, ν, density and unit weight, while unverified fy/fu and thermal values remain absent rather than being invented. Connected material values take precedence over local girder defaults, and local S355/C40/50 defaults remain available for live previews.

## Material Selection and Inspector Standardization, Phase 3F.6 (2026-09-19)

Structural family Inspectors now render their material choice inside PARAMETERS and do not duplicate material property tables. Independent Concrete and Structural Steel nodes retain catalog-backed property display and selectors. Connected material ports remain authoritative and disable the local selector while connected; removing a connection restores the local catalog selector and default.

## Structural Steel to Steel Girder Connection Fix, Phase 3F.7 (2026-09-19)

The connection error was in the live preview resolver: `previewOutput` handled Concrete material nodes but not Structural Steel material nodes. A connected Steel Girder therefore received no preview material, entered the error path, and displayed zero candidates before RUN. Structural Steel preview now emits the same `StructuralSteelMaterial` domain shape as the execution registry, preserving the selected material ID. Geometry remains independent of optional material properties.

## Structural Material Selector Standardization, Phase 3F.8 (2026-09-19)

Structural family material selection is rendered by the shared `MaterialSelector` component. It reads the existing concrete or Structural Steel catalog, writes changes through the existing node parameter callback, and renders a disabled source-driven selector when a material connection is active. The selector is present in the common PARAMETERS section with the normalized label `Material`.

## Girder Material Selector Fix, Phase 3F.9 (2026-09-19)

The Inspector had two rendering paths for material inputs. The connected path rendered a status wrapper and `Connected` text, while the local path rendered the selector. Phase 3F.9 keeps the same selector component in both paths, disables it only when a real material edge exists, and removes the status text. Local selection continues through the existing GraphStore callback.

## Global Material Connection and Inspector Synchronization, Phase 3F.11 (2026-09-19)

When a structural node's `material` input is connected, its shared selector now resolves the material edge and writes `materialId` to the source Material node. This preserves a single source of truth while keeping the selector active and allowing all fan-out consumers to update through the existing graph preview and store mechanisms.

## Superstructure Node Foundation, Phase 3G (2026-09-19)

`structural.superstructure` consumes existing `girderCandidate[]` references and never creates a second girder geometry source. Its domain generator computes x-axis positions, flange-based clear edge cantilevers and total structural depth for deterministic Cartesian alternatives. Invalid e <= 0 alternatives are filtered from the valid output while retaining the exact validation message and invalid count.

## BACKEND-REMEDIATION track (backend-remediation feature, 2026-10-12)

Separate remediation track approved by the engineer (plan U7); not a product milestone. Plan: docs/features/backend-remediation/plan.md. No engineering value is added or changed in this track.

### BACKEND-REMEDIATION Faz 0a+0b - Build hygiene and characterization tests

- Pinned maven-compiler-plugin 3.16.0, maven-surefire-plugin 3.5.4 and maven-resources-plugin 3.4.0 in backend/pom.xml pluginManagement (versions taken from the baseline Maven log, no dependency change).
- Added api/src/test/java/com/kopruq/api/contract/*ContractTest: endpoint inventory (21 endpoints) and happy-path snapshots (fast-solver 5-span example, seismic, wind, temperature, LM1, LandXML, terrain, alignment, layout, kernel-state, CORS preflight) plus current_* tests that pin known defects.

### BACKEND-REMEDIATION Faz 1 - Fail-closed load services

- SeismicSpectrumService rewritten readable with the SAME parameter tables; spectrumType must be exactly "Type 1"/"Type 2", groundType a single letter A-E, agR/importanceFactor finite and > 0, otherwise INVALID with no points (no silent Type 1 fallback).
- WindLoadsService: null/unknown terrain category, non-finite inputs, ze < 0 and deck width <= 0 now return INVALID (no NPE/500). Constants unchanged.
- UniformTemperatureService: non-finite values are reported in missingParameters and treated as absent.
- Tests: SeismicSpectrumServiceTest, WindLoadsServiceTest, additions to UniformTemperatureServiceTest and LoadsContractTest.

### BACKEND-REMEDIATION Faz 2 - Single error contract

- New backend/api com.kopruq.api.error: ApiExceptionHandler (@RestControllerAdvice), ApiErrorResponse {timestamp,status,error,code,message,path,correlationId,errors[]}, FieldViolation, InvalidRequestException.
- Mapping: Spring web exceptions keep their status (ResponseStatusException reason verbatim); IllegalArgumentException -> 400 INVALID_INPUT; LandXmlParseException -> 400 INVALID_LANDXML; unreadable body -> 400 MALFORMED_REQUEST_BODY; upload too large -> 413; anything else -> 500 INTERNAL_ERROR with a generic message.
- server.error.include-message=always removed (internal messages no longer leak); management.endpoints.web.exposure.include unchanged (U6 not in scope).
- LandXmlController.inspect no longer maps every RuntimeException to 400; both LandXML endpoints and TerrainController.importTerrain leave errors to the handler. Intentional changes: IAE on alternatives/layout/fast-solver 500 -> 400, malformed LandXML on /import 500 -> 400.
- Tests: ApiExceptionHandlerTest (17); the current_landxmlImportMalformed test was replaced by the fixed-behavior assertions.

### BACKEND-REMEDIATION Faz 3 - Observability

- New api CorrelationIdFilter: safe incoming X-Correlation-ID (1-64 letters, digits, hyphens) is reused, otherwise a UUID is generated; put into the SLF4J MDC, echoed as a response header and copied into ApiErrorResponse.correlationId. logging.pattern.level now prints [correlationId].
- ApiExceptionHandler logs 5xx at ERROR with the stack trace and 4xx at INFO (detail at DEBUG).
- KopruqAnalysisEngine and MidasCivilNxAnalysisEngine log a FAILED job at WARNING through System.Logger with the exception (framework-free); the FAILED message falls back to the exception class name when the exception has no message.
- Tests: CorrelationIdFilterTest (6), KopruqAnalysisEngineTest (2), a log test in MidasCivilNxAnalysisEngineTest.

### BACKEND-REMEDIATION Faz 4 - Fast Solver input safety

- FastSolverRequest numeric fields are now boxed Double (JSON names unchanged). FastSolverModelBuilder.validate collects every violation into an InvalidRequestException (400 INVALID_REQUEST with errors[].field): all fields required and finite; spans, pier heights (each element), dimensions and fck > 0; pierHeightsM size = spans - 1. sdlKnPerM and bearing stiffnesses: required + finite only, no sign/range rule.
- EurocodeConcrete rejects non-finite or fck <= 0 (IllegalArgumentException); Table 3.1 class range is NOT enforced (open engineer question).
- KopruqAnalysisEngine reports a non-finite displacement/reaction as FAILED; FastSolverController returns FAILED (not an NPE) when a node has no result.
- Tests: FastSolverModelBuilderTest, EurocodeConcreteTest additions, KopruqAnalysisEngineTest, FastSolverContractTest additions.

### BACKEND-REMEDIATION Faz 5 - Traffic / LM1 validation

- TrafficLoadsService: an empty or null tandemSystem/udl list, a null row/parameter or a null remaining-area row is NOT resolved (lm1Resolved=false + the LM1 warning) instead of vacuously true or an NPE; a CODE_DEFAULT parameter whose value differs from its codeDefaultValue adds a warning only; the narrow-carriageway (< 6 m, existing constant) warning is also given for zero generated lanes.
- LaneFactor.effectiveValue handles null ParameterValue; CarriagewayInput rejects non-finite values; TrafficLoadsController rejects a null carriageway (400). No LM1 value touched.
- Tests: TrafficLoadsServiceValidationTest (10), LoadsContractTest additions; the original four TrafficLoadsServiceTest tests are unchanged.

### BACKEND-REMEDIATION Faz 6 - Loop termination and domain invariants

- AlternativeGenerator: span/girder counters are long, span-count bounds are computed as doubles and rejected (IllegalArgumentException "cannot be represented") beyond the int range; girder depths are index-based (min + i*step, same 1e-9 inclusion and 1e-6 rounding) and a step that cannot advance (below the ULP) is rejected.
- BridgeLayoutEngine: C1 walk and span-length walk are index-based with the same advance/representable guards; span-count counter is long (no int wrap at Integer.MAX_VALUE).
- Constructors: Bridge (finite, >= 0; zero stays allowed), DesignSpace / LayoutDesignSpace / BridgeSite / NoPierZone (finite only; range rules stay where they were).
- API DTOs KernelStateRequest, LayoutGenerationRequest, NoPierZoneRequest, AlignmentSampleRequest use boxed types + FieldChecks (new, hand-written, no dependency): a missing/non-finite numeric field is a 400 INVALID_REQUEST with errors[].field instead of silently becoming 0.
- Tests: AlternativeGeneratorTerminationTest, BridgeLayoutEngineTerminationTest, BridgeInvariantTest, contract additions. Existing controller tests only had their int literals changed to double literals (assertions untouched).

### BACKEND-REMEDIATION Faz 7a - LandXML numeric robustness, no placeholders, interior-gap refusal

- LandXmlParser: alignment coordinates need >= 2 finite numbers; curve radius must be finite and > 0; PVI chainage/elevation and CircCurve length must be finite - otherwise a LandXmlParseException naming the alignment and element (HTTP 400 INVALID_LANDXML).
- A <Line>/<Curve> with missing data no longer becomes a placeholder at the origin; it is recorded in LandXmlAlignment.skipped() together with Spiral elements (position + number of kept elements before it).
- LandXmlImportService.commit refuses an alignment whose skipped element is followed by further geometry (IllegalArgumentException ALIGNMENT_INCOMPLETE: names the alignment and the position -> 400); a skipped element at the END (e.g. the trailing Spiral of the fixture) stays accepted with the existing warning.
- Tests: LandXmlParserRobustnessTest, LandXmlImportServiceGapTest, contract additions; fixture results unchanged.

### BACKEND-REMEDIATION Faz 7b - Vertical profile fails closed

- LandXmlParser: every <ProfAlign> is its own LandXmlProfile (PVIs of several profiles are never concatenated); a <CircCurve> that carries coordinates and any <ParaCurve>/<UnsymParaCurve> mark the profile unsupported; the alignment's staStart is read. The fixture shape (self-closing <CircCurve length=.../>) behaves exactly as before.
- LandXmlImportService attaches a profile only if it is single, fully understood, has no non-zero/unreadable staStart and satisfies the VerticalProfile invariants; otherwise hasProfile=false plus a coded warning (MULTIPLE_PROFILES, VERTICAL_CURVE_UNSUPPORTED, STATION_OFFSET_UNCONFIRMED, VERTICAL_PROFILE_INVALID). Terrain status is not affected by these warnings.
- VerticalProfile: PVI chainages must be finite and strictly increasing; covers(chainage) added (elevationAt unchanged). The /api/landxml/{id}/profile endpoint returns designElevationM = null outside the PVI range.
- Tests: LandXmlProfileFailClosedTest, VerticalProfileInvariantTest, contract additions.

### BACKEND-REMEDIATION Faz 7c - XYZ / terrain data integrity

- XyzTerrainParser.parseWithDiagnostics (new XyzParseResult): strips a leading BOM, skips and counts rows whose X/Y/Z is NaN or infinite (a NaN point is no longer returned), counts rows with more than three numeric columns. parse(String) keeps its signature.
- TerrainImportService.importXyzWithDiagnostics (new, returns TerrainImportResult{terrain, warnings}); importXyz keeps its signature. Status REVIEW_REQUIRED (+ warning) when the same (x,y) appears with a different z (exact comparison; first value kept, policy unchanged), when fewer than 3 distinct points or no triangle exist, or when rows have > 3 numeric columns; skipped non-finite rows are counted in the warnings.
- TerrainQueryService.getElevation returns empty for a non-finite x/y (previously NaN could be returned as an elevation).
- POST /api/terrain/import response gains status and warnings (additive); TerrainController uses the new method.
- Tests: TerrainDataIntegrityTest, contract additions.

### BACKEND-REMEDIATION Faz 8 - Analysis port and adapter contract

- FrameSolver.validate: unknown support node, duplicate node/element/material/section/elastic-link id, more than one load case and a self-weight/uniform load naming an undefined load case now throw IllegalArgumentException with a clear message (engine result: FAILED + that message). SolidRectangleSection (finite, > 0) and ElasticLinkElement (finite) validate in their constructors.
- AnalysisEngine port javadoc: getResults delivers a finished job's result once and forgets the job (KopruqAnalysisEngine and MidasCivilNxAnalysisEngine remove it); a second getResults/getStatus is an unknown-job IllegalArgumentException. MidasCivilNxAnalysisEngine.submit is synchronized (one MIDAS session).
- MidasModelBuilder refuses requests with elastic links or uniform element loads (UnsupportedOperationException -> FAILED) instead of silently dropping them; MidasResultExtractor verifies the table HEAD against the documented column list (missing/different -> MidasApiException -> FAILED). Unit verification of MIDAS tables remains open; the port vocabulary / unit question (F-06, F-14) stays deferred to P07.
- Tests: FrameSolverValidationTest, MidasAdapterContractTest; MidasCivilNxAnalysisEngineTest canned responses gained the live HEAD (fixture only, assertions unchanged).

### BACKEND-REMEDIATION Faz 9 - Architecture guard and dependency cleanup

- New api test com.kopruq.api.architecture.ModuleBoundaryTest (+ ModuleBoundaryRules): plain JUnit over the real backend/ poms and sources; only api may depend on Spring/Jakarta/Lombok, bridge-core/rules-engine/generative-engine may not reference com.kopruq.midas, a module may import only com.kopruq packages its poms (transitively) depend on, and no module may declare an unused internal dependency. The rules are tested with synthetic violations. Known allow-list: generative-engine -> rules-engine (unused, not part of the approved removals).
- Removed the three unused module dependencies: api -> midas-adapter, midas-adapter -> bridge-core, analysis-api -> bridge-core (no source referenced them). No dependency was added.
- docs/architecture.md dependency graph and module tree text rewritten to the real state.

### BACKEND-REMEDIATION Faz 10 - Layering: constructor injection, central CORS, atomic import

- New api config CoreConfiguration: the framework-free domain services (generators, engines, parsers, load services, FastSolverModelBuilder, KopruqAnalysisEngine ...) become @Bean singletons; the domain modules get no @Component. The 12 controllers receive their collaborators through the constructor (no new-built fields).
- New WebCorsConfiguration replaces the 12 identical @CrossOrigin annotations: /api/** from kopruq.cors.allowed-origins (default http://localhost:5173), methods GET/POST/HEAD, exposed header X-Correlation-ID. The preflight Access-Control-Allow-Methods header now lists GET,POST,HEAD (previously it echoed the asked method) - intentional.
- New LandXmlImportUseCase (api/landxml/application): runs the import and stores the terrain then the import record; if the second write fails the terrain is deleted again (TerrainRepository.deleteById, internal only - no endpoint) and the original failure rethrown.
- New ChainageSampler (api/alignment/application): the two existing sampling rules (overlay: strict <, default L/20; profile: inclusive <=, default L/50 + conditional end point) are moved unchanged (bit-identical, verified against copies of the old loops); the rules were NOT merged. New guard: a step that cannot advance or would need more points than an int is rejected instead of looping.
- Tests: LandXmlImportUseCaseTest, ChainageSamplerTest, ControllerLayeringTest, contract additions; AlternativeGenerationControllerTest and LayoutGenerationControllerTest only had their construction lines updated.

## BACKEND-ARCHITECTURE track (backend-architecture feature, 2026-10-12)

### BACKEND-ARCHITECTURE Faz 0 - Architecture guard tightened

- ModuleBoundaryTest pins the whole module graph (ALLOWED_INTERNAL_DEPENDENCIES, exact equality with the poms); the MIDAS import ban now covers every module except midas-adapter and api (ModuleBoundaryRules.isMidasFree). No production code changed.
- Tests added: everyModule_declaresExactlyItsAllowedInternalDependencies, scanner_flagsAnUnknownModuleAnExtraEdgeAndAMissingEdge. Total 328 tests, 0 failures, 1 skipped.

### BACKEND-ARCHITECTURE Faz 1 - api package layout: pure move (R1)

- Every api feature package got an api sub-package (controller, request/response records); 44 files moved with git mv (package/import lines only). Wind, seismic and temperature controllers moved to environmentalloads/api. config, error and observability stay in place.
- New ApiLayeringTest (rules: @RestController only in <feature>.api; application packages import no Spring/jakarta/<x>.api; feature packages hold only api/application/infra) with synthetic rule tests. Total 333 tests, 0 failures, 1 skipped.

### BACKEND-ARCHITECTURE Faz 2 - Helpers moved to their owning modules (F-13)

- ChainageSampler (+ ChainageSamplerTest) moved from api to the alignment module (com.kopruq.alignment); both sampling rules stay separate (U8). New terrain LocalCoordinates.relativePositions (used by TerrainMeshResponse and the diagnostics endpoint; TerrainBinaryWriter keeps its streaming float subtraction inline, noted in its javadoc). New TerrainModel.countBoundaries(String) and LandXmlSurface.countBoundaries(String) replace the duplicated OUTER/VOID stream counts.
- Tests added: LocalCoordinatesTest (2), TerrainModelBoundaryCountTest, LandXmlSurfaceBoundaryCountTest. Poms unchanged. Total 337 tests, 0 failures, 1 skipped.

### BACKEND-ARCHITECTURE Faz 3 - api application services; controllers only map (R2)

- New plain-Java services (beans in CoreConfiguration): alignment/application AlignmentSamplingService + AlignmentSample; landxml/application LandXmlImportQueries, LongitudinalProfileService + ProfileSample; terrain/application TerrainImportUseCase, TerrainReadService; trafficloads/application TrafficResolveUseCase + TrafficResolution. AlignmentSampleRequest.toAlignment() builds the straight alignment. AlignmentController, LandXmlController, TerrainController and TrafficLoadsController now only map HTTP to these services; the 404 ResponseStatusExceptions stay in the controllers.
- Tests added (9): AlignmentSamplingServiceTest (2), LandXmlImportQueriesTest, LongitudinalProfileServiceTest (2, characterization vs ChainageSampler.forProfile / terrain query / profile coverage), TerrainServicesTest (2), TrafficResolveUseCaseTest (2). Total 346 tests, 0 failures, 1 skipped.

### BACKEND-ARCHITECTURE Faz 4 - materials module (F-19)

- New framework-free module materials (package com.kopruq.materials, no internal dependencies). EurocodeConcrete (+ EurocodeConcreteTest) moved from analysis-api with git mv (package line only). New ConcreteStrengthClasses.characteristicStrengthMpa(String) holds the 14 strength-class identifiers and the fck parsing formerly in ConcreteMaterialController (same 404 message, thrown by the controller). api depends on materials; ModuleBoundaryTest map updated.
- Tests added: ConcreteStrengthClassesTest (2). Total 348 tests, 0 failures, 1 skipped.

### BACKEND-ARCHITECTURE Faz 5 - environmental-loads module (F-08)

- New framework-free module environmental-loads (package com.kopruq.environmentalloads, no internal dependencies). Wind, seismic-spectrum and uniform-temperature services, requests/results and TemperatureMaterialCase (10 main + 3 test files) moved from traffic-loads with git mv (package line only); traffic-loads is now EN 1991-2 only. api depends on environmental-loads; ModuleBoundaryTest map updated.
- No new tests (moved tests: WindLoadsServiceTest, SeismicSpectrumServiceTest, UniformTemperatureServiceTest). Total 348 tests, 0 failures, 1 skipped.

### BACKEND-ARCHITECTURE Faz 6 - Rule evaluation moved into generative-engine

- New generative EvaluatedAlternative / EvaluatedAlternativeGenerator (AlternativeGenerator unchanged) run every generated alternative through the RuleEngine in generation order; AlternativeGenerationController only maps (decision A1; no rule exists yet, so behavior is unchanged). generative-engine -> rules-engine is now a used edge and ModuleBoundaryTest.KNOWN_UNUSED_EDGES is empty.
- Tests added: EvaluatedAlternativeGeneratorTest (2). AlternativeGenerationControllerTest only rewires its constructor (assertions unchanged). One transient failure in the new test (random alternative ids compared by record equality) was a test-authoring error and was fixed before continuing. Total 350 tests, 0 failures, 1 skipped.

### BACKEND-ARCHITECTURE Faz 7 - Analysis port vocabulary and units (F-06 / F-14)

- analysis-api: new enums MaterialKind {CONCRETE} and LoadCaseKind {DEAD, WIND} (only values in use). AnalysisMaterial is now (id, MaterialKind kind, name, elasticModulusKnPerM2, poissonRatio, thermalCoefficientPerC, weightDensityKnPerM3, massDensityTonnesPerM3); LoadCase is (name, LoadCaseKind kind). The package documentation fixes the port unit system (m, kN, kN/m2, kN/m3, t/m3, rad, 1/degC, kN/m, kN*m/rad); MIDAS shape codes and the stale dependency-direction wording were removed from the port javadocs.
- midas-adapter: new package-private MidasVocabulary (CONCRETE -> "CONC", DEAD -> "D"; WIND -> UnsupportedOperationException, not verified against MIDAS). MidasModelBuilder uses it; its javadoc states the MIDAS session must already be in kN and m (no unit call is added; live verification is P07, together with the WIND mapping). The JSON sent to MIDAS is unchanged (MidasModelBuilderTest expected JSON untouched).
- analysis-engine FrameSolver and api FastSolverModelBuilder/FastSolverController use the new names.
- Tests added: MidasVocabularyTest (3). Six existing tests changed only in constructor arguments/imports (CONC/D/W to the enums). Poms unchanged. Total 353 tests, 0 failures, 1 skipped.

### BACKEND-ARCHITECTURE Faz 8 - model-builder module and FastSolver application service (F-05)

- New framework-free module model-builder (package com.kopruq.modelbuilder; depends on analysis-api and materials). NamedNode and FastSolverModel (renamed FrameBridgeModel) moved from api with git mv; new FrameBridgeInput (domain invariants, IllegalArgumentException), FrameBridgeModelBuilder (the portal-frame topology, body moved from FastSolverModelBuilder with the same modelling-simplification javadoc) and AppliedLoadSummary (the independent equilibrium total moved out of FastSolverController; unlike before, a non-rectangular section with self-weight throws IllegalArgumentException instead of counting 0 - not reachable via REST, decision A3).
- api: FastSolverModelBuilder keeps request validation (unchanged messages/fields) and maps to FrameBridgeInput; new fastsolver/application FastSolverService (AnalysisEngine port; bean built explicitly over KopruqAnalysisEngine in CoreConfiguration) and FastSolverOutcome; FastSolverController only maps the outcome to FastSolverResponse. api depends on model-builder; ModuleBoundaryTest map updated.
- Tests added (14): FrameBridgeModelBuilderTest (3), FrameBridgeInputTest (4), AppliedLoadSummaryTest (2), FastSolverServiceTest (5). FastSolverModelBuilderTest only changed imports and the FastSolverModel to FrameBridgeModel type name (decision A2). FastSolverContractTest snapshot (1e-9) unchanged and green. Total 367 tests, 0 failures, 1 skipped.

### BACKEND-ARCHITECTURE Faz 9 - Closing: documentation and stale comments

- Module tree, dependency graph, api package layout, rule-evaluation decision, port unit system and the P07 MIDAS notes (WIND mapping, session unit) updated above in the module/dependency sections. Stale comments fixed (SharedRepositoriesConfig javadoc, api/pom.xml). Final full build and the grep/diff acceptance checks were run (see the feature implementation report).

## BACKEND-MODULAR-MONOLITH track (backend-modular-monolith feature, 2026-10-12)

The 17 Maven modules became ONE Maven module `backend/pom.xml` (`kopruq-backend`, packaging jar) with the package layout of
`docs/architecture/backend-reference.md`. Pure move: REST paths/methods/statuses/JSON, engineering values and dependencies
are unchanged; edits in moved files are limited to package/import lines (plus package text in FQNs inside code and comments).

### BACKEND-MODULAR-MONOLITH Faz 0 - Baseline
- 367 tests, 0 failures, 0 errors, 1 skipped (BentleyProductionTerrainTest) on the 17-module build. 348 are not architecture tests.

### BACKEND-MODULAR-MONOLITH Faz 1 - One Maven module, packages unchanged
- 17 module trees moved with git mv under `backend/src`; 17 sub-poms removed; `backend/pom.xml` is the jar module with the six approved dependencies. Jar: `backend/target/kopruq-backend-0.1.0-SNAPSHOT.jar`.
- The four old architecture tests were replaced by `architecture/ArchitectureRules` + `ArchitectureTests` (21 tests, with temporary legacy tables). CLAUDE.md, README.md, start-dev.bat jar path updated. Smoke test: health UP, load-groups 200.

### BACKEND-MODULAR-MONOLITH Faz 2 - shared, entry class, test packages
- `KopruqApiApplication` is now `com.kopruq.KopruqApplication` (scan base `com.kopruq`); `api/error|config|observability` moved to `shared/exception|validation|config`; 7 contract tests to `contract/`; two package-name string edits in tests.

### BACKEND-MODULAR-MONOLITH Faz 3 - geometry (spatial-core)
- CoordinateSystem and Point3D in geometry/model. Full build green, 348 non-architecture tests.

### BACKEND-MODULAR-MONOLITH Faz 4 - alignment
- model (sealed HorizontalElement family), domain (ChainageSampler), api, application. Green, 348.

### BACKEND-MODULAR-MONOLITH Faz 5 - terrain
- model, enums, domain (XyzTerrainParser and XyzParseResult stay package-private together), application (TerrainRepository), infra, api; wildcard imports split. Green, 348.

### BACKEND-MODULAR-MONOLITH Faz 6 - landxml
- model (sealed LandXmlGeometryElement family), enums, domain, application, infra, api. Green, 348.

### BACKEND-MODULAR-MONOLITH Faz 7 - loads
- traffic-loads and environmental-loads merged into loads; the two package-info files merged. Green, 348.

### BACKEND-MODULAR-MONOLITH Faz 8 - materials
- domain (EurocodeConcrete, ConcreteStrengthClasses) and api. Green, 348.

### BACKEND-MODULAR-MONOLITH Faz 9 - layout
- bridge-layout and constraints merged into layout (NoPierZone in layout/model). Green, 348.

### BACKEND-MODULAR-MONOLITH Faz 10 - bridge
- bridge-core model/enums plus the kernel-state api. Green, 348.

### BACKEND-MODULAR-MONOLITH Faz 11 - rules
- model (results) and domain (RuleEngine, EngineeringRule). Green, 348.

### BACKEND-MODULAR-MONOLITH Faz 12 - generative
- model, domain, api (alternatives). Green, 348.

### BACKEND-MODULAR-MONOLITH Faz 13 - analysis
- analysis-api port in application, model-builder in domain, native engine in infra/nativeengine, MIDAS adapter in infra/midas, fastsolver api/application. Green, 348.

### BACKEND-MODULAR-MONOLITH Faz 14 - Final architecture tests
- Legacy tables and transition classification removed; T1 accepts only the target layout. Final greps for the old roots are empty.

### BACKEND-MODULAR-MONOLITH Faz 15 - Docs and cleanup
- This file, roadmap.md, CLAUDE.md and README.md updated; empty legacy module directories removed.
- Known, accepted difference: log category names of `KopruqAnalysisEngine`, `MidasCivilNxAnalysisEngine` and `ApiExceptionHandler` follow the new package names.

## FRONTEND-REMEDIATION track (frontend-remediation feature, 2026-10-12)

Frontend-only. No backend change, no new npm dependency, no new REST endpoint, no new engineering value. Baseline before the change: build exit 0, 26 failing vitest tests (6 files, stale tests; list in `docs/features/frontend-remediation/baseline-vitest.md`), oxlint 85 warnings / 0 errors. After: the same 26 tests fail, nothing new fails.

### Project modules (what travels in a `.kopruq` file)
`frontend/src/shared/project-file/projectModules.ts` is the single list of project-scoped, localStorage-backed data. Each module has a zod schema (`parse` throws), a tolerant `read` (corrupt or invalid storage gives `undefined`), `write` (returns false when storage rejects it) and `reset`. `write`/`reset` emit `kopruq:project-data-changed` (dirty tracking) and `kopruq:project-module-changed`; an unchanged value emits nothing, so remount-time writes do not make the project dirty. `useProjectModule(id, fallback)` is the React hook (`useSyncExternalStore`).

| Module id | localStorage key |
|---|---|
| `girderLibrary` | `kopruq.girder-library.precast` |
| `preferredSpanRules` | `kopruq.project-design-system.girder-span-rules` |
| `seismicInputs` | `kopruq.seismic` |
| `windInputs` | `kopruq.wind-load.inputs` |
| `temperatureInputs` | `kopruq.uniform-temperature.inputs` |
| `crossSectionValues` | `kopruq.superstructure.cross-section.v1` (new) |
| `selfWeightInputs` | `kopruq.loads.self-weight.v1` (new) |
| `trafficLm1` | `kopruq.loads.traffic-lm1.v1` (new; only the project override, EN defaults still come from the backend) |

- `buildProjectFile` writes all eight under `modules.<id>` (`null` = nothing stored); the existing `modules.windLoads` is unchanged. `schemaVersion` stays 1, so old files still open and old app versions ignore the new keys.
- `validateProjectFile` normalizes a missing `modules` to `{}` and validates `modules.windLoads` and every present module before anything is applied.
- `applyProjectFile` writes modules after graph and families and rolls graph, families and module storage back if any step fails. A module that is absent from the file is reset (like New Project) and returned in `missingModules`; the app tells the user which data the file did not contain (decision D-1). `null` means "was empty" and is not reported.
- Open failure after the file was read: the file reference is cleared and the project is dirty, so the next Save cannot overwrite the previous file (C-013-02). Save/Save As errors other than `AbortError` are shown to the user (C-001-01). A Recent entry opened without a file handle never inherits another file's handle (C-013-03, decision D-2).
- `useProjectFile` exposes `sessionId` (incremented on a successful Open and on New Project). `App` uses it in the `WorkspacePage` key, so panels that read storage on mount are rebuilt for the new project. Open and New also clear family snapshots and recorded graph runs. New Project no longer leaves the project dirty because of the persistence effects that run after the reset.

Self Weight, Traffic LM1, Cross Section, Seismic, Wind and Temperature inputs and the Preferred Span rules now live in these modules, so they survive tab and workspace changes, page refresh and project switching. Preferred Span rules of variants that are temporarily missing are kept (shown as a count) and return unchanged. The Project Dashboard is read-only and shows the project's own name, country, status and last update (decision D-4); the former hard-coded sample project is gone.

### Wind, Seismic, Temperature, LM1
- Wind snapshot carries the real inputs `{vb, terrain, ze, deckWidthM, drefM}`; STALE = snapshot inputs differ from the current inputs or deck width. While STALE the previous result is not shown: Summary values, Details result rows and the previous INVALID warning are hidden, Details shows the current inputs and Status `STALE`. The snapshot is kept; when the inputs return to the snapshot's inputs the result is shown again (editing never changes the snapshot, only Calculate does). `status !== VALID` shows the backend `missing` text and a dash instead of zeros; HTTP errors show the backend message.
- Seismic and Temperature use TanStack Query hooks (`loads/hooks/useSeismicSpectrum.ts`, `useUniformTemperature.ts`) whose query key is the input, so the result on screen always belongs to the inputs on screen. Emptying an input clears the result and sends no request. INVALID results show `INVALID` (Temperature lists `missingParameters`) instead of zero or partial values; errors are shown.
- LM1 alpha uses a text buffer: Enter/blur commits a finite number as `PROJECT_OVERRIDE`; empty or invalid text is flagged (`aria-invalid`) and not committed; a per-row "EN default" button restores the backend default value and provenance. No range limit is applied (Q4: none given).

### Graph freshness
- `graphFingerprint(graph, units)` includes the normalized project units; `nodeRunValidity` fingerprints the node, everything upstream, the incoming connections and the units. A changed upstream parameter, a rewired connection or a changed project unit invalidates the downstream node and the graph run.
- A dirty graph shows no previous run states, errors, resolved inputs or outputs (`graph/ui/executionDisplay.ts`).
- `publishFamilySnapshots` replaces all snapshots of the graph (deleted nodes leave nothing); `markFamilySnapshotsStale` emits `kopruq:family-snapshots-changed`; a run that finishes after the graph or units changed is published as STALE. `FamilyResultsViewer` shows a freshness badge per source and a "not current" note for STALE/FAILED/INCOMPLETE. Freshness is also derived at read time (G2 / C-006-04): the viewer compares each snapshot's `graphFingerprint` with the fingerprint of the in-memory graph store graph and the App `project.units` (`currentFreshness`, `getFamilySnapshots(bridgeId, graphId, fingerprint)`), so a unit or graph change made while the Graph screen is not mounted shows STALE. A stored STALE/FAILED is never upgraded; the store itself is not mutated by the derivation.
- Inspector candidate status (G2 / C-007-04): the FAMILY section counts "Valid" from the candidates' own `validationStatus` (or `validation.status`; no status counts as valid, same rule as the Family tables, shared as `isCandidateValid`). The Validation summary is `VALID` only when all candidates are valid, otherwise the most severe candidate status (INVALID/ERROR > INCOMPLETE > other); a preview exception is shown as a message and gives `FAILED` when there are no candidates; an unknown Invalid count is shown as a dash. Candidate generation and graph validity are unchanged.
- Migration: the fingerprint format changed, so successful runs recorded earlier (`kopruq.graph.successful-runs.v1`) read as INVALID until the graph is run again (safe direction).

### Units and Family tables
- Project units are stored as unit ids (`kNm`, `C`); `normalizeUnitId` (project model) maps old display labels, including mojibake ones, and is applied when reading storage and when opening a file. `INITIAL_PROJECT.units` uses ids. The Inspector derives its source unit from the normalized id and no longer throws on a failed conversion (the input is flagged invalid and nothing is committed).
- Family table: rotational bearing stiffness (`stiffness.kr*`) is converted with the rotation unit (the translational test used to catch it first); parameter Min/Max/Step are converted from canonical to the project unit and labelled with it (`parameterRangeDisplay`). Conversion factors come from `graph/domain/quantities.ts`; no value or formula was added.

### Shared HTTP layer
`frontend/src/shared/api/http.ts` is the only place with the backend base URL. `API_BASE` is `VITE_API_BASE` when set (non-empty), otherwise the local default (decision D-5). `requestJson`, `requestBinary`, `postJson` and `postForm` check `ok` and raise `ApiError {status, code, correlationId, fieldErrors[], path}` parsed from the backend `ApiErrorResponse`; a non-JSON body gives `HTTP <status>`; `correlationId` falls back to the `X-Correlation-ID` header. `formatApiError` renders `<message> (Ref: <correlationId>)`. All services (alternatives, layout, fast solver, traffic, temperature, wind, seismic, terrain import/viewer/diagnostics, LandXML, graph materials) use it. `shared/api/formErrors.ts` puts `errors[]` entries whose field is a top-level form field onto that field (react-hook-form `setError`) and lists the rest. Terrain import shows `status` and `warnings`; `REVIEW_REQUIRED` is flagged but the terrain is still linked to the project (decision D-3).

### Not verified / not changed (needs the engineer)
Phase 5 was NOT approved and no code was changed in `graph/domain/girderCandidates.ts`, `graph/domain/pierSectionProperties.ts` or `shared/ui/generation.ts`. The following stay unverified until the engineer answers:
- Q1 (C-005-01): precast girder `Wy` is computed as `Iy / Math.max(Btf, Bbf) / 2` (= `Iy / (2*bmax)`), while the steel girder uses `Iy / (Math.max(Btf, Bbf) / 2)`. Which is correct, and the source with a numeric reference example, is not known.
- Q2 (C-006-01): oval pier `wx = modulus(ix, B)`, `wy = modulus(iy, D)` versus `ix/(D/2)`, `iy/(B/2)` for the other sections; the B/D axis convention (linked to A-03) is not confirmed.
- Q3 (C-016-01): parametric sweep generation rounds to 0.01 (`Math.round(v*100)/100`, accumulated); whether this resolution is acceptable and how duplicate values are handled is not decided.
- Q5 (out of scope): the source of wind `drefM = 3` and other unreferenced constants (A-06).

## BACKEND persistence track (PostgreSQL + JPA + Docker, 2026-10-12)

Feature `backend` (plan/implementation in `docs/features/backend/`). The backend now stores data in PostgreSQL, modelled on the reference (`docs/architecture/backend-reference.md` R6, R13, R15, R16).

- **Stack:** Spring Data JPA, Flyway (`V1__terrain_landxml.sql`, `V2__bridge_project.sql`; `ddl-auto=validate`), PostgreSQL 17 (runtime), H2 in PostgreSQL mode for tests. Connection from `DB_URL` / `DB_USERNAME` / `DB_PASSWORD` (no password default; `shared.config.DatabaseConfigurationGuard` stops startup with `Could not resolve placeholder 'DB_PASSWORD'`). `spring.jpa.open-in-view=false`. `src/test/resources/config/application.properties` points tests at H2, or at a real PostgreSQL when `KOPRUQ_TEST_DB_URL` (+ `_USERNAME`/`_PASSWORD`) is set.
- **Persisted:** `TerrainModel` (TIN vertices/triangles as little-endian binary blobs, `TinBinaryCodec`; source, boundaries and breaklines as child rows), `LandXmlImportResult` (alignment elements, vertical-profile PVIs, warnings, terrain reference) and the bridge `Project` aggregate (bridge, design space, alternatives with spans/girder/deck/pier/foundation). **Not persisted:** computed results (rule results, layouts, loads, analysis, materials) - they are recomputed from inputs so a changed rule can never leave stale engineering values looking valid. Exception (BACKEND-DB-PERSISTENCE M3b, user decision 2026-10-14): the wind calculation snapshot result is stored with the inputs it was calculated from; its validity is decided at read time by comparing the stored inputs with the current inputs (STALE hides the result), and no calculation version is stored.
- **Boundaries:** ports stay in `<domain>/application` (`TerrainRepository`, `LandXmlImportRepository`, new `bridge.application.ProjectRepository`); JPA entities, Spring Data interfaces and `Jpa*Repository` adapters live only in `<domain>/infra/persistence` and map by hand to the framework-free records (deliberate deviation from the reference, which annotates the model). Rehydration goes through the model constructors, so invariants are re-checked on read. No new controller or endpoint; the 12-controller inventory is unchanged. `Project` got an `id`; `Alignment` got `elements()`.
- **Atomic LandXML import:** `LandXmlImportUseCase` parses outside any transaction and writes terrain + import together inside a `TransactionOperations` (the old compensating `deleteById` stays as a second line of defence). The in-memory repositories moved to `src/test/java`; `SharedRepositoriesConfig` was removed.
- **Engineering safety:** no DB `DEFAULT` and no value `CHECK` on engineering columns (only structural checks); no rule, default or limit was added. `Foundation` PILE/SPREAD vs pile fields stays unconstrained (no rule exists), `Pier.pierType` stays free text.
- **Docker/dev:** `backend/Dockerfile` (Maven build stage, JRE runtime, non-root), `compose.yaml` (`postgres`, `backend`, `postgres-test` profile on tmpfs), `.env.example` (empty `DB_PASSWORD`; `.env` is git-ignored), `start-dev.bat` reads `.env`, starts PostgreSQL via Compose, then builds and starts backend and frontend. Running `java -jar` now needs `DB_PASSWORD` and a reachable PostgreSQL (CLAUDE.md "Build & test" should mention this - suggested to the engineer, not edited by the agent).
- **ArchitectureTests:** pom pinned to 11 dependencies; new T11 rule (persistence imports only in `*.infra.persistence`); T2 now forbids `jakarta.persistence` in core layers.

## FRONTEND-DATA-INTEGRITY track (2026-10-12)

Feature `frontend-data-integrity` (plan and evidence in `docs/features/frontend-data-integrity/`). Frontend only; no backend change, no new dependency, no new localStorage key, `schemaVersion` unchanged. Findings come from the frontend review `docs/reviews/2026-10-11T14-19-35Z`.

- **Atomic New / Open (C-013-02, C-001-05):** `projectFileService.ts` now has `snapshotProjectStorage` / `restoreProjectStorage` (graph, 5 family categories, module storage) and `resetProjectStorage`, which clears graph, families and modules for New Project and restores the snapshot on any failure (including a module reset that silently leaves its key behind). If the restore also fails it throws `ProjectStorageRollbackError`. `applyProjectFile` uses the same snapshot helpers. `useProjectFile.open` snapshots storage after reading the file; if any step after `applyProjectFile` fails, storage and (best effort) React state are restored, the file reference is cleared and the project stays dirty, so the next Save cannot write mixed data. `useProjectFile.detachFile()` clears the reference and marks dirty; `App.newProject` calls it on `ProjectStorageRollbackError`. `discardAndContinue` no longer clears the dirty flag before the action; successful actions clear it themselves, so a failed action after DON'T SAVE leaves the project dirty.
- **ProjectWorkspace Save (C-012-02):** Save writes only the fields edited in the current Edit session onto the current project (`editedPaths`), so unit selections (applied immediately) and other changes made meanwhile (e.g. `environment`) are not reverted. The Units note now says unit selections are not part of Edit / Save / Cancel.
- **DTM to LandXML (C-012-03):** `TerrainDtmPanel.onImported` receives `{ terrainId, landXmlImportId }` (`null` for XYZ or when the LandXML has no alignment). The LandXML path passes `projectId` and the panel's CRS label to `LandXmlImportPanel`. `BridgeDefinitionWorkspace` and `router.tsx` write both ids to the project; `router.tsx` also passes the project id and CRS label.
- **Precast candidate check (C-005-02):** `generatePrecastGirderCandidates` rejects combinations with a non-finite geometry value (counted in `invalidCombinations`; a non-finite number or quantity value no longer aborts the whole generation) and sets `validationStatus` to `INCOMPLETE` when any computed `A, Ix, Iy, Wx, Wy` is not finite, else `VALID`. Only finiteness is checked: no positivity or polygon-consistency rule exists, so a zero or negative dimension with finite properties can still be `VALID`. Graph-style names (`tf/bf/w`) still give NaN properties, so those candidates now show `INCOMPLETE` (A-05 is not fixed).
- **Assembly status (C-005-03):** abutment `ERROR` or superstructure `INVALID` gives `INVALID`; an `INCOMPLETE` component gives `INCOMPLETE`; abutment `WARNING` only adds an `A1:`/`A2:` prefixed message. Priority `INVALID > INCOMPLETE > VALID`. A2 is no longer copied from A1: if only one abutment is connected the other support has no abutment and the assembly is `INCOMPLETE` with a message naming the missing one; with none connected the behavior is unchanged.

### Open items after this track (engineer decision needed, code unchanged)
- C-005-01: precast `Wy` formula (`girderCandidates.ts` `Iy/Math.max(Btf,Bbf)/2`); source and numeric reference needed.
- C-016-01: sweep rounding and duplicate policy (`shared/ui/generation.ts`).
- A-05: Graph precast names `tf/bf/w` vs `Btf/Bbf/tw` (no alias added).
- Not planned: C-009-01 (CRS label overwritten after inspect), C-005-04, `abutmentFamilyId` not passed to Assembly, superstructure generator ignoring girder state.

## G3 track (2026-10-13)

Feature `g3` (plan and evidence in `docs/features/g3/`; review findings A-01, A-07, C-013-01, C-013-03 from `docs/reviews/2026-10-11T14-19-35Z`). Frontend only; no backend change, no new dependency, no new localStorage key, `schemaVersion` stays 1, `.kopruq` layout unchanged. No numeric range, unit or engineering rule was added: numbers are only checked to be numbers.

**One project data contract (A-01 / A-07).** `shared/project-file/projectDataContract.ts` defines `PROJECT_DATA_ENTRIES`, the single list of project-scoped localStorage data. `buildProjectFile`, `validateProjectFile`, `applyProjectFile`, `snapshotProjectStorage`, `restoreProjectStorage` and `resetProjectStorage` iterate it; the old `CATEGORIES` list and the per-section loops are gone. Family category keys exist only in `familyRepository.ts` (`FAMILY_CATEGORIES`, `familyStorageKey`). The event name is `PROJECT_DATA_CHANGED_EVENT` (`projectDataEvents.ts`).

| Entry id | File path | Storage key | Presence |
|---|---|---|---|
| `graph` | `graph` | `kopruq.graph.documents.v1` | required |
| `families.PIER` / `PIER_CAP` / `FOUNDATION` / `BEARING` / `MATERIAL` | `families.<CAT>` | `kopruq.project-design-system.<...>` (see `familyRepository.ts`) | required |
| `modules.<id>` (8 modules, `PROJECT_MODULES`) | `modules.<id>` | module key | optional, reset and reported when absent (backup `kopruq.backup.*` kept) |

`projectState`, `bridgeDefinitions` and `windLoads` stay React-owned; they are validated through `PROJECT_FILE_SESSION_SECTIONS` in the same file and applied through the `useProjectFile` setters. A parametrized test covers, per entry, the export/parse/apply round trip, the `project-data-changed` event on a changing apply, snapshot/restore and reset.

**Write paths (A-07).** `MaterialsPanel` now writes MATERIAL through `saveFamilyRecords` and only when the stored catalog differs, so a class change marks the project dirty and a remount over an up-to-date store does not. An empty catalog gets the eight default rows on first mount and the project becomes dirty once (K5). Raw key literals in other features were replaced by the owner constants (`familyStorageKey`, `PROJECT_MODULES.<id>.key`, `BRIDGE_DEFINITIONS_STORAGE_KEY`, `GRAPH_DOCUMENTS_STORAGE_KEY`, `PRECAST_GIRDER_STORAGE_KEY`).

**Record validation (C-013-01).** The whole file is rejected if any record is invalid (K1); nothing is imported and storage, React state, the file reference and the dirty flag stay as they were (validation runs in `readProjectFile`, before any snapshot or apply). Error text: `Invalid project file: <path> - <message>` (first three problems listed), e.g. `projectState.bridges[2].spansM[0]`. Schemas live with the owning models: `project/model/projectStateSchema.ts`, `bridge-definition/model/schema.ts`, `family-registry/model/familySchemas.ts`, `graph/state/graphSchema.ts`; `shared/project-file/projectFileValidation.ts` holds `ProjectFileValidationError`. Rules:
- Project fields may be absent but must have the right type when present; absent ones, `environment`, `criteria`, `coordinate`, definition fields and bridge ids are filled by the existing normalizations (`normalizeProjectState`, `ensureBridgeDefinitions`, `ensureBridgeIds`) in `normalizeProjectFile` (K2a). Bridge rows must have every `BridgeRow` field; `bridgeType` and `pierShape` must be from `BRIDGE_TYPES` / `PIER_SHAPES`.
- A family record is a non-null object with a string `id`; category fields are typed when present; legacy `pierType` `H_TYPE` / `WALL` are accepted; a repeated `id` in a category rejects the file (K2b, K2c). Unknown fields pass through.
- Graph nodes (`id`, `type`, `name`, `position`, `parameters` object), connections (five strings) and groups are checked; parameter values are not. `groups` stays optional. `importGraphDocuments` keeps the shallow check on purpose so rollback of an already stored snapshot cannot fail.
- Existing error texts (`Invalid or unsupported KOPRUQ project file.`, `Missing family data: <CAT>`, `Invalid project data in file: <id>`, `Invalid wind load data in project file.`, import/reset/rollback messages) are unchanged.

**Recent identity (C-013-03).** `recentProjects.ts` `recordRecentProject(projectName, fileName, handle?, recentId?)` returns `{ id, recent }`. New records get `crypto.randomUUID()`; existing ids (= file names) stay as opaque ids, no migration (K3b). Match order: `recentId`; a stored handle for which `handle.isSameEntry` is true (awaited before any IndexedDB transaction); without a handle only a handle-less record with the same file name (a handle record is never taken over, K3a). `FileRef.recentId` is set by `open` and `save`; Save As passes none; repair and Recent open pass the selected entry id. The File menu shows `projectName` and "Erişim yok" next to same-named records (K3c). IndexedDB name/version/keyPath and `kopruq.recent-projects.metadata.v1` are unchanged.

**Decisions K1-K5:** K1 reject the whole file; K2 a/b/c as above; K3 a/b/c as above; K4 `schemaVersion` 1, no reader added; K5 MATERIAL first entry writes once and marks dirty once.

**Flagged, not part of G3:** A-02 (definitions keyed by `no`; `ensureBridgeDefinitions` drops definitions without a bridge and non-positive spans on open, now immediately on Open rather than at next reload), C-012-09 (duplicate/negative `no`), A-08 (`shared/project-file` imports from `features`), `windLoads` only in React state, raw reads (`registry.ts` `readArray`/bridge definitions, `BridgeDefinitionWorkspace.tsx`, `SystemAssemblyPanel.tsx`, `PreferredSpanPanel.tsx`, `FamilyTablesWorkspace.tsx` dead screen, `graphStore.ts` readDocuments), other `kopruq:*-catalog-changed` events, normal Open still without a `showOpenFilePicker` handle, a file opened once with and once without a handle shows two Recent rows.

## G4 track (2026-10-13)

Feature `g4` (plan and evidence in `docs/features/g4/`; review findings A-04, A-08, A-11, A-12, A-13, A-14, A-15, A-16 from `docs/reviews/2026-10-11T14-19-35Z`). Frontend only; no backend change, no new dependency, no `package.json` change, no localStorage key or `.kopruq` change. Decisions K1-K9 are recorded in `docs/features/g4/plan.md` section 9.

| Finding | Status after g4 |
|---|---|
| A-04 preview vs Run | Fixed. `NodeDefinition.preview` shares the executor's compute core (pier, pier cap and foundation split `compute(node, inputs, material)`; the other preview-capable nodes reuse the executor). `previewDesignOutput` delegates to it and `reactFlowAdapter` derives "has a preview" from the registry. Approved behaviour changes: D1 (girder preview uses the same span unit conversion and parameter semantics as Run) and D2 (abutment preview reads the real fields and connected inputs; no `error` state before Run). Material is still not resolved in the preview (D3). The superstructure preview also returns an empty candidates list when no girder is connected (instead of validating the length inputs); Run still validates them. `structural.assembly` has no preview. |
| A-08 layer rules | Enforced by `src/test/architecture/layerRules.test.ts` (R1, R2, R4; R3 counted only). `WorkspaceLayout` moved to `shared/ui`, `generateValues`/`Dimension` to `shared/lib/parameterSweep.ts`. `shared/project-file/*` -> `features/*` edges stay in an explicit allow-list (23 edges) until `project-file` is split (proposed feature g5). |
| A-11 docs | `frontend/README.md`, the `index.css` theme comment, this file and `roadmap.md` updated. |
| A-12 strict | `strict: true` set in `tsconfig.app.json` and `tsconfig.node.json`. TypeScript 6.0 already defaults `strict` to true, so every flag measured 0 errors before and after; no source change was needed. |
| A-13 dead code | `FamilyTablesWorkspace.tsx`, `pages/home/HomePanel.tsx`, `app/layout/Sidebar.tsx`, `app/layout/TopBar.tsx` and `features/layout-design-space/` deleted after a per-file reference search. `router.tsx` legacy branches, `summary` state and `void setCrossSectionValues` are kept (K2). |
| A-14 CSS | `app/styles/App.css` is now 17 ordered `@import`s of byte-identical slices `app/styles/app/NN-*.css`. Concatenation equals the old file byte for byte; the built CSS hash is unchanged; `!important` lines unchanged (596). |
| A-15 encoding | Mojibake repaired to UTF-8; `.editorconfig` (`charset = utf-8`) and `sourceEncoding.test.ts` added. The legacy unit-label matchers in `project/model/projectWorkspace.ts` (and its test) intentionally keep their spellings. |
| A-16 diagnostics | `vitest-errors*.txt` ignored in `frontend/.gitignore`; `AGENTS.md` calls it a stale local artifact. The file was untracked by the engineer (`git rm --cached`; staged deletion, file kept on disk). |

**Graph nodes as the code does them (engineer approval not documented, H-01):** Abutment (`structural.abutment`) generates abutment candidates from geometry inputs, a seismic gap value and optional connected girder, superstructure and bearing candidates; Span Arrangement (`structural.span_arrangement`) generates span arrangements from bridge length, span count or count range, span length range and increment within a generation limit; Assembly (`structural.assembly`) selects the first connected candidate of each family and resolves a bridge assembly from the span list. Their default values and thresholds are not engineering-approved (see E3).

**Open engineering items (code unchanged, engineer decision needed):**
- E1 (A-03): (a) Pier B/D direction: the graph node labels B "Longitudinal Length" while the pier family says "B = Transverse"; proposal is to follow `AGENTS.md` and this file's "B transverse". (b) Foundation Lx/Ly rounding `toFixed(10)` (family) vs `toPrecision(12)` (graph). (c) The 0.01 rounding in parameter sweeps (H-03).
- E2 (A-05): precast geometry key names `tf/bf/w` (registry) vs `Btf/Bbf/tw` (candidate generator); where the mapping belongs, together with the C-005-01 Wy formula approval.
- E3 (A-06): sources, clauses and validation examples needed for the seismic block thresholds (0.20 m, 0.30 m), `seiU` 0.03 m, abutment defaults `[1,1,1,3,5,1,2,18]` m, structural steel E = 210000 MPa, nu = 0.3, rho = 7.85 t/m3, gamma = 76.98 kN/m3, `WIND_DREF_M = 3`, xi = 5 %, eta = 1.00, and the intent of `Math.min(x, x)` in `abutmentCandidates.ts`.
- E4 (A-10): should the girder library be stored in metres (needs a migration) and is the `PG-H160` id format to be kept.

**Not changed (listed in the plan):** A-02 (`no` -> `id`), `shared/project-file` split (g5), barrel rule R3, `!important` reduction and distributing CSS to features, the `nodeRegistry.ts` split into `definitions/*`, other hand-maintained visual lists, `app/router.tsx` legacy branches. `AGENTS.md` lines about "working tree changes" are stale but were not edited.

**Manual Chromium checks still to do:** the abutment node is not red before Run; in a `mm` project the girder Inspector shows correct span values; Family, Graph and Project screens look the same after the CSS split; `-`, `middle dot` and `ellipsis` characters render correctly.

## G5 track (2026-10-13)

Feature `g5` (plan and evidence in `docs/features/g5/`; review finding A-08b, the `shared/project-file` split proposed by g4). Frontend only; no backend change, no new dependency, no `package.json` or CSS change. No localStorage key, backup key, event name, `.kopruq` layout, `schemaVersion` or module order changed.

**Ownership after g5**

| Piece | Location |
|---|---|
| Events, validation (unchanged files) | `shared/project-file/projectDataEvents.ts`, `projectFileValidation.ts` |
| Generic localStorage module (`createProjectModule`, `PROJECT_MODULE_CHANGED_EVENT`) | `shared/project-file/projectModuleStore.ts` |
| Generic hook `useProjectModule(module, fallback)` (takes a module object, not a string id) | `shared/project-file/useProjectModule.ts` |
| `girderLibrary` (custom write/reset -> `savePrecastGirderDefinition`) | `features/family-registry/model/girderLibraryProjectModule.ts` (barrel `index.ts`) |
| `preferredSpanRules` | `features/preferred-span/model/preferredSpanRulesProjectModule.ts` (exported from the barrel) |
| `seismicInputs`, `windInputs`, `temperatureInputs`, `selfWeightInputs`, `trafficLm1` | `features/loads/model/loadsProjectModules.ts` |
| `WindResult`, `WindCalculationSnapshot` | `features/loads/model/windTypes.ts` |
| `crossSectionValues` | `features/superstructure-families/model/crossSectionProjectModule.ts` |
| Central registry (`PROJECT_MODULES`, `PROJECT_MODULE_IDS`, `PROJECT_MODULE_LABELS`) holding the same module instances | `app/project-file/projectModules.ts` |
| Contract, service, `useProjectFile`, recent projects, fixtures, `ProjectFile` type and their tests | `app/project-file/` |

Old -> new: `shared/project-file/{projectModules, projectFileTypes, projectDataContract, projectFileService, useProjectFile, recentProjects, projectFileFixtures}.ts` and their tests moved to `app/project-file/` (`projectModules.ts` split as above, `projectFileTypes.ts` lost the wind types).

**Layer rules before -> after:** R1 23 -> 0, R2 0 -> 0, R4 0 -> 0, R3 90 -> 90. `ALLOWED_VIOLATIONS` in `layerRules.test.ts` is now empty. Features never import `app/` or the registry.

## Bridge Definition stable identity fix (2026-10-13)

Bridge Definition records, their `bridgeId` and `selectedBridgeId`, and the workspace selector now use the persistent `BridgeRow.id`. Editing the display `no` preserves spans, support axes, family assignments, construction data and the selected bridge. Graph identity already uses this same ID.

Legacy number-keyed localStorage and `.kopruq` definitions are migrated by `ensureBridgeDefinitions` after project bridge IDs have been normalized. The optional `keyBy: "bridgeId"` discriminator identifies converted records; once converted, lookup never falls back to a display number. This prevents number reuse or swaps from transferring assignments to a different bridge. The localStorage key and top-level file `schemaVersion: 1` remain unchanged; new files include the discriminator. This supports opening old files in the updated app, not opening newly saved files in older app builds. Family deletion messages resolve the stable reference to the current bridge number for display.

Verification: 88 frontend test files / 861 tests passed, including legacy migration, UI renumbering and reload, number swaps, replacement bridge isolation, file save/reopen and reference labels. Production build passed; lint exited 0 with existing warnings. Historical G3/G4 scope notes above remain unchanged. Previously discarded assignments cannot be reconstructed by this migration.

## A-05 Precast geometry contract (2026-10-13)

The Graph precast node keeps its persisted `tf/bf/w` parameters and input port names. `graph/domain/precastGeometry.ts` defines one canonical candidate geometry (`H/Btf/Bbf/tw/th1/bh1/bh2/th2`) and maps legacy names at candidate generation. Precast candidate geometry and section properties now use canonical names; preview and Run share the same generator. Existing Graph input order still determines candidate IDs, preserving IDs for saved nodes. Superstructure and abutment calculations, Graph schematics, and Family tables read canonical names with legacy candidate fallback. The Family technical preview uses the same mapping. This repairs A-05 without changing graph document shape, units, engineering limits or the pending C-005-01 `Wy` formula decision. Historical E2 notes above describe the earlier state.

Regression coverage exercises legacy node inputs, finite candidate properties, metre/millimetre preview parity, superstructure clearance, abutment geometry, Graph schematics and Family dimension columns. The four recorded precast executor golden hashes were updated for the intended candidate payload change.

## BACKEND-DB-PERSISTENCE M1 (2026-10-13)

Backend-only first step of storing projects in the database (plan: `docs/features/backend-db-persistence-m1/plan.md`). The frontend is not changed.

**Schema (Flyway `V3__project_workspace.sql`).** `project` gets `revision BIGINT NOT NULL` (domain revision) and `updated_utc TIMESTAMP WITH TIME ZONE NOT NULL`; existing rows are back-filled with `revision = 0`, `updated_utc = created_utc`. The V2 `row_version` stays the technical optimistic-lock counter and is not the revision. New tables: `project_info` (one row per project, 0..1; the project name is only in `project.project_name`; `project_code` holds the form's project id), `project_bridge_row` (ordered by `ordinal`, `UNIQUE (project_id, row_id)`, enums stored by constant name, `has_girder_depths` tells a null depth list from an empty one) with `project_bridge_row_span` and `project_bridge_row_girder_depth`. Same principles as V1/V2: no DEFAULT values, no engineering CHECKs, units in column names (`_m`, `_cm`), user-entered text stored as given.

**Revision rule.** `Project.requireRevision(expected)` throws `RevisionConflictException` (409 `PROJECT_REVISION_CONFLICT`) on a mismatch; `recordChange(now)` raises the revision by one and sets `updated_utc`. `ProjectService.replace` runs in one transaction: load with a pessimistic write lock, check the revision (nothing is written on a conflict), replace the section, rename the project from the workspace, record the change, save. A missing project is `ResourceNotFoundException` (404 `PROJECT_NOT_FOUND`). Timestamps are truncated to microseconds; a `Clock` bean is injected.

**Model and ports.** `ProjectSection` (sealed; M1 permits only `ProjectWorkspace`), `ProjectWorkspace(ProjectInfo, List<BridgeInventoryRow>)`, enums `BridgeInventoryType` and `InventoryPierShape` (JSON uses the frontend display labels). Only structural checks: fields present, numbers finite, ids non-blank and unique, labels known. No engineering range, default or unit conversion. Ports `ProjectRepository` (+ `findByIdForUpdate`, `findSummaries`) and `ProjectContentRepository`; JPA adapters in `bridge.infra.persistence`; rows are replaced by delete, `flush`, insert.

**API (4 endpoints, the approved total is now 25).** `GET /api/projects` (newest change first), `POST /api/projects` (201 + `Location`, body `{"workspace": ...}`), `GET /api/projects/{projectId}` (`{projectId, revision, createdAt, updatedAt, workspace}`), `PUT /api/projects/{projectId}/workspace` (body `{"expectedRevision": n, "value": ...}`). Request bodies are read by `ProjectRequestReader`, which rejects unknown fields with their path (`INVALID_REQUEST`, "is not a known field"); the global Jackson configuration is unchanged, so the older endpoints still ignore unknown fields. `ProjectWorkspaceMapper` collects all field violations with paths (`value.bridges[0].spansM[1]`). CORS now allows `PUT` (`GET,POST,PUT,HEAD`); `DELETE` stays closed. `ArchitectureTests` now expects 13 `@RestController`s; `bridge` domain edges are unchanged.

**Not in M1.** Bridge definitions, families, girder library, preferred span, cross section, loads and graph (M2/M3), the frontend client and migration (M4/M5), project deletion, authentication.

## BACKEND-DB-PERSISTENCE M2 (2026-10-13)

Backend-only second step: the design-system sections of a stored project (plan: `docs/features/backend-db-persistence-m2/plan.md`). The frontend is not changed.

**Schema (Flyway `V4__project_design_system.sql`).** `project_section_presence` (one row per written list section, `UNIQUE (project_id, section_key)`): a written empty list reads back as `[]`, a never-written (or cleared) section as `null`. `bridge_definition` (`UNIQUE (project_id, definition_key)`) with `bridge_definition_span`, `_axis`, `_axis_assignment`, `_constraint`; `family_pier` (+ `_dimension`, `_configuration`), `family_pier_cap`, `family_foundation`, `family_bearing`, `family_material` (each `UNIQUE (project_id, family_id | assignment_id)`); `girder_library` (+ `_dimension`) and `cross_section` (one row per project); `preferred_span_rule` (no UNIQUE on the rule id: the frontend does not guarantee it). Rule objects (`min`/`max`/`delta`) are inline columns with a `*_present` flag, so "rule with all values null" differs from "no rule"; `has_dimensions`, `has_allowed_configurations`, `has_girder_dimensions`-style flags keep null and `[]` apart. Units only where the frontend field or UI label states them: `_m`, `_mm` (bearings), `skew_degrees`; a sweep dimension's unit is only in its label. No DEFAULT, no engineering CHECK, no unit conversion.

**Endpoints (9 new `PUT`, total 34; controllers 14).** `ProjectDesignSystemController`: `/api/projects/{projectId}/bridge-definitions`, `/families/piers`, `/families/pier-caps`, `/families/foundations`, `/families/bearings`, `/families/materials`, `/girder-library`, `/preferred-span-rules`, `/cross-section`. Body `{"expectedRevision": n, "value": ...}`; the whole section is replaced in one transaction through `ProjectService.replace` (409 `PROJECT_REVISION_CONFLICT` on a stale revision, 404 `PROJECT_NOT_FOUND`); every successful write raises the revision by one. The girder library, preferred span rules and cross section accept `"value": null` to clear the section (the frontend's reset); families and bridge definitions require a value. Unknown fields (including UI-only state such as `selectedBridgeId`, `keyBy`, `selectedAxisId`, `viewMode`, `terrainVisible`) are rejected with `INVALID_REQUEST`.

**Document.** `GET /api/projects/{id}` and the `POST` 201 body keep the five M1 keys and append `bridgeDefinitions` (`{definitions: [...]}`), `families` (`{piers, pierCaps, foundations, bearings, materials}`, always an object, each member null until written), `girderLibrary`, `preferredSpanRules`, `crossSection`. Optional family fields that were not sent read back as explicit `null`; an object with all-null parts stays an object.

**Enums** (stored and exchanged by constant name): `BridgeAxisType` (ABUTMENT, PIER), `ConstraintKind` (ROAD_RAILWAY, RIVER, CLEARANCE, UTILITY, ENVIRONMENT, OTHER), `PierFamilyType` (RECTANGULAR, CIRCULAR, OVAL, BOX, H_SECTION, H_TYPE, WALL), `PierCapType` (RECTANGULAR, T_CAP), `PierCapConfiguration` (SINGLE_COLUMN, TWO_COLUMNS), `FoundationFamilyType` (SHALLOW, PILED), `BearingFamilyType` (ELASTOMERIC). Free-text fields (allowed configurations, superstructure type, source, ...) stay strings.

**Checks.** Structural only: field present, number finite, enum known, id non-blank and unique (family ids per catalog, `definitionKey`, `axisAssignments[].axisId`). Negative values, zero and `min > max` are accepted and stored unchanged; `definitionKey` and `bridgeId` may differ. Axis ids, constraint ids and preferred span ids are not forced unique. Storage: whole-section delete, `flush`, insert (`DesignSystemContentStore`); bridge definition, pier family and girder library child lists are LAZY and read inside the repository transaction.

**Not in M2.** Loads, graph (M3), the frontend client and migration (M4/M5), row-level CRUD, project deletion, authentication.

## BACKEND-DB-PERSISTENCE M3 (2026-10-13)

Backend-only third step: the load inputs and the graph documents of a stored project (plan: `docs/features/backend-db-persistence-m3/plan.md`). The frontend is not changed.

**Schema (Flyway `V5__project_loads_graph.sql`).** 1:1 tables keyed by `project_id` (a missing row reads back as `null`): `load_seismic_input` (`a`, `g`, `t`, `i`), `load_wind_input` (`vb`, `terrain`, `ze`), `load_temperature_input` (`min`, `max`, `t0`), `load_self_weight_input` (16 `DOUBLE PRECISION` columns; units only where the frontend field name states them: `_m`, `_kn_m3`, `_kn_m`; counts unitless) and `load_wind_snapshot` (inputs only, `deck_width_m`, `dref_m`; the calculated wind result is never stored - superseded by M3b (V6): the result is stored). The string load inputs are `VARCHAR` exactly as typed; nothing is interpreted. `load_traffic_lm1_factor` (surrogate id, `factor_group` TANDEM_SYSTEM / UDL / REMAINING_AREA_UDL, `factor_index`, `UNIQUE (project_id, factor_group, factor_index)`): a written section has a `project_section_presence` row (`TRAFFIC_LM1`) and exactly one REMAINING_AREA_UDL row; the units depend on the group (kN or kN/m2, adjustment unitless) so they are documented in the SQL comment, not in column names. Graphs: `graph_document` (`UNIQUE (project_id, graph_id)`, `ordinal`, `owner_project_id` / `owner_bridge_id` nullable, `has_groups`), `graph_node` (`UNIQUE (graph_document_id, node_id)`), `graph_node_parameter` (`value_kind` + `number_value` / `boolean_value` / `string_value`, `UNIQUE (graph_node_id, parameter_key)`), `graph_node_parameter_item`, `graph_connection` (`UNIQUE (graph_document_id, connection_id)`), `graph_group` (group id is not unique) and `graph_group_node`. Node references are client strings, so they have no database FK. No DEFAULT, no engineering CHECK, no unit conversion.

**Endpoints (7 new `PUT`, total 41; controllers 16).** `ProjectLoadInputController`: `/api/projects/{projectId}/loads/seismic`, `/wind`, `/temperature`, `/self-weight`, `/traffic-lm1`, `/wind-snapshot`. `ProjectGraphController`: `PUT /api/projects/{projectId}/graphs/{graphId}`. Body `{"expectedRevision": n, "value": ...}`; same revision rules and error codes as M2 (`SectionPutFlow` is the one shared write flow, M2 behaviour unchanged). All six load sections accept `"value": null` to clear (the frontend reset); a missing `value` key is 400 `value is required`. A graph is upserted by id: an existing graph keeps its position and is replaced whole, a new one is appended; `value` must not be null (no delete) and `value.id` must equal the path `graphId`.

**Document.** `GET /api/projects/{id}` and the `POST` 201 body append `loads` (always an object: `seismic`, `wind`, `temperature`, `selfWeight`, `trafficLm1`, `windSnapshot`, each `null` until written) and `graphs` (always an array, in creation order, `[]` when none). The first ten keys are unchanged. `activeGraphId` is UI-only and appears nowhere (sending it is 400).

**Shapes.** The wind snapshot is `{schemaVersion, status, inputs}`: `schemaVersion` must be 1, `status` is optional (reads back `null`), a `result` field is rejected as not a known field - superseded by M3b: `result` is accepted and stored. A graph parameter is `{key, kind, value}` with `kind` in NUMBER, BOOLEAN, STRING, NUMBER_ARRAY and a JSON value of the matching type (`[]` allowed for NUMBER_ARRAY; `null` is rejected). LM1 `provenance` is CODE_DEFAULT, NATIONAL_ANNEX or PROJECT_OVERRIDE (`bridge.enums.ParameterProvenance`; the `loads` domain keeps its own enum, `bridge` does not import it); `value` and `codeDefaultValue` may be `null`. `groups` and the owner ids of a graph are optional; `groups: null` and `[]` read back as written.

**Checks.** Structural only. Graph: unique non-blank node ids, unique non-blank connection ids, unique parameter keys per node (the empty key is legal), every connection end and every group member refers to a node of the same graph, `schemaVersion` 1. Not checked: port ids and node types (no registry copy), group id uniqueness (the frontend can repeat it), `bridgeId` across graphs, LM1 labels. Negative or zero self-weight values, non-numeric string inputs, any ground type and negative LM1 values are accepted and stored unchanged. Storage: whole-section delete, `flush`, insert (`LoadInputContentStore`); graph upsert in `GraphContentStore`; the graph child collections are LAZY and read inside the repository transaction.

**Not in M3.** The frontend client and migration (M4/M5), graph deletion, the calculated results (`windLoads.result` (stored since M3b), graph run validity), `activeGraphId`, project deletion, authentication.


## BACKEND-DB-PERSISTENCE M4 (2026-10-13)

Frontend-only fourth step: the client infrastructure for the server-side project store (plan: `docs/features/backend-db-persistence-m4/plan.md`). It is not connected to any component, hook or store yet: no UI or behaviour change, `localStorage`, IndexedDB and `.kopruq` are untouched, the backend is not changed, no dependency is added. Wiring and migration are M5.

**Layers.**
- `shared/api/http.ts` gains `putJson` (PUT with a JSON body, same error mapping as `postJson`).
- `shared/project-store/` is generic and imports neither `features/` nor `app/`: `projectApi` (typed `listProjects`, `createProject`, `getProjectDocument`, `putSection`), `projectDataValidation` (`parseProjectData`, `ProjectDataValidationError`, `WireMappingError`), `projectSession` (project id, revision, save status; stable snapshot for `useSyncExternalStore`), `writeQueue`, `serverSection` (`createServerSection`, `createServerSectionCollection`).
- Seven feature mappers next to the models they map (each: strict zod response schema, `toWire`, `fromWire`, `SectionDefinition`): `features/project/model/projectWorkspaceWire`, `features/bridge-definition/model/bridgeDefinitionWire`, `features/family-registry/model/familyWire` (five catalogs and the girder library), `features/preferred-span/model/preferredSpanWire`, `features/superstructure-families/model/crossSectionWire`, `features/loads/model/loadsWire` (six sections), `features/graph/state/graphWire` (graph collection). The section paths live in the feature definitions so that M5 can build the `ServerSection` where the feature module is created (`app` is not importable from `features`).
- `app/project-session/projectDocument.ts` joins the seven features: `projectDocumentSchema` (12 keys, backend order), the pure all-or-nothing `loadProjectDocument(json)`, `PROJECT_SECTION_DEFINITIONS` (the 16 static PUT paths), `GRAPH_COLLECTION_DEFINITION`, `createProjectRequestBody`. `projectDocumentFixtures.ts` holds the hand-written canonical and new-project documents used as the contract fixture.

**Decisions.**
- D2 Response schemas are strict: an unknown key, unknown enum value or wrong type rejects the document or response with the full path (`Invalid project data: <path> - <message>`, first 3 issues then `(+N more)`). The backend is the same repository and version, so additive drift is deliberately loud. The canonical fixture is not derived from the Java DTOs: on a DTO change the fixture and the mapper are updated by hand.
- D3 `toWire` is pure and builds only the DTO fields in the DTO record order, with an explicit `null` for an absent optional value. UI-only and passthrough fields are dropped. There is no local range, finite or unit check: the server is the only authority. `WireMappingError` (`Cannot send project data: <path> - <message>`) is thrown only for what cannot be represented: a bridge row without a (non-blank) id, a bridge definition store without `keyBy: 'bridgeId'`, a blank `definitionKey` or axis assignment `axisId`, a family record without an id or with a blank id, a foundation (shallow or piled) generation rule that is missing, a graph parameter that is not a number, boolean, string or number array, a duplicate graph id in one write, a graph deletion, and `undefined` written to a section that cannot be cleared.
- D4 `fromWire` keeps a TypeScript-nullable field as `null`; an optional field that is `null` on the wire is left out of the record; a section that is `null` is `undefined`.
- D5 The workspace is read through `normalizeProjectState` (only `normalizeUnitId` has an effect); bridge definitions are not reconciled with the workspace (`ensureBridgeDefinitions` stays the caller's decision).
- D7 One serial write queue per project: at most one request in flight, entries coalesced per section path (an unsent entry takes the newest value and keeps its queue position), trailing debounce `SAVE_DEBOUNCE_MS = 300` (a software parameter, injectable), `expectedRevision` taken at send time and chained from every 200. 409 -> `conflict`; 400/422 or a local `WireMappingError` -> `rejected`; network failure, 404, 5xx and an invalid 200 envelope or value -> `error`. In all three the queue stops, new writes are collected but not sent; there is no automatic retry or merge. `retry()`, `discard()`, `flush()` and `reset()` are the explicit exits. Review-repair semantics: (a) there is at most one entry per key; when a failed in-flight entry meets a newer write of the same key only the newer one is kept (moved to the head, so `failedKey` stays first) and `pendingKeys()`/`pendingCount` never count a key twice. (b) Held failures: a stalled queue keeps every failure it saw (one per key, a newer failure of the same key replaces the older one in place). The session shows the `conflict` if there is one, otherwise the oldest held failure; a 409 is sticky (`drop` never clears it, `retry()` keeps rejecting without a request) and a local rejection is not erased by a later network error. A masked failure is not lost: `drop(key)` clears only the non-conflict failures of that key and the queue resumes only when no failure is left (otherwise it stays stalled with the remaining one, no automatic resend); `retry()`, `discard()` and `reset()` clear all of them. (c) `drop(key)` removes the unsent entry of one key without a callback; `ServerSection.discard()` and the collection `discard()` call it. `queue.discard()` drops every unsent entry AND reverts the mirror of the entry in flight (`onDiscarded` runs in-flight first, then queue order) before it publishes the new status; the request itself cannot be cancelled. A request in flight that was discarded/dropped is not requeued if it fails; a 409 still reports a sticky `conflict`, an invalid response envelope still reports `error`, and an ordinary failure leaves the reverted mirror. If it succeeds the section adopts the confirmed server value (the mirror equals the server again and notifies). After a network failure the server outcome of a discarded request is unknown (it may have been committed); the next load shows it. (d) A 200 whose envelope fails strict validation but has a readable numeric `revision` still applies that revision (the write is committed), confirms the sent value and moves to `error`, so `retry()` does not hit a guaranteed 409; without a readable revision the outcome is unknown: the entry returns to the queue, or, if it was dropped/discarded in flight, it is not requeued but the queue still ends in `error` (never `idle`) and `flush()` rejects. (e) The session snapshot has a monotonic `epoch`, incremented by every `begin` and `end` (also for the same project id). The queue is bound to it: on an epoch change it resets itself (no callbacks) and ignores responses sent in the previous epoch, so `begin(sameId, newRevision)` after a 409 clears the conflict and the pending entries without a manual `reset()`. Subscription order: `enqueue` and `reportLocalRejection` synchronize the epoch before accepting work, so a session listener registered before the queue can write during `begin` without that write being dropped by the later reset. (f) `queue.dispose()` resets, unsubscribes from the session and makes later `enqueue` throw; a disposed queue no longer touches the session. A throwing `onConfirmed`/`onDiscarded` (for example a failing UI listener) is caught and logged with `console.error`; the queue goes on (status does not stay at `saving`). Session notifications also catch and log each throwing subscriber, then notify the remaining subscribers, so `publish` cannot interrupt the queue on a subscriber exception. (g) A collection reports a failing `codec.idOf` under the sentinel key `<collection id>[<index>]` instead of the previous item's path.
- D8 Each section keeps a `confirmed` and a `current` value in memory (nothing is persisted). `read()` is synchronous; a write with an unchanged wire is a no-op; writes enter the queue before mirror listeners are notified, so a listener writing again cannot be overwritten by the older write. Throwing section and collection listeners are logged individually without interrupting other listeners or the write. Section and collection `discard()` preserve newer writes made by session listeners while queue entries are dropped; a failed `enqueue` rolls back its own mirror update before rethrowing. When the server echoes the sent value the `current` reference is kept (UI-only fields such as the bridge definition selection survive).
- D9 Graphs are a collection: one `PUT graphs/<id>` per added or changed graph; removing a graph is rejected locally (the backend has no deletion). Collection `discard()` also drops its locally rejected keys, including new graph paths and sentinel keys that are not in the mirror. `hydrate()` drops tracked local rejections from the queue and clears their tracking set, even within the same session epoch.
- D10 A wind snapshot comes back without `result`; no result is invented (superseded by M3b: the result is stored and returned).

**Known lossy mappings (handled in M5).** Bridge definition UI state returns as the defaults of `createBridgeDefinition` (selected axis = first axis, PROFILE view, terrain visible) and the caller reconciles with `ensureBridgeDefinitions`; a missing nullable family field returns as `null`; family passthrough fields are not stored; the legacy girder library `[]` is stored as cleared (`null`) and reads as `undefined`; a wind snapshot has no result after reload (superseded by M3b); `-0` is stored as `0`; `girderLibraryToWire` sends any array, including a non-empty legacy array, as `null` (plan R4), so a non-empty legacy library is silently cleared on the server (mind this in the M5 migration). Unverified risk: `pathOf` percent-encodes a `/` in a graph id as `%2F`, which Tomcat may reject by default; graph ids are UUIDs in practice, so this is not exercised.

## BACKEND-DB-PERSISTENCE M5a (2026-10-14)

Preparation for the M5 frontend migration. Nothing the user sees changes; localStorage stays the only source of truth (D1) and the M4 store is not wired in. Plan: `docs/features/backend-db-persistence-m5a/`.

- **Owner functions instead of raw reads.** `registry.ts` reads MATERIAL rows through `getFamilyRecords` (keeping the non-object-row filter) and bridge references through the new `readStoredBridgeDefinitions()` (raw, un-normalized; `undefined` when storage or JSON is unreadable, compared with `=== undefined`). `PierFamiliesPanel` passes a module-level stable `PIER_FALLBACK` to `useFamilyCatalog`; the write-on-read of the fallback is unchanged and stored legacy `pierType` values are not normalized on read. `graphStore.addNode` uses the new `readProjectUnits()`. `PreferredSpanPanel` reads girder dimensions through `getPrecastGirderDefinition`.
- **Accepted difference.** `BridgeDefinitionWorkspace` and `SystemAssemblyPanel` now read preferred span rules with `PREFERRED_SPAN_RULES_MODULE.read()`, which validates with zod; an externally corrupted or partial store now reads as no rules. Valid data gives the same result.
- **Deferred.** The `kopruq:girder-catalog-changed` subscription for `PreferredSpanPanel` is not added here (it would change dirty-mark timing); it comes with the M5c removal of the `storage` listeners.
- **Pure split.** `projectWorkspaceModel.ts` holds the project types, `INITIAL_PROJECT` and the pure normalization; `projectWorkspace.ts` keeps storage and re-exports the old names. `loadsInputs.ts` holds the four load-input schemas and types; `loadsWire.ts` no longer imports `loadsProjectModules`. `sourceEncoding.test.ts` now lists `projectWorkspaceModel.ts`.
- **Test helper.** `src/test/projectStoreTestUtils.ts` (`seedProjectData`, `seedRawProjectData`, `readProjectData`, `readProjectDataText`, `resetProjectData`, `browserStorageText`) is localStorage-backed and emits no events; 13 test files and the data lines of `App.test.tsx` use it. `App.test.tsx` keeps `localStorage` only in the six recent-projects / New Project rollback tests (M5c).
- **Ratchet.** `src/test/architecture/noBrowserStorage.test.ts` allows browser-storage symbols and the `'storage'` event literal in 17 production files only (comments ignored, tests exempt); unlisted uses and stale entries fail. The list may only shrink.

## BACKEND-DB-PERSISTENCE M5b (2026-10-14)

Session layer on top of the M4 infrastructure. It exists and is tested, but was **not wired into the application** until M5c (superseded by M5c, see the M5c section below): `App.tsx`, `main.tsx`, `TopWorkspaceNav`, `UnsavedChangesModal`, every store and localStorage are unchanged, and no production file outside the layer imports it (`src/test/architecture/sessionLayerUnwired.test.ts`, deleted by M5c).

- **Singletons.** `shared/project-store/activeProject.ts` creates, in this order, 1) the session (`activeProjectSession`), 2) the write queue (`activeWriteQueue`, whose `putSection` goes through `activeProjectApi()` so `setActiveProjectApi(fake)` also works mid-session and returns the previous api) and 3) the `onProjectSwitch` subscription. The queue therefore resets before any switch listener runs. Nothing is disposed; there is no test-reset hook in production code. `useSaveStatus` is a `useSyncExternalStore` over the session.
- **`onProjectSwitch(listener)` contract.** Runs once per `begin` and `end` (also for the same project id), never for revision or status updates, synchronously inside `begin`/`end`, after the queue reset and BEFORE the sections are hydrated. A listener may only reset in-memory state: it must not read or write sections nor call `begin`/`end`/`reset`. A throwing listener is logged and does not stop the others.
- **Section instances.** `createActiveSection` / `createActiveCollection` register every instance in an insertion-ordered registry (`activeSections()`, each with `hydrateEmpty()`). One small file per feature creates its instances (`*ServerSection(s).ts`, `graphServerCollection.ts`); they import at runtime only `activeProject` and their own wire file. 16 sections + the `graphs` collection = 17 entries.
- **prepare / apply / close** (`app/project-session/projectSections.ts`). `prepareLoadedProject` is pure: it checks the workspace, reconciles `bridgeDefinitions` with `ensureBridgeDefinitions`, pre-validates every `toWire` (and each graph) and turns a `WireMappingError` into a `ProjectDataValidationError` with the section path. `applyPreparedProject` (branded type, never throws for prepared input) begins the session, hydrates the 16 sections in `PROJECT_SECTION_DEFINITIONS` order, then the graphs. `closeActiveProject` ends the session and calls `hydrateEmpty()` on every section (never `write(undefined)`, so no request).
- **Controller** (`useProjectSessionController`, needs a `QueryClientProvider`). New / Open / Reload / Exit; the URL is injected (`urlProjectId`, `setUrlProjectId`), no router import. A request counter drops answers of superseded or unmounted requests (StrictMode safe: one apply). New / Open / Exit pass a gate (`activeWriteQueue.flush()`); a failed flush sets `pendingSwitch` (retry / discard / cancel; `canRetry` is false on a 409). Invalid or missing documents never touch the open session (`actionError`, or the `load-error` phase when no project is open; 404 text "Proje bulunamadı: ..." uses `formatApiError`). After New the `['projects']` query is invalidated.
- **M5b review follow-up.** Gate retry also flushes writes restarted outside the gate before switching. Reload is restricted to conflict resolution. Superseded New responses still invalidate the project list; duplicate New requests are ignored. A URL that returns to the active project cancels a pending Open. Preparation rejects duplicate graph ids before apply.
- **M5b second review follow-up.** Cancel invalidates an in-progress gate retry, so a late PUT cannot resume the cancelled switch. New, Exit and conflict Reload restore the active project's URL before superseding an in-flight Open.
- **M5b URL and phase follow-up.** When a list Open supersedes a URL Open, the URL returns to the active session id (or null if no session). `restoredUrlRef` marks that controller-originated restoration; the URL effect consumes it once instead of cancelling the replacement Open. A genuine later URL change still runs the normal Open/cancel path. New, Exit and conflict Reload clear the superseded load phase immediately, so an old URL loading screen does not remain visible while the replacement request is in flight.
- **UI pieces** (Turkish texts, `role=dialog` + `aria-labelledby`, Escape, no focus trap like the existing modals): `ProjectListDialog` (+ `useProjectList`, enabled only while open, no retry), `NewProjectDialog`, `SaveStatusIndicator` (+ `saveStatusText.ts`), `ProjectLoadScreen`. Styles: new `styles/app/18-project-session.css` (one added `@import` at the end of `App.css`, only `.spn-session-*` selectors).
- **Test helpers.** `src/test/fakeProjectApi.ts` (in-memory api with revision chain, 409/404, request log, one-shot failures, held responses) and `src/test/projectSessionTestUtils.ts`; `projectStoreTestUtils.ts` is unchanged.
- **Deferred to M5c (superseded by M5c: done, see below).** D6 (bridge-definition UI-only layer), binding stores/components to the sections, deletion, shortcuts, `beforeunload`, the `UnsavedChangesModal` props, the router adapter for the URL.

## BACKEND-DB-PERSISTENCE M3b (2026-10-14)

Plan: `docs/features/backend-db-persistence-m3b/`. User decision 2026-10-14: the calculated wind result is stored with the inputs it was calculated from, in typed relational columns (no JSON blob), exactly as calculated. This supersedes the "result is never stored" notes of M3/M4 (marked above).

- **Flyway V6 (`V6__wind_snapshot_result.sql`).** Adds to `load_wind_snapshot`: `result_present BOOLEAN NOT NULL` (existing rows back-filled to `FALSE` with ADD COLUMN, UPDATE, SET NOT NULL as in V3), `result_status VARCHAR(16)`, ten nullable `DOUBLE PRECISION` columns (`result_z0_m`, `result_zmin_m`, `result_kr`, `result_cr`, `result_vm_m_s`, `result_turbulence_intensity`, `result_qp_kn_m2`, `result_b_over_d`, `result_cfx`, `result_transverse_kn_m`) and `result_missing VARCHAR`. Units are in the column names only where the frontend field name states them; kr, cr, turbulence intensity, b/d and cfx are unitless. No DEFAULT, no CHECK. Every ADD COLUMN is its own statement (H2 / PostgreSQL). The V5 SQL comment ("no result") stays as is because Flyway checksums forbid editing it.
- **Model.** `bridge.model.WindSnapshotResult` (status, nine finite doubles, `transverseKNm` null-or-finite, `missing` free text) and `bridge.enums.WindResultStatus { VALID, INVALID }` (the `loads` domain produces the same two texts; `bridge` does not import `loads`, so the enum is a separate copy). `WindSnapshot` is a 4-component record (`schemaVersion`, `status`, `inputs`, nullable `result`); `schemaVersion` stays 1.
- **Wire.** `{schemaVersion, status, inputs, result}`; `result` is `null` or `{status, z0M, zminM, kr, cr, vmMs, turbulenceIntensity, qpKNm2, bOverD, cfx, transverseKNm, missing}` in that order. An absent `result` key is read as `null`; responses and the project document always carry the key (explicit `null`). Content is strict: an unknown field in `result` is rejected (`value.result.<field>` is not a known field).
- **Validation is structural only.** `result.status` must be VALID or INVALID (`must be one of: VALID, INVALID`), the nine numbers are required and finite, `transverseKNm` may be null but is finite when present. There is no range, unit or consistency rule: VALID with a filled `missing`, or a top-level `status` that differs from `result.status`, is accepted.
- **Persistence.** `WindSnapshotEntity` keeps inline columns; `replaceOne` still deletes and inserts the row. On read the invariants are re-checked: `result_present = TRUE` with a null required column, or `result_present = FALSE` with any `result_*` column set, throws `IllegalStateException` (corrupt data, as the LM1 check in M3).
- **STALE semantics (documentation only, no code change).** Whether a stored result is still current is decided at read time by comparing the stored `inputs` with the current inputs (`WindLoadsPanel`, unchanged); the backend does not enforce consistency between the inputs and the result and does not clear a snapshot when the inputs change.
- **Accepted risk R2.** No calculation version is stored. If the `WindLoadsService` formulas change, a stored result for identical inputs still looks current. Adding a version later is a separate feature and needs engineer approval.
- **Frontend (M4 mapper; wired by M5c).** `loadsWire`: `windResultWireSchema` (strict, `status` enum, `transverseKNm` and `missing` nullable), `windSnapshotWireSchema.result` is required-but-nullable, `windSnapshotToWire` / `windSnapshotFromWire` carry `result` explicitly in order (`result == null` goes out as `null`, which also covers legacy data without the field); the `WindSnapshotInputsValue` type is removed and the section value is `WindCalculationSnapshot`. `projectDocument` and the canonical fixture follow. UI and `WindLoadsPanel` are unchanged.
- **Unchanged.** Controllers 16, endpoints 41 (`EndpointInventoryContractTest`); no new dependency (`pom.xml`, `package.json` untouched); V1-V5 are untouched.
- **Rollback.** Flyway only moves forward: if the code is reverted, V6 columns remain and the old entity would fail on the NOT NULL `result_present`; revert code and migration together (or add V7).

## BACKEND-DB-PERSISTENCE M5c (2026-10-14)

Plan: `docs/features/backend-db-persistence-m5c2/` (parent plan `backend-db-persistence-m5`). The one atomic switch: the frontend no longer keeps project data in the browser. `localStorage`, `sessionStorage`, `indexedDB`, the File System Access API, the cross-tab `storage` event and the whole `.kopruq` file format (save, save as, open, recent files, `RecentFileAccessModal`, `legacyStorageMigration`) are gone from production code. Old browser data and `.kopruq` files are not migrated. `backend/**`, `package.json` and the lock file are unchanged; there is no new endpoint and no new dependency.

- **Binding.** Every data store is its server section: `projectWorkspace` (`readProjectState(fallback = [])` = section value, else `INITIAL_PROJECT` with `[]`; `writeProjectState` completes bridge ids; `subscribeProjectState`; hook `features/project/hooks/useProjectState`), `familyRepository` / `useFamilyCatalog` (`read() ?? fallback`, writes through the section, the legacy `kopruq:*-catalog-changed` events are emitted from the section notifications), `graphStore` (documents = the graph collection, a placeholder graph in memory while a project has none, `commit` writes the whole list and only new or changed graphs are sent), the four project-module files (`createProjectModule(section)` is a thin view `{id, read, write, reset, subscribe}`; new `WIND_SNAPSHOT_MODULE`; `useProjectModuleValue`). `graphRunValidity`, `graphViewPreferences` and `familySnapshotStore` are in-memory and reset on `onProjectSwitch`.
- **Fallbacks, no write on read.** An unwritten section shows today's constants (`INITIAL_PROJECT`, `INITIAL_CROSS_SECTION_VALUES`, `PRECAST_DIMENSIONS`, no preferred-span rules, `WIND_DEFAULT_INPUTS` / snapshot `null`, `INITIAL_SELF_WEIGHT_INPUTS`, LM1 code defaults, `RECT-M` for piers, `INITIAL_MATERIALS`). `useFamilyCatalog` no longer writes what it reads: Pier, Pier cap, Foundation and Bearing panels send no PUT on mount (behaviour change decided with the user, Q2). Materials, Girder library and Preferred span still write once on the first visit (D9); an unchanged wire value sends nothing.
- **Pier starter draft (P3-1 follow-up).** When the Pier catalog is empty, `RECT-M` appears only as an initially disabled, incomplete draft in the Pier editor. Editing it changes local component state and sends no PUT; the editor labels it as not saved. A changed draft is tracked separately for the shell's primary-workspace and New/Open/Exit confirmation and the browser's `beforeunload` warning. Bridge Definition, System Assembly and Registry read the empty catalog. Once the draft is valid and the user selects Add Pier, a new family id and the edited name enter the shared section mirror and a PUT is queued. Other consumers see that mirror value immediately; server persistence completes when the PUT succeeds.
- **UI-only bridge state (D6).** `bridge-definition/model/store.ts` keeps `selectedBridgeId` and, per bridge, `selectedAxisId`, `selectedConstraintId`, `viewMode`, `terrainVisible` in a memory layer that `onProjectSwitch` resets without notification. `readBridgeDefinitionStore(bridges = workspace bridges)` merges section data and layer, reconciles with `ensureBridgeDefinitions` and is memoized on (section value, bridges, layer); `writeBridgeDefinitionStore` sends data to the section (one PUT only when the wire value differs) and UI fields to the layer; `useBridgeDefinitionStore` subscribes to both sections and the layer. No request body ever contains a UI-only field (`keyBy`, selections, `viewMode`, `terrainVisible`, `activeGraphId`).
- **Shell.** `App.tsx` = `AppProviders > BrowserRouter > ProjectShell`. `ProjectShell` runs `useUrlProjectId` and `useProjectSessionController`; the top nav is always visible. Phases: `welcome` (`WelcomeScreen`: New opens the name dialog, Open the project list), `loading` / `load-error` (`ProjectLoadScreen`: Tekrar dene, Proje listesi, Yeni proje), `ready` (`RoutedApplication`; the `WorkspacePage` key carries the session epoch so a new project or a reload remounts the workspace). `actionError` is a dismissible band; `pendingSwitch` opens `UnsavedChangesModal` (TEKRAR DENE / DEĞİŞİKLİKLERİ AT / İPTAL, Retry disabled for a conflict). `setBridges` writes the workspace first and then the reconciled bridge definitions (two PUTs one after the other; there is no atomicity across sections). The wind snapshot is `WIND_SNAPSHOT_MODULE`: a successful Calculate sends one `PUT loads/wind-snapshot` with the result, an input change sends only `loads/wind` and the snapshot shows STALE, a failed calculation sends nothing.
- **Router adapter contract (`useUrlProjectId`).** `urlProjectId` is the `project` query parameter of the router location. `setUrlProjectId(id)` reads the live `window.location`, does nothing when the value is already `id`, otherwise navigates to the same path, other parameters and hash with only `project` changed, with replace semantics and synchronously (the controller's `restoredUrlRef` relies on it). Workspace links and redirects keep the query string (redirects read the live address bar because the router state can be one transition behind); other `navigate()` calls that drop the parameter are repaired by the controller's "session open, URL empty" effect.
- **Nav, keys, unload.** File menu: New..., Open..., Recent (the five newest projects, name, date, short id), Exit. Ctrl+N name dialog, Ctrl+O project list, Ctrl+S `activeWriteQueue.flush()`; Save, Save As, Ctrl+Shift+S, the file input and "Erişim yok" are removed. `useBeforeUnloadWarning` warns while writes are pending or the status is `error`, `rejected` or `conflict`, never when everything is saved.
- **Non-finite wind values (m3b risk).** `windSnapshotToWire` checks that the nine result numbers, `transverseKNm` (when set) and `inputs.deckWidthM` / `drefM` are finite numbers and throws `WireMappingError('result.<field>' | 'inputs.<field>', 'must be a finite number')`. The write is then refused locally: no PUT, status `rejected` with the field path, the previous snapshot stays; Retry resumes the queue, Discard reverts everything pending. This is a structural check, not an engineering rule.
- **M5b follow-ups.** `reloadProject` returns while an unsaved-changes decision is pending (Cancel can no longer race a Reload; the nav "Yeniden yükle" button is also disabled then). `ProjectListDialog` focuses its dialog element on open (also while busy); Escape closes once it is not busy. The shell locks its two dialogs only while a decision is pending, so a list Open can supersede a running URL Open. YB1 / YB2 / YB3 were already fixed in M5b; M5c adds the integration tests with the real router adapter.
- **Tests.** The global `src/test/setup.ts` opens a new project on a fake API before every test and resets it afterwards (`projectStoreTestUtils` now hydrates and reads the section mirrors, adds `loads.windSnapshot`; the raw-text helpers are gone); suites of the session layer and the Welcome flow start from a closed project. New: `AppSession.test.tsx`, `browserStorageRuntime.test.tsx`, `sectionWrites.test.ts` (the 16 sections and a graph: one PUT after the debounce, chained revisions, no UI-only field), `realDefaultsWire.test.tsx`, `bridgeDefinitionUiState.test.ts`. The `noBrowserStorage` ratchet now has empty allow-lists and also forbids `.kopruq` and `kopruq.*` storage-key literals; `sessionLayerUnwired.test.ts` and the eight `app/project-file` tests were deleted.
- **Removed.** `shared/persistence/legacyStorageMigration.ts`, `shared/project-file/projectDataEvents.ts`, `app/project-file/*`, `shared/ui/RecentFileAccessModal.tsx`, the unused zod schema files `projectStateSchema.ts`, `bridge-definition/model/schema.ts`, `familySchemas.ts`, `graphSchema.ts`, `persistProjectState`, `persistBridgeDefinitionStore`, `persistGraphStore`, `export/import/reset/validateGraphDocuments`, the storage-key constants and the three components' `storage` listeners (`PreferredSpanPanel` now listens to `kopruq:girder-catalog-changed` instead).
- **Rollback.** Reverting M5c puts the application back on localStorage; data already written to the database stays there.
