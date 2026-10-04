# KOPRUQ --- Codex Project Instructions

## Family Workspace Layout Standard

The central Family Workspace desktop shell uses three regions in a 1/8 +
3/8 + 4/8 layout: Structural Family Library, Center Workspace, and Results
Workspace. The center contains Parameters and one canonical 2D Section
Preview; the results region contains Candidate Sections and Section
Properties. Visual Candidates and 3D preview are not part of this shell.
Structural family screens should reuse this shell; the former four-column
Library/Data/Preview/Candidate layout is no longer authoritative.

## 1. Project Identity

KOPRUQ is a professional Computational & Generative Bridge Design
Platform.

Primary purpose: - bridge site intelligence - terrain and alignment
processing - bridge layout generation - structural system generation -
preliminary structural analysis - bridge optimization - corridor-level
optimization - engineering rule automation - external solver
integration - BIM integration

KOPRUQ must not become only a CAD application, FEM application, 3D
viewer, or AI chat interface. KOPRUQ is the engineering intelligence
and automation layer above these systems.

Conceptually:

Engineer → KOPRUQ → Generate / Analyze / Check / Optimize → OpenSees /
MIDAS Civil NX → ALLPLAN Civil → Final BIM / Drawings / Documentation

## 2. Existing Development Context

This repository has primarily been developed using Claude Code.

Do NOT assume existing code must be rewritten.

Before making changes: 1. inspect the repository 2. read this AGENTS.md
3. read CLAUDE.md 4. read architecture.md if present 5. inspect relevant
documents under /docs 6. inspect existing code before proposing new
architecture 7. reuse established project patterns where reasonable 8.
avoid duplicate implementations 9. avoid unrelated refactoring

If documentation and implementation conflict, REPORT THE CONFLICT FIRST.
Do not silently choose one.

## 3. General Development Rule

For any non-trivial task: 1. inspect 2. understand 3. explain current
implementation 4. identify gap 5. propose minimum change 6. implement 7.
test 8. report changed files 9. report test results

For architectural or major engineering tasks, DO NOT CODE immediately
unless explicitly instructed.

First provide: - current state - gap analysis - proposed architecture -
affected modules - implementation sequence

Then wait for approval.

## 4. Technology Stack

### Frontend

Preferred / existing direction: - React - TypeScript - Vite - Tailwind
CSS - shadcn/ui where appropriate - TanStack Table - ECharts / Plotly
where appropriate - Three.js - React Three Fiber - Tauri may be used
later for desktop packaging

Do not introduce another frontend framework without a strong reason.

### Backend

Primary backend: - Java - Spring Boot - modular monolith - domain-driven
boundaries where useful

Do NOT prematurely split the backend into many microservices.

### Optimization

Advanced optimization may use Python and a dedicated optimization
service.

Potential methods: - NSGA-II - NSGA-III - genetic algorithms - mixed
integer optimization - constraint programming - heuristics

Do not use brute-force enumeration for large project optimization.

### AI

AI services may use Python/FastAPI and a provider abstraction. AI is NOT
the engineering authority.

## 5. Core Engineering Principle

All engineering calculations must be: - deterministic - traceable -
auditable - unit-aware - versioned - testable

AI must never invent: - code values - load factors - material
properties - National Annex parameters - design limits - safety
factors - engineering acceptance criteria

Engineering constants must come from validated code data, approved
engineering rules, or approved project input.

## 6. Canonical Domain Model

KOPRUQ needs a solver-independent bridge model.

External systems must not define the KOPRUQ domain.

Conceptually:

Project └── Bridge ├── Alignment ├── Terrain ├── Geotechnics ├──
Constraints ├── SpanLayout ├── Superstructure ├── Pier ├── Abutment ├──
Foundation ├── Bearing ├── ExpansionJoint ├── Materials ├── Loads ├──
ConstructionStages └── DesignCriteria

External formats such as LandXML, MIDAS, OpenSees, ALLPLAN and IFC must
be treated through adapters/import/export layers.

Do not allow vendor-specific concepts to leak into Bridge Core.

## 7. Main Product Workflow

