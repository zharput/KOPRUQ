# SPANOVA Roadmap

Milestones below follow `SPANOVA_MASTER_SPEC.md`. Only P01 is implemented
today - see the status column.

| Milestone | Scope | Status |
|---|---|---|
| **P01** | New project, PROJECT/DESIGN SPACE/GENERATE/RESULTS UI, uniform-span precast-girder alternative generation filtered by definitional rules, save/load `.spanova`, draft ALLPLAN Civil Tcl export for the selected alternative (spec section 17) | **Implemented** (this session) |
| P02 (proposed, not started) | Real structural proportioning rules with cited sources (span/depth ratios, girder spacing) in `Spanova.Rules`; non-uniform span layouts in `Spanova.Generative` | Not started |
| P03 (proposed, not started) | `Spanova.Analysis` result contracts + a real ALLPLAN Civil adapter, once its Tcl/API is verified (see `docs/allplan-integration.md`) | Not started |
| P04 (proposed, not started) | `Spanova.Optimization` (Pareto front over analyzed alternatives), `Spanova.Cost`, `Spanova.Carbon` with cited unit costs/emission factors | Not started |
| Later phases | MIDAS Civil NX adapter, SCIA Engineer adapter, AI-assisted interface, additional bridge systems (PSC box girder, steel composite, balanced cantilever, MSS/FSM, ILM) | Not started - spec explicitly defers these |

P02+ names and scope above are this repository's own proposal for how to
sequence the remaining spec sections, not a commitment made in the master
spec - confirm with the user before starting any of them, per
`CLAUDE.md`.

## P01 - implemented in this session

- [x] `Spanova.Core`: `BridgeDefinition`, `DesignSpace`, `BridgeAlternative`, `SpanovaProject`
- [x] `Spanova.Rules`: `IEngineeringRule`, `RuleEngine`, 4 definitional rules
- [x] `Spanova.Generative`: `AlternativeGenerator` (uniform-span enumeration + rule filtering)
- [x] `Spanova.Data`: `.spanova` JSON save/load
- [x] `Spanova.Allplan`: draft Tcl export (unverified schema, see `docs/allplan-integration.md`)
- [x] `Spanova.App`: WPF window with PROJECT | DESIGN SPACE | GENERATE | RESULTS tabs
- [x] Automated tests: `Spanova.Core.Tests`, `Spanova.Rules.Tests`, `Spanova.Generative.Tests`
- [x] Placeholder skeletons for `Spanova.Geometry`, `Spanova.Analysis`, `Spanova.Optimization`, `Spanova.Cost`, `Spanova.Carbon`, `Spanova.Reporting`

## Explicitly out of scope for P01 (per spec section 17)

- No structural analysis
- No AI agent
- No optimization algorithm
- No MIDAS integration
