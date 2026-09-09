# SPANOVA Architecture

Status: **P06's MIDAS-P01 round trip done** for the new polyglot stack -
see `docs/roadmap.md`. This document describes the *shape* of the system
as of `docs/ARCHITECTURE_AMENDMENT_V2.md`; it will be extended, not
rewritten, as milestones land.

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
├── frontend/                      React + TypeScript (Vite), web app (browser-based)
├── backend/                       Maven multi-module, Java 21
│   ├── pom.xml                     parent (dependency management: Spring Boot 3.5.16 BOM, JUnit 5 BOM)
│   ├── bridge-core/                 solver-independent domain model - no deps
│   ├── rules-engine/                deterministic feasibility - depends on bridge-core
│   ├── generative-engine/           alternative generation - depends on bridge-core, rules-engine
│   ├── analysis-api/                job/status/result ports - depends on bridge-core
│   ├── midas-adapter/               MIDAS-specific code - depends on bridge-core, analysis-api
│   └── api/                         Spring Boot app - depends on all of the above
├── services/                       Python, deferred to after P01
│   ├── optimization-service/        placeholder only
│   └── ai-service/                  placeholder only
├── docs/
│   ├── SPANOVA_MASTER_SPEC.md       authoritative spec (v1, kept verbatim)
│   ├── ARCHITECTURE_AMENDMENT_V2.md  supersedes spec sections 3/4/12-14/19-20's tech choices
│   ├── architecture.md              this file
│   └── roadmap.md                   milestone status
└── archive/                        two earlier build generations - reference only
```

## Dependency graph (Maven)

```
bridge-core                              (no dependencies)
rules-engine        -> bridge-core
generative-engine   -> bridge-core, rules-engine
analysis-api        -> bridge-core
midas-adapter       -> bridge-core, analysis-api
api                 -> bridge-core, rules-engine, generative-engine, analysis-api, midas-adapter
                    -> spring-boot-starter-web, spring-boot-starter-actuator
```

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
├── Bridge                 (bridgeName, totalLengthM, deckWidthM)
├── DesignSpace              (Min/Max ranges + girderDepthStepM - see below)
├── generatedAlternatives : List<BridgeAlternative>
└── selectedAlternativeId : UUID?

BridgeAlternative           (P01's success-criterion type - spec section 20)
├── spanLayout : SpanLayout { spans: List<Span> }, Span = { lengthM }   (required)
├── girder : Girder (count, depthM, spacingM)                          (required)
├── deck : Deck? (slabThicknessM)                                      (nullable - not sized until Deck enumeration is approved)
├── pier : Pier? (diameterM, heightM, pierType: String)                (nullable - not sized until Pier enumeration is approved)
└── foundation : Foundation? (type: SPREAD|PILE, pileCount?, pileDiameterM?) (nullable - ditto)

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

## Open questions carried into P07+

- Whether `bridge-core` domain objects reference geometry/alignment
  types from a separate module, or keep everything in one package until
  a milestone actually needs the split (no `Spanova.Geometry`-equivalent
  module exists yet in this generation - not scaffolded in P00 since
  nothing in the current milestone list needs it standalone; add it when
  a milestone does).
- Whether `midas-adapter` ends up embedded in the `api` process or
  deployed as its own "separate Windows worker" (per the engineer's own
  architecture table) - MIDAS-P01 ran it embedded in a throwaway `main()`,
  not yet decided for the real `api` Spring Boot process.
- `ModelMapping`, `AnalysisJobManager`/queueing/concurrency policy,
  result caching/fingerprinting, and engineering QA post-MIDAS are all
  designed in `docs/MIDAS_INTEGRATION_ANALYSIS.md` but not built - next
  MIDAS milestones, not yet scheduled against the P00-P12 numbering.