PROJECT → SITE → BRIDGE LAYOUT → STRUCTURAL SYSTEM → ANALYSIS → DESIGN →
OPTIMIZATION → VERIFICATION → DELIVERY

Two main modes exist.

### Computational Mode

One configuration: Generate Model → Analyze → Check → Report

### Generative Mode

Design ranges: Generate Alternatives → Engineering Rules → Fast Analysis
→ Evaluate → Optimize → Pareto → Engineer Selects → High-Fidelity
Verification

## 8. First Supported Bridge Type

The initial primary structural family is Precast Girder Viaduct.

Do not attempt to fully support every bridge type at once.

Future structural families may include: - PSC Box Girder -
Steel-Concrete Composite - Balanced Cantilever - MSS - FSM - ILM -
Railway bridges - special bridges

## 9. Site and Corridor Architecture

Site definition comes before structural optimization.

Site → Bridge Layout → Structural System → Analysis → Optimization

Site inputs may include terrain/DTM, horizontal alignment, vertical
profile, superelevation, geotechnical model, roads, railways, rivers,
ramps, utilities, buildings, flood zones, landslide zones, environmental
zones, construction access and hydraulic constraints.

Bridge length must not always be treated as fixed input.

Design variables may include: - C1 location - C2 location - bridge
length - pier positions - span arrangement - pier heights - foundation
elevation - structural family

## 10. Bridge Layout Engine

Major module: BridgeLayoutEngine

Possible sub-components: - AbutmentPlacementEngine -
PierPlacementEngine - SpanArrangementGenerator - ConstraintEvaluator -
TerrainEvaluator - GeotechnicalEvaluator - HydraulicEvaluator -
PreliminaryFoundationEngine - PreliminaryQuantityEstimator -
LayoutScoringEngine

Output: BridgeLayoutAlternative\[\]

A layout alternative may contain C1, C2, Piers, SpanArrangement,
SuperstructureFamily, PierFamily, PreliminaryFoundations, BridgeLength,
PierHeights, ConstraintResults, EarthworkMetrics, PreliminaryQuantities,
PreliminaryCost, PreliminaryCarbon, ConstructabilityMetrics and
FeasibilityStatus.

## 11. Spatial Constraints

Obstacles must be first-class spatial objects.

Possible ConstraintObject types: ROAD, RAILWAY, RIVER,
MAIN_RIVER_CHANNEL, JUNCTION, RAMP, BUILDING, UTILITY, FLOOD_ZONE,
LANDSLIDE_ZONE, PROTECTED_AREA, TUNNEL, CONSTRUCTION_ACCESS,
USER_DEFINED.

Constraint severity: HARD, SOFT, PREFERENCE.

No-pier restrictions should preferably become 3D exclusion volumes.

## 12. Terrain Architecture

Terrain is ENGINEERING DATA, not only visualization.

Terrain must support: - elevation query - slope - surface normal -
profile extraction - pier placement - abutment placement - foundation
elevation - earthwork estimation - bridge layout generation

Canonical terrain must not depend on Three.js.

## 13. LandXML

LandXML is an IMPORT FORMAT. It is NOT the KOPRUQ terrain domain model.

Use: LandXML → Parser → Import DTOs → Mapper → TerrainModel / Alignment
/ VerticalProfile

Never couple Bridge Core directly to LandXML.

## 14. Bentley LandXML Requirement

KOPRUQ must support Bentley InRoads V8i LandXML 1.0.

Representative production data may contain: - metric units - large TIN
surfaces - boundaries - void boundaries - breaklines - explicit Pnts -
explicit Faces

If valid Pnts + Faces exist, DO NOT retriangulate. Preserve the source
TIN topology.

Source hierarchy may contain:

Surface ├── SourceData │ ├── Boundaries │ └── Breaklines └── Definition
├── Pnts └── Faces

The authoritative mesh is Pnts + Faces. Boundaries and Breaklines are
supporting terrain definitions.

## 15. Large Terrain Handling

Large LandXML terrain models may contain hundreds of thousands of
vertices and more than one million triangles.

