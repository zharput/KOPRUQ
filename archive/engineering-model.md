# SPANOVA Engineering Model

Status: Prototype P01 slice only. Extend this file as `Spanova.Core`
grows toward the full Bridge Kernel hierarchy in
`SPANOVA_MASTER_SPEC.md` section 5.

## Units

All lengths inside `Spanova.Core` are **meters**, stored as `double`. No
other unit system is used internally (spec section 5: "All internal
engineering units shall use SI units"). Adapters (e.g. `Spanova.Allplan`)
are responsible for converting to whatever unit the external system
expects, at the boundary - `Spanova.Core` itself never carries a unit
suffix or conversion factor.

## Domain objects implemented so far

### `BridgeDefinition`
Fixed facts about the bridge that do not vary between generated
alternatives: `BridgeName`, `TotalLengthM`, `DeckWidthM`.

### `DesignSpace`
The ranges the engineer is willing to consider: span range, girder-count
range, girder-depth range, plus `GirderDepthStepM` (an enumeration
control, not an engineering quantity - see `docs/architecture.md`, Open
Assumption 2).

### `BridgeAlternative`
One concrete point in the design space: an ordered list of span lengths,
a girder count, and a girder depth. Derived properties: `SpanCount`,
`TotalLengthM`, `IsUniformSpan`.

### `SpanovaProject`
The persisted root: project metadata, one `BridgeDefinition`, one
`DesignSpace`, the list of `GeneratedAlternatives`, and the engineer's
`SelectedAlternativeId`.

## Feasibility rules implemented so far (`Spanova.Rules`)

All four rules currently shipped are **definitional consequences of the
engineer's own inputs** - none encode an independent structural
engineering standard or ratio (see `docs/architecture.md`, Open
Assumption 3, for why):

| Rule ID              | Checks                                                        |
|-----------------------|----------------------------------------------------------------|
| `SPAN-RANGE`           | Every span length is within `[MinSpanM, MaxSpanM]`            |
| `SPAN-SUM-LENGTH`      | Sum of spans equals `BridgeDefinition.TotalLengthM` (±1 cm)   |
| `GIRDER-COUNT-RANGE`   | `GirderCount` is within `[MinGirderCount, MaxGirderCount]`     |
| `GIRDER-DEPTH-RANGE`   | `GirderDepthM` is within `[MinGirderDepthM, MaxGirderDepthM]`  |

## What is explicitly NOT modeled yet

Per spec section 17 (P01 scope) and section 15 (do not invent equations):

- Structural analysis of any kind (no ULS/SLS/deflection/fatigue checks).
- Structural proportioning rules (span/depth ratios, girder spacing
  limits, pier slenderness, etc.) - these need a cited source before
  they can be added.
- Cost, carbon, or optimization objectives.
- Alignment, terrain, or geotechnical data.
- Non-uniform span layouts, piers, abutments, foundations, bearings,
  expansion joints, prestressing, construction stages - all present in
  the target Bridge Kernel hierarchy (spec section 5) but out of scope
  for P01.

When any of these is implemented, add its formulas here with source,
units, assumptions and a validation example, per spec section 15.
