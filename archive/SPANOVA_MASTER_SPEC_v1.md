# SPANOVA

## Computational & Generative Bridge Design Platform

### 1. Product Vision

SPANOVA is a professional engineering software platform for Computational and Generative Bridge Design.

SPANOVA is NOT intended to replace ALLPLAN Civil, MIDAS Civil, SCIA Engineer, or other structural analysis/BIM software.

SPANOVA will act as an intelligent bridge design, generation, automation, and optimization layer above these engineering applications.

The primary objective is to transform bridge engineering knowledge and design rules into a computational workflow capable of automatically generating, evaluating, analyzing, comparing, and optimizing bridge alternatives.

The engineer remains responsible for engineering decisions.

---

# 2. Fundamental Architecture

The fundamental workflow is:

Engineer
→ SPANOVA
→ Generate Bridge Alternatives
→ Engineering Rules
→ ALLPLAN Civil
→ Structural Analysis
→ Results
→ SPANOVA
→ Optimization
→ Recommended Alternatives
→ ALLPLAN Civil
→ Final BIM / Reinforcement / Drawings

SPANOVA must have its own independent Bridge Kernel.

The SPANOVA data model MUST NOT depend on ALLPLAN, MIDAS, SCIA or any other solver.

External software shall be connected through adapters.

Architecture:

SPANOVA Core
├── Bridge Kernel
├── Geometry
├── Engineering Rules
├── Generative Engine
├── Optimization Engine
├── Cost Engine
├── Carbon Engine
└── Results Database

External adapters:

├── ALLPLAN Civil Adapter
├── MIDAS Civil NX Adapter [future]
└── SCIA Engineer Adapter [future]

ALLPLAN Civil will be the first external engineering platform.

---

# 3. Responsibilities of SPANOVA

SPANOVA shall manage:

* project definition
* bridge design criteria
* alignment information
* terrain information
* geotechnical information
* environmental and geometric constraints
* bridge system alternatives
* design variables
* design-space definition
* automatic alternative generation
* engineering feasibility rules
* preliminary sizing
* optimization
* alternative ranking
* cost calculations
* carbon calculations
* structural result management
* Pareto optimization
* reporting
* AI-assisted engineering interface in a later phase

SPANOVA shall NOT initially implement its own finite-element solver.

---

# 4. Responsibilities of ALLPLAN Civil

ALLPLAN Civil will initially provide:

* parametric bridge geometry
* structural analysis model
* construction stages
* prestressing
* traffic analysis
* influence lines
* creep and shrinkage
* seismic analysis
* Eurocode structural checks
* detailed BIM model
* reinforcement
* quantities
* drawings

SPANOVA shall communicate with ALLPLAN through a dedicated adapter using available Tcl/API/Python mechanisms.

---

# 5. Bridge Kernel

SPANOVA shall have an independent bridge object model.

Initial hierarchy:

Project

Bridge
├── Alignment
├── Terrain
├── Constraints
├── SpanLayout
├── Superstructure
│   ├── Deck
│   ├── Girder
│   ├── CrossGirder
│   └── Diaphragm
├── Substructure
│   ├── Pier
│   ├── PierCap
│   ├── Abutment
│   └── Foundation
├── Pile
├── Bearing
├── ExpansionJoint
├── Prestressing
├── Materials
├── Loads
├── ConstructionStages
└── DesignCriteria

All internal engineering units shall use SI units.

Solver-specific objects are forbidden inside Spanova.Core.

---

# 6. Two Operating Modes

SPANOVA shall have two principal modes.

## Computational Mode

The engineer defines one bridge configuration.

Example:

Span = 40 m
Girder Count = 6
Girder Depth = 2.10 m
Pier Diameter = 2.20 m

Workflow:

Define
→ Generate Model
→ Analyze
→ Check
→ Report

## Generative Mode

The engineer defines ranges.

Example:

Span = 35–45 m
Girder Count = 4–8
Girder Depth = 1.80–2.50 m
Pier Diameter = 1.80–2.80 m

Workflow:

Design Space
→ Generate Alternatives
→ Engineering Filter
→ Analyze
→ Optimize
→ Rank
→ Pareto Solutions

---

# 7. Generative Design Principle

Example design problem:

Bridge Length = 420 m
Deck Width = 13.80 m

Allowed Span:
35–45 m

Girder Count:
4–8

Girder Depth:
1.80–2.50 m

Pier Diameter:
1.80–2.80 m

Constraints:

* no pier inside river
* no pier inside railway clearance
* maximum pier height
* constructability limits
* structural feasibility limits

SPANOVA may initially generate thousands of theoretical alternatives.

Example:

1,248 generated

→ Engineering Rules

326 geometrically feasible

→ Preliminary Engineering Rules

132 candidates

→ Structural Analysis

94 structurally acceptable

→ Optimization

11 Pareto-optimal alternatives

The objective is NOT to structurally analyze every theoretical combination.

Engineering knowledge shall eliminate unreasonable solutions before FEM analysis.

---

# 8. Engineering Rules Engine

This is a critical intellectual-property component of SPANOVA.

Example rules:

IF BridgeType = PrecastGirder
AND Span > permitted span
THEN Reject

IF PierPosition intersects ForbiddenZone
THEN Reject

IF GirderDepth / Span outside permitted range
THEN Reject

IF PierSlenderness outside engineering limits
THEN Reject

IF Foundation geometry is incompatible with site constraints
THEN Reject

Rules must be configurable.

Rules shall not be hidden inside UI code.

Engineering rules must have automated tests.

---

# 9. Optimization

SPANOVA shall eventually support multi-objective optimization.

Typical objectives:

MINIMIZE:

* construction cost
* concrete quantity
* reinforcement quantity
* structural steel
* prestressing steel
* foundation quantities
* embodied carbon
* construction duration

Subject to:

ULS ≤ allowable limit
SLS ≤ allowable limit
Fatigue ≤ allowable limit
Deflection ≤ allowable limit
Stress ≤ allowable limit
Foundation capacity ≥ demand
Constructability = acceptable

Results shall eventually be presented using Pareto-front analysis.

---

# 10. User Interface

SPANOVA shall be a standalone Windows desktop engineering application.

Initial technology:

C#
.NET
WPF

The interface shall resemble a professional engineering Design Cockpit rather than a CAD program.

Main modules:

PROJECT

GEOMETRY

DESIGN SPACE

GENERATE

ANALYZE

OPTIMIZE

RESULTS

REPORT

The detailed geometric editing environment remains ALLPLAN Civil.

SPANOVA may contain a lightweight bridge preview.

---

# 11. Initial Software Solution

Create the following modular architecture:

SPANOVA.sln

src/
├── Spanova.App
├── Spanova.Core
├── Spanova.Geometry
├── Spanova.Rules
├── Spanova.Generative
├── Spanova.Analysis
├── Spanova.Allplan
├── Spanova.Optimization
├── Spanova.Cost
├── Spanova.Carbon
├── Spanova.Data
└── Spanova.Reporting

tests/
├── Spanova.Core.Tests
├── Spanova.Rules.Tests
└── Spanova.Generative.Tests

docs/
├── architecture.md
├── engineering-model.md
├── allplan-integration.md
└── roadmap.md

Do not create unnecessary dependencies between modules.

---

# 12. First Bridge Type

Do NOT attempt to support all bridge types initially.

The first development target is:

PRECAST GIRDER VIADUCT

Initial parameters:

* total bridge length
* deck width
* minimum span
* maximum span
* number of spans
* girder count
* girder spacing
* girder depth
* slab thickness
* pier height
* pier diameter
* foundation dimensions
* pile number
* pile diameter

Future bridge systems:

* PSC Box Girder
* Steel Composite
* Balanced Cantilever
* MSS/FSM
* ILM

These shall NOT be implemented during the first prototype unless specifically requested.

---

# 13. ALLPLAN Integration

Initial integration target:

BridgeAlternative
→ Allplan Adapter
→ Tcl
→ ALLPLAN Civil

The first milestone does NOT require automatic control of the ALLPLAN GUI.

SPANOVA shall first generate a valid ALLPLAN Civil Tcl representation of the selected bridge alternative.

Later phases will investigate:

* automatic ALLPLAN execution
* model regeneration
* structural analysis execution
* result extraction
* batch analysis
* detailed model generation

All ALLPLAN-specific code must remain inside Spanova.Allplan.

---

# 14. Project File

SPANOVA shall use its own project format.

Example:

VIA35.spanova

The project shall contain:

* project metadata
* bridge definition
* design space
* engineering constraints
* generated alternatives
* analysis references
* optimization results

JSON may be used for initial human-readable project serialization.

SQLite may later be used for large alternative/result databases.

---

# 15. AI Policy

AI shall NOT be the structural calculation authority.

AI may eventually:

* interpret natural-language engineering requests
* configure SPANOVA parameters
* explain alternatives
* generate reports
* assist with engineering workflow
* interact with external software

Engineering calculations must remain deterministic and auditable.

Structural formulas must be based on explicitly defined engineering requirements and standards.

Do not invent engineering equations.

Do not silently introduce assumptions.

Every engineering equation must have:

* source/code reference
* units
* assumptions
* validation example
* automated test

---

# 16. Development Philosophy

The software must be:

* modular
* auditable
* deterministic where engineering safety is involved
* unit-aware
* testable
* solver-independent
* maintainable
* extensible

Do not over-engineer the first prototype.

Do not implement features simply because they may be useful later.

---

# 17. Prototype P01

The immediate development objective is SPANOVA P01.

The user shall be able to:

1. Create a new SPANOVA project.
2. Define bridge name.
3. Define total bridge length.
4. Define deck width.
5. Define minimum and maximum span.
6. Define girder-count range.
7. Define girder-depth range.
8. Press GENERATE.
9. Generate feasible span/girder alternatives.
10. Display alternatives in a table.
11. Select one alternative.
12. Save the SPANOVA project.
13. Export the selected alternative through Spanova.Allplan.

Initial UI:

PROJECT | DESIGN SPACE | GENERATE | RESULTS

No structural analysis is required for P01.

No AI agent is required for P01.

No optimization algorithm is required for P01.

No MIDAS integration is required for P01.

---

# 18. First Success Criterion

The first meaningful SPANOVA prototype shall demonstrate:

Engineer defines:

Bridge Length = 210 m
Deck Width = 13.80 m
Span Range = 30–45 m
Girder Count = 4–8
Girder Depth = 1.80–2.50 m

SPANOVA generates feasible bridge alternatives.

The engineer selects one alternative.

SPANOVA converts that BridgeAlternative into an ALLPLAN Civil integration output.

This is the first proof of concept for the Computational Bridge Design workflow.

---

# 19. Development Instruction to Claude

Before writing code:

1. Read this complete specification.
2. Create a proposed software architecture.
3. Identify unclear engineering/software assumptions.
4. Do NOT invent missing engineering requirements.
5. Create the initial repository structure.
6. Create CLAUDE.md.
7. Create architecture.md.
8. Create roadmap.md.
9. Implement only Prototype P01.
10. Build the complete solution.
11. Run automated tests.
12. Report what was implemented and what remains incomplete.

Do not begin structural-analysis implementation until explicitly instructed.
