# SPANOVA --- Codex Project Instructions

## 1. Project Identity

SPANOVA is a professional Computational & Generative Bridge Design
Platform.

Primary purpose: - bridge site intelligence - terrain and alignment
processing - bridge layout generation - structural system generation -
preliminary structural analysis - bridge optimization - corridor-level
optimization - engineering rule automation - external solver
integration - BIM integration

SPANOVA must not become only a CAD application, FEM application, 3D
viewer, or AI chat interface. SPANOVA is the engineering intelligence
and automation layer above these systems.

Conceptually:

Engineer → SPANOVA → Generate / Analyze / Check / Optimize → OpenSees /
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

SPANOVA needs a solver-independent bridge model.

External systems must not define the SPANOVA domain.

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

LandXML is an IMPORT FORMAT. It is NOT the SPANOVA terrain domain model.

Use: LandXML → Parser → Import DTOs → Mapper → TerrainModel / Alignment
/ VerticalProfile

Never couple Bridge Core directly to LandXML.

## 14. Bentley LandXML Requirement

SPANOVA must support Bentley InRoads V8i LandXML 1.0.

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

Implementations: - SpanovaFastSolver - OpenSeesAdapter -
MidasCivilNxAdapter

Future adapters may include SCIA, SOFiSTiK and others.

## 30. SPANOVA Fast Solver

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

SPANOVA reduced models must be validated against OpenSees and MIDAS
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

SPANOVA generates BridgeLayoutAlternative\[\].

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

## 50. Key SPANOVA Principle

Always preserve this hierarchy:

ENGINEERING DOMAIN → ENGINEERING RULES → CALCULATION / SOLVER → RESULTS
→ VISUALIZATION → AI EXPLANATION

Never reverse this hierarchy.

The UI and AI must not become the source of engineering truth.
