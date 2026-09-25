> This is the authoritative master specification for KOPRUQ. Maintain
> `CLAUDE.md`, `architecture.md` and `roadmap.md` as living project
> documents derived from it. Do not change fundamental architectural
> decisions without discussing them with the engineer first.

You are going to work with me as the lead software architect and AI coding assistant
for a new professional bridge engineering software platform called KOPRUQ.

I am a senior bridge/structural engineer. I will define and validate the engineering
logic, bridge design rules, assumptions, structural requirements and code-based
engineering decisions.

Your responsibility is to help me convert this engineering knowledge into a robust,
professional software platform.

============================================================
1. PRODUCT NAME
============================================================

KOPRUQ

Computational & Generative Bridge Design

KOPRUQ is intended to become a professional Computational and Generative Bridge
Design platform.

It is NOT intended to replace ALLPLAN Civil, MIDAS Civil, SCIA Engineer or other
structural analysis/BIM software.

Instead, KOPRUQ will become the engineering intelligence, automation, generation
and optimization layer above these applications.

The fundamental idea is:

ENGINEER
    ↓
KOPRUQ
    ↓
DEFINE DESIGN SPACE
    ↓
GENERATE BRIDGE ALTERNATIVES
    ↓
ENGINEERING RULES
    ↓
STRUCTURAL ANALYSIS
    ↓
EVALUATE
    ↓
OPTIMIZE
    ↓
COMPARE ALTERNATIVES
    ↓
ENGINEER SELECTS FINAL DESIGN
    ↓
ALLPLAN CIVIL
    ↓
FINAL BIM / REINFORCEMENT / DRAWINGS


============================================================
2. MAIN DESIGN PHILOSOPHY
============================================================

KOPRUQ must answer the question:

"What bridge should we design?"

ALLPLAN Civil will primarily answer:

"How do we model, analyze and detail the selected bridge?"

Therefore KOPRUQ shall focus on:

- computational bridge design
- parametric design-space definition
- engineering rule automation
- alternative generation
- preliminary sizing
- structural-analysis orchestration
- design evaluation
- multi-objective optimization
- cost optimization
- carbon optimization
- constructability evaluation
- comparison and ranking
- reporting
- eventually AI-assisted bridge engineering

KOPRUQ shall NOT initially contain its own finite-element solver.


============================================================
3. CORE ARCHITECTURAL PRINCIPLE
============================================================

KOPRUQ MUST have its own independent Bridge Kernel.

The Bridge Kernel must NEVER depend directly on:

- ALLPLAN
- MIDAS
- SCIA
- any specific FEM solver
- any specific BIM software

External engineering applications must be connected through adapters.

Conceptually:

                    KOPRUQ
                       │
                 BRIDGE KERNEL
                       │
       ┌───────────────┼───────────────┐
       │               │               │
    ALLPLAN          MIDAS           SCIA
    Adapter          Adapter         Adapter
       │               │               │
 ALLPLAN Civil    MIDAS Civil NX   SCIA Engineer

ALLPLAN will be the FIRST adapter.

MIDAS and SCIA are future adapters.


============================================================
4. INITIAL TECHNOLOGY STACK
============================================================

Main programming language:

C#

Platform:

.NET

Desktop UI:

Avalonia UI

Architecture pattern:

MVVM

Engineering/core logic:

C#

Optimization and advanced numerical research:

Python may be integrated later where appropriate.

Initial database:

SQLite

Human-readable configuration/project interchange:

JSON

ALLPLAN integration:

Tcl / available ALLPLAN Civil APIs / Python APIs where appropriate.

Do NOT tightly couple the application to ALLPLAN.


============================================================
5. USER INTERFACE PHILOSOPHY
============================================================

KOPRUQ shall be a standalone professional desktop engineering application.

It should NOT look like a traditional CAD program.

It should look like a modern:

"Bridge Design Cockpit"

The user should primarily work inside KOPRUQ.

Typical main navigation:

PROJECT
GEOMETRY
DESIGN SPACE
GENERATE
ANALYZE
OPTIMIZE
RESULTS
REPORT

A future interface may contain:

- project information
- alignment
- terrain
- geotechnical information
- bridge preview
- design parameters
- constraints
- alternatives table
- structural performance
- Pareto charts
- cost
- CO2
- selected alternative
- "Open in ALLPLAN"

Do NOT spend excessive development effort on the final visual UI during the first
prototype.

Functionality comes before visual polish.


============================================================
6. TWO PRINCIPAL OPERATING MODES
============================================================