Do not: - render huge survey coordinates directly - send huge
object-based JSON unnecessarily - create one React component per
triangle - use Uint16 indices above 65535 vertices

Prefer: - authoritative backend coordinates in double precision - local
render origin - Float32 render positions - Uint32 indices -
BufferGeometry - binary payloads where useful - terrain tiling - future
LOD - lazy loading

## 16. Coordinate System Rule

Backend coordinates are authoritative. Frontend visualization may use
local coordinates.

Real engineering coordinates → subtract project/site origin → local
rendering coordinates.

All coordinate transformation must be centralized. Do not scatter axis
swaps across React components. Never guess CRS silently.

## 17. Terrain Query

Terrain elevation should use the containing TIN triangle:

X,Y → spatial search → containing triangle → triangle-plane
interpolation → Z

Nearest-point Z is not the default engineering method.

Use a spatial index such as R-tree, BVH, quadtree or regular grid
spatial index.

## 18. 3D Visualization

Preferred 3D stack: Three.js + React Three Fiber.

Scene layers may include: - TerrainLayer - SatelliteLayer -
AlignmentLayer - BridgeLayer - AbutmentLayer - PierLayer -
FoundationLayer - RoadLayer - RailwayLayer - RiverLayer -
BoreholeLayer - ConstraintLayer - NoPierZoneLayer - HydraulicLayer

Layer visibility should be user-controlled.

## 19. Alignment

Alignment must be engineering data and should eventually support
horizontal geometry, vertical profile, chainage, offset, curvature and
superelevation.

Core query concepts: - getPointAtChainage() - getDirectionAtChainage() -
getPointAtChainageAndOffset() - getCurvatureAtChainage()

Do not duplicate alignment information inside bridge components.

## 20. Foundation Elevation

Preliminary foundation elevation may depend on terrain, geotechnical
layers, groundwater, scour, foundation family, minimum embedment and
rock socket.

Do not invent geotechnical requirements. Engineer-approved geotechnical
data is authoritative.

## 21. Loads Architecture

Project loads are primarily PROJECT LEVEL. All bridges inherit them
unless explicitly overridden.

Keep ProjectLoadModel separate from ProjectCombinationModel.

Load definition answers: "What is the action?" Combination definition
answers: "How is it combined with other actions?"

## 22. Traffic Loads

Primary road bridge traffic standard: EN 1991-2.

Current intended scope: - Road Bridges only - LM1 active - LM2 visible
but disabled - LM3 architecture-ready - LM4 architecture-ready - braking
/ acceleration - centrifugal effects - Traffic Load Groups - Preview /
Validation

Do NOT create a pedestrian bridge module here.

## 23. Traffic Load Groups vs Combinations

Traffic Load Groups belong to Traffic Loads. Load Groups are NOT Load
Combinations.

Traffic: LM1 / LM3 / LM4 / Braking / Centrifugal → Traffic Load Groups →
Traffic Load Cases

Separate module: Load Combinations → ULS / SLS / Accidental / Seismic

Do not mix EN 1991-2 group logic with EN 1990 combination logic.

## 24. LM2

LM2 currently: VISIBLE but DISABLED. Status: NOT_IMPLEMENTED.

Do not implement fake LM2 calculations. Do not hide LM2 completely.

## 25. Traffic Parameter Provenance

Engineering parameters must preserve source.

EN BASE → NATIONAL ANNEX → PROJECT OVERRIDE

Priority: Project Override \> National Annex \> EN Base

Each override should remain auditable.

## 26. Traffic Load Geometry

Traffic loads should consume existing bridge geometry. Avoid duplicate
input.

Carriageway width should come from bridge cross-section when available.

Notional lane generation belongs to the engineering layer, not React.

## 27. Bearings

Bearings are generative and iterative design variables.

Bearing object may include type, position, fixed/guided/free, Kx/Ky/Kz,
rotational stiffness, reactions, rotations, movements, capacity and
utilization.

Potential loop: Initial Bearing → Global Analysis → Bearing
Forces/Movements → Bearing Design → Updated Stiffness → Reanalysis →
Convergence

## 28. Geotechnical / Foundations

