# SPANOVA Architecture

Status: P00 (project foundation) only. No domain model, UI content, or
engineering logic exists yet — see `docs/roadmap.md` for what each
milestone will add. This document describes the *shape* of the system;
it will be extended, not rewritten, as milestones land.

## Core architectural principle (spec section 3)

SPANOVA has its own independent **Bridge Kernel** (`Spanova.Core`). It
must never depend on ALLPLAN, MIDAS, SCIA, a specific FEM solver, or a
specific BIM format. External engineering applications are reached only
through adapter projects.

```
                    SPANOVA
                       |
                 BRIDGE KERNEL (Spanova.Core)
                       |
       +---------------+---------------+
       |               |               |
    ALLPLAN          MIDAS           SCIA
    Adapter          Adapter         Adapter
   (Spanova.Allplan) (future)        (future)
```

## Solution structure (spec section 19)

```
SPANOVA.sln
src/
  Spanova.App            Avalonia UI, MVVM, application startup
  Spanova.Core            Bridge Kernel - core domain objects, units, shared concepts
  Spanova.Geometry         Alignment, span layout, bridge geometry logic
  Spanova.Rules            Engineering Rules Engine
  Spanova.Generative       Alternative generation
  Spanova.Analysis          Solver-independent analysis abstractions (IAnalysisEngine)
  Spanova.Allplan          ALLPLAN Civil adapter
  Spanova.Optimization      Optimization infrastructure
  Spanova.Cost               Cost calculations
  Spanova.Carbon             Carbon calculations
  Spanova.Data              Persistence: JSON now, SQLite later
  Spanova.Reporting          Reports
tests/
  Spanova.Core.Tests
  Spanova.Geometry.Tests
  Spanova.Rules.Tests
  Spanova.Generative.Tests
docs/
  SPANOVA_MASTER_SPEC.md   Authoritative specification
  architecture.md          This file
  roadmap.md               Milestone status
```

## Dependency graph

All 16 projects currently exist as **empty skeletons** (P00's own success
criterion is only "complete solution builds successfully" - spec section
20). Their reference graph is deliberately minimal today and is meant to
grow *only* when the milestone that needs a new edge is approved and
implemented - not ahead of time:

```
Spanova.Core                          (no dependencies)
Spanova.Geometry                      (no dependencies yet)
Spanova.Rules            -> Core
Spanova.Generative       -> Core, Rules
Spanova.Analysis          -> Core
Spanova.Allplan           -> Core
Spanova.Optimization       -> Core
Spanova.Cost                -> Core
Spanova.Carbon               -> Core
Spanova.Data                -> Core
Spanova.Reporting            -> Core
Spanova.App               -> Core, Generative, Rules  (Rules added in P04 - see below)

Spanova.Core.Tests        -> Core
Spanova.Geometry.Tests    -> Geometry
Spanova.Rules.Tests       -> Rules
Spanova.Generative.Tests  -> Generative
```

**Why `Spanova.App` only references `Spanova.Core` right now:** the UI
milestone (P02) only needs to read/write `DesignSpace`/`Bridge` fields
that will be added to `Spanova.Core` in P01. References to
`Spanova.Generative` (P03), `Spanova.Rules` (P04), `Spanova.Data` (P02's
own save/load, or later), and `Spanova.Allplan` (P06) are added exactly
when that milestone wires the corresponding feature in - not before. If
you find yourself adding a project reference for a class that doesn't
exist yet, stop: that's a sign of building ahead of the approved
milestone.

`Spanova.Geometry` has no dependency on `Spanova.Core` yet because
nothing has decided whether geometry primitives sit below or above the
kernel's own types - that decision is deferred to whichever milestone
first needs geometry content (see `docs/roadmap.md`).

## Units

Spec section 7: "All internal engineering data shall use a consistent SI
unit strategy. Engineering units must never be ambiguous."

**Resolved in P01:** plain `double` fields, always meters, always named
with an explicit `M` suffix (`TotalLengthM`, `DepthM`, `SpacingM`, ...).
No dedicated `Length`/`Quantity` value type yet - revisit only if a real
need appears (e.g. a milestone that must convert to/from a non-SI unit
at a boundary, such as an ALLPLAN or MIDAS adapter).

## P01 domain model (`Spanova.Core/Model`)