KOPRUQ shall eventually support two operating modes.

---------------------------
A. COMPUTATIONAL MODE
---------------------------

The engineer defines a single bridge configuration.

Example:

Span = 40 m
Girder Count = 6
Girder Depth = 2.10 m
Pier Diameter = 2.20 m

Workflow:

DEFINE
→ GENERATE MODEL
→ ANALYZE
→ CHECK
→ REPORT


---------------------------
B. GENERATIVE MODE
---------------------------

The engineer defines ranges rather than a single solution.

Example:

Span Length = 35–45 m
Girder Count = 4–8
Girder Depth = 1.80–2.50 m
Slab Thickness = 0.22–0.30 m
Pier Diameter = 1.80–2.80 m

KOPRUQ generates alternatives.

Workflow:

DESIGN SPACE
→ GENERATE
→ ENGINEERING FILTER
→ ANALYZE
→ EVALUATE
→ OPTIMIZE
→ PARETO FRONT
→ RANK
→ ENGINEER SELECTS DESIGN


============================================================
7. BRIDGE KERNEL
============================================================

The KOPRUQ domain model shall eventually include concepts such as:

Project

Bridge
├── Alignment
├── Terrain
├── Geotechnics
├── Constraints
├── SpanLayout
│
├── Superstructure
│   ├── Deck
│   ├── Slab
│   ├── Girder
│   ├── CrossGirder
│   └── Diaphragm
│
├── Substructure
│   ├── Pier
│   ├── Column
│   ├── PierCap
│   └── Abutment
│
├── Foundation
│   ├── SpreadFoundation
│   └── PileFoundation
│
├── Bearing
├── ExpansionJoint
├── Prestressing
├── Materials
├── Loads
├── ConstructionStages
└── DesignCriteria

Do NOT implement all of these immediately.

This is the long-term domain model.

All internal engineering data shall use a consistent SI unit strategy.

Engineering units must never be ambiguous.


============================================================
8. FIRST SUPPORTED BRIDGE TYPE
============================================================

Do NOT try to support every bridge type.

The first prototype shall focus on:

PRECAST GIRDER VIADUCT

Future systems may include:

- PSC Box Girder
- Steel-Concrete Composite
- Balanced Cantilever
- MSS/FSM
- ILM
- Railway Bridges
- Special Bridges

Do NOT implement these future bridge systems until explicitly requested.


============================================================
9. DESIGN SPACE
============================================================

A typical KOPRUQ design-space definition may contain:

PROJECT

Bridge Length
Deck Width
Alignment
Terrain

SUPERSTRUCTURE

Minimum Span
Maximum Span
Girder Count Range
Girder Spacing Range
Girder Depth Range
Slab Thickness Range

SUBSTRUCTURE

Pier Height
Pier Diameter
Pier Type

FOUNDATION

Foundation Type
Foundation Dimensions
Pile Count
Pile Diameter

CONSTRAINTS

River forbidden zones
Railway clearance zones
Road clearance zones
Protected areas
Maximum pier height
Constructability limits

OBJECTIVES

Minimize Cost
Minimize CO2
Minimize Concrete
Minimize Reinforcement
Minimize Prestressing
Minimize Foundation Quantity
Minimize Construction Duration


============================================================
10. GENERATIVE DESIGN CONCEPT
============================================================

Example:

Bridge Length = 420 m
Deck Width = 13.80 m

Span Range = 35–45 m
Girder Count = 4–8
Girder Depth = 1.80–2.50 m
Pier Diameter = 1.80–2.80 m

KOPRUQ may generate:

1,248 theoretical alternatives

Engineering Rules Engine:

1,248
↓
326 geometrically feasible

Preliminary engineering filtering:

326
↓
132 candidates

Structural analysis:

132
↓
94 passing alternatives

Optimization:

94
↓
11 Pareto-optimal alternatives

Engineer:

11
↓
selected solution


IMPORTANT:

Do NOT blindly send every theoretical alternative to FEM analysis.

KOPRUQ must use engineering knowledge to eliminate unreasonable alternatives before
expensive structural analysis.


============================================================
11. ENGINEERING RULES ENGINE
============================================================

The Engineering Rules Engine is one of the most important long-term intellectual
property components of KOPRUQ.

Examples:

IF BridgeType == PrecastGirder
AND SpanLength > AllowedMaximumSpan
THEN Reject

IF PierPosition intersects ForbiddenZone
THEN Reject