Geotechnical model may contain soil/rock layers, groundwater, γ, c', φ',
E/Es, ν, Su, NSPT, qc, k, RQD, UCS, GSI, scour and socket requirements.

Foundation alternatives may include spread foundation, pile foundation,
drilled shaft and rock socket.

Foundation stiffness affects global analysis and may require iteration.

## 29. Structural Analysis Architecture

Use a solver abstraction: IAnalysisEngine.

Implementations: - KopruqFastSolver - OpenSeesAdapter -
MidasCivilNxAdapter

Future adapters may include SCIA, SOFiSTiK and others.

## 30. KOPRUQ Fast Solver

Purpose: screen thousands of alternatives quickly.

Initial reduced-model capabilities: - 3D frame/beam - 6 DOF/node -
linear elastic springs - rigid links - offsets - static linear
analysis - load combinations - reactions - displacements - member
forces - modal analysis

Do not initially overload the Fast Solver with complex prestressing,
creep/shrinkage, nonlinear bearings, moving-load solver or advanced
construction stages.

## 31. Model Reduction

Detailed bridge model should be reduced automatically.

DetailedBridgeModel → ModelReductionEngine → ReducedBridgeModel

Possible sub-components: - SuperstructureReducer - PierReducer -
FoundationReducer - BearingReducer - LoadReducer - MassReducer

Reduced foundation may use a 6x6 stiffness matrix including coupling
terms where required.

## 32. Solver Validation

KOPRUQ reduced models must be validated against OpenSees and MIDAS
Civil NX.

Compare: - T1/T2/T3 - reactions - pier M/V - bearing forces - bearing
movements - deck displacement - foundation actions

Store difference %, applicability, tolerance and validation status.

## 33. Optimization Architecture

Three optimization levels:

### Layout Optimization

Where should the bridge be placed?

Variables may include abutments, bridge length, pier positions, spans,
structural family and foundation elevation.

### Structural Optimization

How should this layout be designed?

Variables may include girder count, girder depth, slab thickness, pier
size, bearing properties, piles and pile length.

### Corridor Optimization

What is best for the whole project?

Objectives may include total cost, CO2, concrete, rebar, steel,
prestressing, pile length, duration, standardization and number of
different structural types.

## 34. Project Design System

Shared project structural catalog: ProjectDesignSystem.

May include: - SuperstructureFamilies - GirderFamilies -
StandardSpanFamilies - PierFamilies - FoundationFamilies -
BearingFamilies - ExpansionJointFamilies - MaterialCatalog -
ConstructionMethods - StandardizationRules

This shared catalog prevents each bridge becoming an isolated design.

## 35. AI Role

AI may interpret user intent, create structured design requests, explain
results, compare alternatives, create reports, orchestrate workflows and
suggest rules for engineer approval.

AI must NOT invent engineering values, bypass Rules Engine, bypass
solver, or directly modify authoritative engineering data without
validation.

## 36. What-If Workflow

Example: Girder count 6 → 5.

Do NOT let AI invent the new result.

Use: DesignChangeRequest → clone alternative → rebuild affected geometry
→ engineering rules → model reduction → Fast Solver →
bearing/pier/foundation update → quantities → cost/carbon → comparison →
AI explanation

Possible states: INSTANT, CALCULATION_REQUIRED, CALCULATING, VERIFIED,
FAILED.

## 37. Project Dashboard

Dashboard is a project command center.

It may show project summary, corridor map, bridge count/status, Project
Design System, Loads, Site Intelligence, cost, CO2, quantities, critical
warnings, optimization status and quick actions.

## 38. Bridge Site Screen

Bridge Site should eventually include 3D terrain, satellite, alignment,
bridge, abutments, piers, foundations, road, railway, river, boreholes,
no-pier zones and hydraulic constraints.

Also provide longitudinal profile.

## 39. Layout Generator UI

User should define allowable superstructure families, span ranges, pier
families, site constraints and standardization preferences.

KOPRUQ generates BridgeLayoutAlternative\[\].

The engineer chooses from feasible alternatives.

## 40. Frontend Philosophy