```
Project
├── Bridge                 (BridgeName, TotalLengthM, DeckWidthM)
├── DesignSpace             (Min/Max ranges - see below)
├── GeneratedAlternatives : List<BridgeAlternative>
└── SelectedAlternativeId : Guid?

BridgeAlternative           (P01's success-criterion type - spec section 20)
├── SpanLayout : { Spans: IReadOnlyList<Span> }, Span = { LengthM }   (required)
├── Girder                  (Count, DepthM, SpacingM)                (required)
├── Deck?                   (SlabThicknessM)                         (nullable - not sized until Deck enumeration is approved)
├── Pier?                   (DiameterM, HeightM, PierType: string)   (nullable - not sized until Pier enumeration is approved)
└── Foundation?             (Type: Spread|Pile, PileCount?, PileDiameterM?) (nullable - ditto)

DesignSpace: Min/Max for Span, GirderCount, GirderSpacing, GirderDepth,
             SlabThickness, PierDiameter, PierHeight - every field name
             taken directly from spec section 9.
```

Every field above is traceable to spec sections 6-9 - none were
invented. Two intentional gaps, both because the spec does not name the
missing parameters (spec section 22 forbids guessing them):

- **Spread-footing dimensions.** `Foundation` only models pile
  dimensions (`PileCount`, `PileDiameterM`, spec section 9). Spread
  footings (`FoundationType.Spread`, spec section 7) have no sizing
  fields yet - ask the engineer what parameters describe one at this
  preliminary-design level before adding them.
- **Pier type taxonomy.** `Pier.PierType` is a free-text string, not an
  enum, because the spec names "Pier Type" as a variable (section 9) but
  never lists the allowed values.

## P02 UI (`Spanova.App`)

`MainWindow`/`MainViewModel` now hold real content: the 9 fields spec
section 20 names, bound via a hand-rolled `ObservableObject`/
`RelayCommand` pair (no MVVM package - spec section 21, avoid
unnecessary abstraction/dependencies). `Spanova.App` still references
only `Spanova.Core`, exactly as planned in P00 - GENERATE builds a
`Project` in-memory and displays it back as plain text; it does not call
into `Spanova.Generative`, `Spanova.Rules`, or `Spanova.Data`, since none
of those are wired in yet (see the dependency graph above).

## P03 generation (`Spanova.Generative`)

`AlternativeGenerator.Generate(Bridge, DesignSpace)` enumerates uniform
span layouts (span count N where `TotalLengthM / N` lands inside
`[MinSpanM, MaxSpanM]`) crossed with every girder count in range and
every girder depth in range (stepped by `DesignSpace.GirderDepthStepM`).
Every combination that satisfies those ranges is returned - there is no
separate acceptance/rejection step yet, because that is `Spanova.Rules`'
job (P04) and `Spanova.Rules` has no content until then. `Spanova.App`
now depends on `Spanova.Generative` (planned since P00, activated now).

## P04 rule infrastructure (`Spanova.Rules`)

`IEngineeringRule` + `RuleEngine` exist and are tested, but **the engine
runs with zero rules** - none has been approved by the engineer yet
(spec section 22). `AlternativeGenerator.GenerateWithRules` composes
P03's generator with P04's engine so every generated alternative carries
a traceable pass/fail result; today that result is always "pass"
vacuously. Do not add a rule to this project without the engineer's
explicit approval, source reference, and a validation-example test - see
CLAUDE.md.

## P05 elevation preview (`Spanova.App`)

Pure view-layer code (`MainWindow.axaml.cs`'s `DrawElevation`), no new
`Spanova.Core`/`Generative`/`Rules` types. Renders from `AlternativeRow`
data already on screen (span count, span length, girder depth) - it does
not need `Pier`/`Foundation`, and does not invent values for them since
they remain `null`. Kept in code-behind rather than a bindable shape
collection because a schematic 2D drawing with computed positions is
simpler to express procedurally than declaratively for this milestone's
scope; revisit if the preview grows more interactive.

## Open questions carried into P06+

- Whether `Spanova.Geometry` types are used *by* `Spanova.Core`'s domain
  objects (e.g. `Bridge.Alignment`) or sit as a separate, later-composed
  layer. Still undecided - no milestone has needed alignment/terrain
  data yet.
- Where `IAnalysisEngine` (spec section 14) is declared - likely
  `Spanova.Analysis`, but not decided until P07.