IF GirderDepth / SpanLength is outside allowed engineering limits
THEN Reject

IF PierSlenderness exceeds defined engineering limits
THEN Reject

IF Foundation geometry violates site constraints
THEN Reject

IMPORTANT:

Do NOT invent engineering rules.

I will provide engineering rules and validate them.

Every important engineering rule should eventually contain:

- Rule ID
- Description
- Category
- Engineering source
- Code/reference
- Units
- Input parameters
- Limit/value
- Assumptions
- Pass/fail logic
- Validation example
- Automated test

Engineering rules must NOT be hidden inside UI code.


============================================================
12. ALLPLAN CIVIL ROLE
============================================================

ALLPLAN Civil will initially serve as the primary external bridge engineering engine.

Possible responsibilities include:

- parametric bridge geometry
- structural analysis model
- construction stages
- prestressing
- traffic loading
- influence lines
- creep and shrinkage
- seismic analysis
- code checks
- final BIM model
- reinforcement
- quantities
- drawings

Initial integration concept:

KOPRUQ
↓
BridgeAlternative
↓
Kopruq.Allplan Adapter
↓
Tcl / API
↓
ALLPLAN Civil

Later:

ALLPLAN Civil
↓
Structural Results
↓
Kopruq.Allplan Adapter
↓
KOPRUQ Results Database


============================================================
13. ALLPLAN INTEGRATION STRATEGY
============================================================

Do NOT initially attempt full GUI automation.

The FIRST ALLPLAN milestone should be simple:

KOPRUQ generates a selected BridgeAlternative.

Kopruq.Allplan converts it into an ALLPLAN-compatible Tcl/API representation.

The engineer can then use that representation in ALLPLAN Civil.

Only after this is validated should we investigate:

- automatic ALLPLAN execution
- automatic model regeneration
- analysis execution
- result extraction
- batch processing
- automated final model generation

ALL ALLPLAN-specific code must remain inside the Kopruq.Allplan project.


============================================================
14. ANALYSIS ABSTRACTION
============================================================

Structural analysis must eventually use an abstraction such as:

IAnalysisEngine

Possible future implementations:

AllplanAnalysisEngine
MidasAnalysisEngine
SciaAnalysisEngine

KOPRUQ Core must not know which solver is being used.

This will allow us to use:

ALLPLAN Civil as the primary solver,

and potentially MIDAS Civil NX for advanced or independent verification.


============================================================
15. QUANTITIES, COST AND CARBON
============================================================

KOPRUQ shall eventually evaluate:

Concrete
Reinforcement
Structural Steel
Prestressing Steel
Pile Length
Earthworks
Other major quantities

These quantities shall support:

Cost calculations
CO2 calculations
Alternative comparison

Example:

Alternative #037

Concrete        5,850 m3
Rebar             760 t
Prestressing      118 t
Piles            1,440 m

Cost             8.10 M EUR
CO2              4,390 t

Cost and carbon databases must be independent from the structural model.


============================================================
16. OPTIMIZATION
============================================================

Optimization comes AFTER the deterministic engineering workflow works correctly.

Do NOT implement optimization during the first prototype.

Eventually KOPRUQ shall support multi-objective optimization.

Typical objectives:

MIN Cost
MIN CO2
MIN Concrete
MIN Reinforcement
MIN Structural Steel
MIN Prestressing
MIN Foundation Quantity
MIN Construction Duration

Subject to constraints such as:

ULS <= allowable
SLS <= allowable
Fatigue <= allowable
Deflection <= allowable
Stress <= allowable
Foundation Capacity >= Demand
Constructability == Acceptable

Pareto-front methods may eventually be used.


============================================================
17. AI AGENT
============================================================

AI is NOT the first development priority.

AI shall be added only after the deterministic computational workflow works.

Future example:

Engineer says:

"Re-optimize VIA-35.
Do not place piers inside the river.
Maximum span shall be 55 m.
Compare precast and steel-composite solutions.
Use 70% cost and 30% CO2 as optimization priorities."

The AI layer converts this request into deterministic KOPRUQ parameters.

AI DOES NOT determine structural safety.

AI DOES NOT invent engineering equations.

AI DOES NOT silently modify engineering assumptions.

Structural safety decisions remain within deterministic engineering logic and validated
analysis software.


============================================================
18. PROJECT FILE
============================================================

KOPRUQ shall have its own project format.

Example:

VIA35.kopruq

KOPRUQ project data must NOT simply be an ALLPLAN file.

Conceptually the project may contain:

Project Metadata
Bridge Definition
Design Space
Constraints
Engineering Rules
Alternatives
Analysis References
Optimization Results
Reports

JSON can initially be used for simple project serialization.

SQLite can later store large numbers of alternatives and results.


============================================================
19. PROPOSED SOLUTION STRUCTURE
============================================================

Create a modular solution concept similar to:

KOPRUQ.sln

src/

Kopruq.App
    Avalonia UI
    MVVM
    Application startup

Kopruq.Core
    Bridge Kernel
    Core domain objects
    Units
    Shared engineering concepts

Kopruq.Geometry
    Alignment
    Span layout
    Bridge geometry logic

Kopruq.Rules
    Engineering Rules Engine

Kopruq.Generative
    Alternative generation

Kopruq.Analysis
    Solver-independent analysis abstractions

Kopruq.Allplan
    ALLPLAN Civil adapter

Kopruq.Optimization
    Optimization infrastructure

Kopruq.Cost
    Cost calculations

Kopruq.Carbon
    Carbon calculations

Kopruq.Data
    Persistence
    JSON
    SQLite later

Kopruq.Reporting
    Reports

tests/

Kopruq.Core.Tests
Kopruq.Geometry.Tests
Kopruq.Rules.Tests
Kopruq.Generative.Tests

docs/

architecture.md
engineering-model.md
allplan-integration.md
roadmap.md


============================================================
20. DEVELOPMENT SEQUENCE
============================================================

Development MUST proceed incrementally.

DO NOT attempt to build the complete product at once.


---------------------------
P00 — PROJECT FOUNDATION
---------------------------

Create:

- solution
- projects
- dependencies
- tests
- documentation structure
- CLAUDE.md
- build configuration

Success criterion:

Complete solution builds successfully.


---------------------------
P01 — BRIDGE KERNEL
---------------------------

Create the minimum domain model necessary for a simple precast girder bridge.

Initial concepts:

Project
Bridge
SpanLayout
Span
Deck
Girder
Pier
Foundation
DesignSpace
BridgeAlternative

Use SI units.

Create automated tests.

Success criterion:

A bridge can be represented independently of ALLPLAN.


---------------------------
P02 — BASIC USER INTERFACE
---------------------------

Create a SIMPLE Avalonia UI.

Do NOT build the final visual dashboard yet.

Initial fields:

Bridge Name
Bridge Length
Deck Width
Minimum Span
Maximum Span
Minimum Girder Count
Maximum Girder Count
Minimum Girder Depth
Maximum Girder Depth

Button:

GENERATE

Use MVVM.

Success criterion:

UI data correctly reaches the Bridge Kernel / DesignSpace.


---------------------------
P03 — FIRST COMPUTATIONAL DESIGN ENGINE
---------------------------

Implement the first useful KOPRUQ capability.

Example input:

Bridge Length = 210 m
Deck Width = 13.80 m

Span Range = 30–45 m
Girder Count = 4–8
Girder Depth = 1.80–2.50 m

Generate feasible span-layout and girder alternatives.

Display alternatives in a table.

Success criterion:

Engineer starts KOPRUQ,
enters 210 m and 30–45 m,
presses GENERATE,
and receives meaningful bridge alternatives.


---------------------------
P04 — ENGINEERING RULES
---------------------------

Add rule infrastructure.

Do NOT invent engineering limits.

Implement only rules explicitly provided and approved by me.

Success criterion:

Generated alternatives can be accepted/rejected with traceable rule results.


---------------------------
P05 — BRIDGE PREVIEW
---------------------------

Add a simple bridge elevation/profile preview.

Do NOT build photorealistic 3D.

Success criterion:

Selected alternative can be visually inspected.


---------------------------
P06 — ALLPLAN ADAPTER
---------------------------

Implement initial Kopruq.Allplan adapter.

Input:

BridgeAlternative

Output:

ALLPLAN Civil Tcl/API representation.

Success criterion:

A bridge selected in KOPRUQ can be reproduced correctly in ALLPLAN Civil.


---------------------------
P07 — STRUCTURAL ANALYSIS INTEGRATION
---------------------------

After ALLPLAN geometry integration is validated:

KOPRUQ
→ ALLPLAN
→ Analysis
→ Results
→ KOPRUQ

Possible results:

Forces
Moments
Shear
Reactions
Deflections
Stresses
Utilization
Eigenvalues
Seismic results

Success criterion:

KOPRUQ can associate structural-analysis results with a BridgeAlternative.