UI should be engineering-oriented, dark professional theme, compact,
data-rich and visually clear.

Prefer explicit units, source/provenance labels, validation status,
clear warning states and live engineering previews.

Avoid consumer-style decorative UI, hidden engineering assumptions and
forms with duplicate data.

## 41. Validation Status

Possible engineering statuses: DRAFT, INCOMPLETE, REVIEW_REQUIRED,
VALID, OVERRIDDEN, NOT_IMPLEMENTED, STALE, RECALCULATION_REQUIRED,
FAILED.

## 42. Dependency / Version System

Engineering data changes may invalidate downstream outputs.

Examples: Terrain changed → Bridge Layout STALE Traffic Loads changed →
Analysis RECALCULATION_REQUIRED Foundation stiffness changed → Global
Model RECALCULATION_REQUIRED

This dependency behavior must be explicit.

## 43. Persistence

Persist engineering state, not only UI state.

Important data should include versions, source, provenance, status,
dependencies, overrides and engineering metadata.

Results should remain reproducible.

## 44. Testing

Engineering modules require automated tests.

Tests should include known engineering cases, boundary cases, unit
conversion, coordinate transforms, persistence, version invalidation,
parameter provenance and solver verification where applicable.

Do not rely only on visual testing.

## 45. Coding Quality

Prefer clear domain boundaries, small focused services, explicit value
objects, immutable engineering data where practical, typed APIs,
reproducible calculations and tests near engineering logic.

Avoid giant service classes, giant domain classes, business logic in
React, database logic in UI, solver-specific logic in Bridge Core and
duplicated rule definitions.

## 46. Refactoring Policy

Do not refactor large areas without reason.

Before major refactoring: 1. explain problem 2. show affected modules 3.
explain migration impact 4. explain test coverage 5. wait for approval

## 47. Third-Party Libraries

Before adding a library check maintenance, license, security, Java/Node
compatibility, performance and dependency weight.

Do not introduce a large GIS/FEM platform when a smaller library is
sufficient.

## 48. Source Control

Before significant work: - inspect Git status - do not overwrite
unrelated user changes - do not delete untracked files without
permission - keep changes scoped to task

At completion report: - files modified - files created - tests run -
unresolved issues

## 49. Preferred First Response to New Development Tasks

For non-trivial tasks, first return:

### Current State

What already exists.

### Gap

What is missing.

### Proposed Change

Minimum clean architecture.

### Affected Files

Likely files/modules.

### Validation

How success will be tested.

Then wait if the task is architectural or high-impact.

## 50. Key KOPRUQ Principle

Always preserve this hierarchy:

ENGINEERING DOMAIN → ENGINEERING RULES → CALCULATION / SOLVER → RESULTS
→ VISUALIZATION → AI EXPLANATION

Never reverse this hierarchy.

The UI and AI must not become the source of engineering truth.

---

# Persistent Continuation Memory

This section records the repository state and decisions that a new Codex
session should use when continuing work. It supplements the architectural
rules above; it does not replace the specifications in `docs/`.

## Current repository state

- Repository: KOPRUQ, branch `codex/landxml-terrain-import`.
- Stack: Java 21/Spring Boot modular Maven backend, React + TypeScript + Vite
  frontend. The backend is intentionally a modular monolith; `api` is the
  Spring boundary and domain modules must remain framework-independent.
- Primary references, in reading order: `CLAUDE.md`,
  `docs/KOPRUQ_MASTER_SPEC.md`, `docs/ARCHITECTURE_AMENDMENT_V2.md`,
  `docs/SITE_LAYOUT_PLATFORM_ANALYSIS.md`, `docs/architecture.md`, and
  `docs/roadmap.md`.
- `archive/` contains superseded C#/.NET/Avalonia generations. It is reference
  material only and is not an implementation dependency.
- The working tree currently has user changes in:
  `frontend/src/app/styles/App.css`,
  `frontend/src/features/family-tables/components/PrecastGirderFamilyPreview.tsx`,
  `frontend/src/features/girder-library/components/GirderLibraryPanel.tsx`,
  and `frontend/src/shared/ui/ParamSweepCard.tsx`.
  Do not discard, reset, or overwrite these changes without explicit approval.

## Architectural decisions that are locked

1. Engineering domain data is authoritative. The dependency direction is
   domain -> rules -> calculation/solver -> results -> visualization -> AI
   explanation. React state, SVGs, AI output, and vendor formats are never the
   source of engineering truth.
2. KOPRUQ owns a solver-independent bridge model. MIDAS, OpenSees, LandXML,
   IFC, and ALLPLAN concepts enter through adapters/import/export boundaries.
3. The product workflow is project/site -> bridge layout -> structural system
   -> analysis -> design -> optimization -> verification -> delivery.
4. The first structural family is precast girder viaduct. Broad support for
   other bridge families is intentionally deferred.
5. Bridge length, abutment positions, pier positions, span arrangement, and
   related site variables are generated layout variables, not merely hand-typed
   inputs. `BridgeLayoutEngine` produces traceable alternatives with feasibility
   and rejection reasons.
6. KOPRUQ's native fast solver is the screening engine. MIDAS Civil NX is a
   post-selection/high-fidelity verification adapter, not the generator's
   domain model or primary optimization engine.
7. Terrain is engineering data. LandXML is an anti-corruption import format;
   it must map through DTOs into `TerrainModel`, alignment, and profile models.
   Valid Bentley/InRoads `Pnts` + `Faces` topology is authoritative and must not
   be silently retriangulated.
8. Backend coordinates remain authoritative. Rendering may subtract a local
   origin and use Float32, but coordinate transforms are centralized and CRS is
   never guessed.
9. Project-level loads and load combinations are separate concepts. Traffic
   load groups are not EN 1990 combinations. LM2 is visible but disabled and
   must not receive fake calculations.
10. Engineering parameters require provenance and the priority
    `project override > national annex > EN base`. Validation, stale state,
    dependencies, and recalculation requirements must be explicit.

## Backend modules and implemented capabilities

- `bridge-core`: immutable Java domain records for Project, Bridge, Span,
  SpanLayout, Deck, Girder, Pier, Foundation, DesignSpace, and
  BridgeAlternative; SI units; no vendor or Spring dependency.
- `spatial-core` and `alignment`: coordinate primitives, horizontal elements,
  chainage/XYZ conversion, curves, and vertical profiles.
- `constraints` and `bridge-layout`: site/layout candidates, abutment/pier
  candidates, no-pier constraints, feasibility results, and the layout
  generation flow.
- `terrain`: terrain model, XYZ import, TIN triangles, repositories, and
  containing-triangle elevation queries.
- `landxml-import`: StAX-based LandXML anti-corruption parser/mappers for
  Bentley-style surfaces, boundaries/breaklines, explicit points/faces,
  alignment, and vertical profile.
- `rules-engine`: rule infrastructure only where rules are engineer-approved;
  never add assumed code values.
- `generative-engine`: deterministic structural alternative generation.
- `analysis-api` and `analysis-engine`: solver port/domain types and native
  linear-elastic 3D direct-stiffness fast solver with frame elements, elastic
  links, reactions, displacements, member forces, and modal-related support.
- `midas-adapter`: verified model/result exchange round trip; full analysis
  integration and complete BridgeAlternative wiring remain future work.
- `traffic-loads`: EN 1991-2 road-bridge traffic foundation including LM1,
  notional lanes, factors/groups, temperature, wind, and seismic service
  infrastructure; follow existing provenance patterns.
- `api`: Spring Boot REST boundary for kernel state, alternatives, layout,
  terrain/LandXML, traffic loads, fast solver, materials, and related APIs.
- `services/optimization-service` and `services/ai-service`: placeholders;
  optimization and AI are not implemented production services.

## Frontend architecture and UI rules

- `frontend/src/app` owns shell, routing, providers, navigation, workspace
  composition, and global styling. `frontend/src/pages` composes multi-feature
  screens. `frontend/src/features/<domain>` owns domain screens and feature
  components. `frontend/src/shared` contains domain-neutral UI, persistence,
  units, and reusable controls.