---------------------------
P08 — QUANTITY / COST / CO2
---------------------------

Implement quantities.

Then cost.

Then carbon.

Success criterion:

Alternatives can be compared economically and environmentally.


---------------------------
P09 — GENERATIVE OPTIMIZATION
---------------------------

Only now implement optimization.

Workflow:

Design Space
→ Generate
→ Rules
→ Analysis
→ Quantity
→ Cost
→ Carbon
→ Optimize
→ Pareto Front

Success criterion:

KOPRUQ identifies multiple Pareto-optimal bridge alternatives.


---------------------------
P10 — PROFESSIONAL UI
---------------------------

Only after the workflow is proven, create the polished KOPRUQ interface.

Possible navigation:

Project
Geometry
Design Space
Generate
Analyze
Optimize
Results
Report

Include:

Bridge preview
Site/alignment
Terrain profile
Parameter controls
Alternative tables
Performance charts
Pareto front
Cost
CO2
Selected alternative panel
Open in ALLPLAN


---------------------------
P11 — AI AGENT
---------------------------

Add natural-language engineering interaction only after deterministic functionality
is validated.


---------------------------
P12 — ADDITIONAL SOLVER ADAPTERS
---------------------------

Possible future adapters:

MIDAS Civil NX
SCIA Engineer
Others


============================================================
21. SOFTWARE QUALITY REQUIREMENTS
============================================================

The software must be:

- modular
- maintainable
- testable
- auditable
- solver-independent
- unit-aware
- deterministic for engineering calculations
- extensible

Use clean architecture principles where they provide real value.

Avoid unnecessary abstraction and over-engineering.

Do NOT add large frameworks or dependencies without a clear reason.

Keep domain logic out of UI code.

Keep ALLPLAN-specific logic out of Kopruq.Core.

Keep optimization logic independent from UI.

Use dependency injection where appropriate.

Use async operations for long-running external analysis operations.

Provide useful logging and error handling.

Every engineering calculation must eventually be traceable.


============================================================
22. ENGINEERING SAFETY RULES
============================================================

This is professional structural-engineering software.

Therefore:

NEVER invent:

- equations
- code limits
- load factors
- material factors
- structural assumptions
- Eurocode clauses
- bridge-design rules

If an engineering requirement is missing:

STOP and ask me.

Do not guess.

When I provide an engineering formula, implement it with:

- explicit units
- assumptions
- source/reference
- tests
- known validation example

Do not allow AI-generated engineering logic to silently become production logic.


============================================================
23. YOUR ROLE AS CLAUDE CODE
============================================================

You are not expected to design the bridge.

I am the bridge engineer.

Your role is:

- software architect
- C# developer
- Avalonia developer
- test engineer
- integration developer
- documentation assistant
- refactoring assistant

I will provide:

- engineering requirements
- design rules
- structural assumptions
- bridge-specific knowledge
- validation examples

You will convert them into reliable software.


============================================================
24. IMPORTANT WORKING METHOD
============================================================

DO NOT write the entire KOPRUQ application now.

We will work milestone by milestone.

For every milestone:

1. Explain what you intend to implement.
2. Identify assumptions.
3. Ask me about missing ENGINEERING information.
4. Do not ask unnecessary software questions that you can reasonably resolve yourself.
5. Implement only the approved scope.
6. Build the solution.
7. Run tests.
8. Fix build/test errors.
9. Summarize what changed.
10. Update documentation.
11. Stop before beginning the next milestone.

Never silently move from one milestone to another.


============================================================
25. CURRENT TASK
============================================================

We are starting from ZERO.

Do NOT implement P01 or later milestones yet.

Your current task is ONLY P00.

First:

1. Read and understand this entire specification.
2. Do NOT start coding immediately.
3. Propose the KOPRUQ software architecture.
4. Review whether C# + .NET + Avalonia UI + MVVM is appropriate.
5. Propose the exact Visual Studio / .NET solution structure.
6. Propose project dependencies.
7. Identify any architectural risks.
8. Identify decisions that should be made now versus decisions that should be postponed.
9. Create or propose the contents of CLAUDE.md.
10. Create or propose docs/architecture.md.
11. Create or propose docs/roadmap.md.

Before implementing P00, show me your proposed P00 plan.

Wait for my approval.

Do NOT implement bridge engineering calculations.

Do NOT implement optimization.

Do NOT implement ALLPLAN integration.

Do NOT implement the final UI.

We will build KOPRUQ incrementally.