- React Router, TanStack Query, React Hook Form + Zod, and Vitest are part of
  the established direction. Do not reintroduce the old monolithic component
  architecture or duplicate domain forms.
- The UI is a compact, professional engineering cockpit: dark mode is the
  primary visual language, light mode is supported, and data density is useful
  rather than decorative. Use explicit units, provenance, validation states,
  warnings, and live engineering previews.
- Avoid duplicate input sources. Geometry and load calculations should consume
  existing domain values; business logic belongs in backend/domain services or
  typed feature models, not in presentation components.
- Family screens use reusable shape/parameter patterns. Section diagrams are
  SVG previews, with dimensions and labels driven from the same family values;
  label placement and extension gaps are visual constants, not engineering
  values. Preserve existing dimension naming (`H`, `Btf`, `Bbf`, `tw`, `th1`,
  `bh1`, `bh2`, `th2`) and unit conversion behavior.
- The graph/workspace UI is an authoring and inspection surface for engineering
  families, not a second calculation engine. Nodes, connectors, inspectors,
  schematics, material selectors, derived geometry, and candidate previews must
  remain synchronized with the underlying typed data.
- Do not hide unsupported engineering features. Show them with an explicit
  disabled or `NOT_IMPLEMENTED` state rather than fabricated values.

## Completed work / maturity map

- Foundation through P05/P06-era functionality is implemented on the current
  Java/React stack: domain model, REST kernel, alternative generation, rules
  infrastructure, preview UI, and MIDAS-P01 round trip.
- SITE-P01, LAYOUT-P01, native fast solver, TERRAIN-P01, LANDXML-P01, and
  TRAFFIC-P01 are recorded as end-to-end complete in `docs/roadmap.md` and
  `docs/architecture.md`.
- The professional application shell, project/bridge workspaces, family-table
  consolidation, visual engineering graph, inspector/schematic system,
  material synchronization, pier/cap/foundation/bearing nodes, and precast/
  steel girder family UI have been built incrementally. The detailed dated
  implementation record is `docs/architecture.md`; consult it before changing
  an established pattern.
- Current UI work includes girder/family preview dimension layout and shared
  parameter-sweep card presentation. Treat the four modified files listed in
  “Current repository state” as in-progress user work.

## Explicitly incomplete / do not imply completion

- MIDAS NX analysis execution/result association (P07) is not complete.
- Quantities, cost, carbon, generative multi-objective optimization/Pareto,
  production AI orchestration, and additional solver adapters are not complete.
- Terrain-driven bridge/pier/abutment 3D geometry, satellite/orthophoto,
  road/rail/river/borehole layers, terrain tiling/LOD/streaming, and broader
  geotechnical/hydraulic intelligence remain future work.
- No unapproved engineering rules, code factors, design limits, safety factors,
  or geotechnical requirements may be invented to make a screen appear complete.

## Test and verification status

- Backend modules contain unit and controller tests for bridge core, alignment,
  layout generation, generative alternatives, rules, analysis API/solver,
  MIDAS mapping/round trip, terrain/TIN queries, Bentley production terrain,
  traffic loads, and API endpoints. The test inventory is visible under each
  module's `src/test/java`.
- Frontend Vitest coverage exists for app behavior, project-file persistence,
  terrain binary/coordinate helpers, shared parameter controls, and section
  geometry. `frontend/vitest-errors.txt` is a diagnostic artifact and must be
  checked before trusting a frontend result.
- The documented baseline is that Maven reactor tests/build and frontend
  production build have passed at relevant milestones. Do not report a fresh
  pass without running the command in the current environment. For a normal
  change, run `cd backend; mvn test` and `cd frontend; npm.cmd test -- --run`
  where practical, plus `npm.cmd run build` for frontend changes.
- This AGENTS update did not run tests; it only inspected repository metadata
  and documentation. No generated test/build files should be committed as part
  of documentation-only work.

## Safe continuation protocol

Before any implementation:

1. Read this file, `CLAUDE.md`, and the relevant sections of `docs/`.
2. Run `git status --short` and preserve all unrelated/user changes.
3. Inspect the existing module and tests; explain current state, gap, minimum
   change, affected files, and validation plan before architectural changes.
4. Keep changes scoped. Do not reset, delete untracked files, or perform broad
   refactors without explicit approval.
5. For engineering behavior, add deterministic tests with units, provenance,
   boundary cases, and reproducible expected results. For UI work, preserve
   domain ownership and add focused interaction/geometry tests.
6. At handoff report modified/created files, tests actually run, known gaps,
   and any documentation-versus-implementation conflict.

When documentation and code disagree, stop and report the conflict before
silently changing either source of truth.

## Central Technical Dimension System V1

The shared `frontend/src/shared/technical-drawing` subsystem is the source of
truth for technical dimension geometry and rendering. Precast Girder is the
first migrated consumer and its golden layout is covered by regression tests.
New structural section previews must use the shared dimension definitions,
resolvers, and components; local SVG arrows, extension lines, or dimension
text renderers must not be introduced.

Global drawing tokens remain separate from section-specific presets. The
`DimensionGeometry` resolver owns reusable drawing geometry, while engineering
section geometry and anchors remain outside generic dimension rendering.
Precast golden rules are `rightDimensionFactor = 0.25` and
`twTextGapFactor = 2 / 3`; `th1`, `bh1`, `bh2`, and `th2` share the common
right dimension axis. Existing Precast golden geometry must remain unchanged.

Regression coverage exists for bounds, tokens, lane placement, horizontal /
vertical / inline dimensions, extension behavior, arrow orientation, Precast
golden factors, right-axis alignment, parametric sections, duplicate labels,
section geometry independence, and input immutability. Other structural
previews are not yet migrated.

Central Technical Dimension System consumers:
- Precast Girder — migrated
- Rectangular Pier — migrated

Rectangular Pier B/D dimensions use shared DimensionGeometry and shared
Horizontal/Vertical dimension components.

Migration candidates: Cap, Foundation, Abutment, Bearing, and other section
previews.

KOPRUQ Technical Dimension Golden Standard V1:
- Technical dimension labels always use two decimals, independently from property/data precision.
- Dimension arrows use the outward contract: horizontal start/left points left,
  horizontal end/right points right, vertical top points up, and vertical
  bottom points down.
- Extension lines preserve a 4 drawing-unit geometry-side gap and continue
  3 drawing units beyond the dimension axis on the geometry-remote side.
- Dimension graphics use the central soft light blue-gray technical color and Segoe UI 11px typography.
- Annotation-safe DrawingBounds are mandatory.
- Global visual rules remain separate from section semantic presets.

## Family Workspace V1

- Family sidebar reuses the Graph structural node registry and logo system; it is flat, structural-only, and has no drag/drop or category grouping.
- Family workspace uses shared Parameters, Section Properties, Section Preview, and Candidate Table shell components.
- Visual Candidates is removed from the Precast Girder workflow; Candidate Table is the sole candidate-selection UI.
- Structural previews use the Central Technical Dimension System. Precast Girder is the first reference implementation; future family screens use the central shell rather than local layouts.
- The desktop shell is fixed at 1:3:4: Structural Family Library, Center
  Workspace, and Results Workspace. The center contains Parameters above one
  canonical 2D Section Preview; results contain Candidate Sections above
  Section Properties. Family types must not introduce independent workspace
  layouts, duplicate previews, 3D previews, or Visual Candidates.
- The Structural Family Library is a flat, read-only navigation list derived
  from the Graph structural node registry and reuses each node's name, icon,
  and structural identity. It does not create Graph nodes.
- Precast Girder parameters are H, Btf, Bbf, tw, th1, bh1, th2, and bh2;
  material is not a separate presentation row. Parameter and candidate table
  bodies use the shared 12px family typography and remain scroll/pagination
  safe.
- Section Properties has five vertical rows (A, Ix, Iy, Wx, Wy), each split
  into symbol, description, value, and unit. Units are separate from numeric
  values; property precision is unit-specific (m: 4 decimals, cm: 2,
  mm: 0) and is independent of the technical-dimension two-decimal rule.
