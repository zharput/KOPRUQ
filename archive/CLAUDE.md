# CLAUDE.md

Guidance for Claude Code sessions working in this repository.

## What this is

SPANOVA - a Computational & Generative Bridge Design platform. It is NOT a
structural analysis or BIM tool; it is a generation/rules/optimization
layer that sits above external engineering software (ALLPLAN Civil first,
MIDAS Civil NX and SCIA Engineer later). See `SPANOVA_MASTER_SPEC.md` for
the full product specification - it is the source of truth for scope and
architecture decisions. `docs/architecture.md`, `docs/roadmap.md` and
`docs/allplan-integration.md` record how the spec has been interpreted so
far and what remains open.

## Hard rules from the spec (do not relax these without the user's say-so)

- **`Spanova.Core` must stay solver-independent.** No ALLPLAN/MIDAS/SCIA
  types, no FEM concepts, inside `Spanova.Core`. External systems are
  reached only through adapter projects (`Spanova.Allplan`, and future
  `Spanova.Midas` / `Spanova.Scia`).
- **All engineering lengths are meters (SI)**, stored as `double`, inside
  `Spanova.Core`. Convert at the edges (e.g. the ALLPLAN adapter) if a
  target system needs different units.
- **Never invent engineering equations, ratios, or unit costs/emission
  factors.** If a formula or numeric constant is not explicitly given by
  the user or a cited standard, do not add it silently. Flag it instead -
  as a TODO, a question to the user, or (for a completed piece of work) a
  clearly labeled assumption in the code's doc comment and in
  `docs/architecture.md`'s "Open Assumptions" section.
- **Rules live in `Spanova.Rules`, not in UI code**, and every rule needs
  an automated test in `Spanova.Rules.Tests`.
- **Do not implement a bridge type, module, or feature beyond what the
  current prototype milestone asks for** (see `docs/roadmap.md`). The
  solution's project skeleton follows the spec's full architecture
  (section 11), but most projects are intentionally placeholder-only
  (`ModuleStatus.cs`) until a milestone activates them - do not fill
  those in speculatively.

## Repository layout

```
SPANOVA.sln
src/            Spanova.App.Avalonia (UI), Spanova.Core, Spanova.Geometry, Spanova.Rules,
                Spanova.Generative, Spanova.Analysis, Spanova.Allplan,
                Spanova.Optimization, Spanova.Cost, Spanova.Carbon,
                Spanova.Data, Spanova.Reporting
tests/          Spanova.Core.Tests, Spanova.Rules.Tests, Spanova.Generative.Tests
docs/           architecture.md, engineering-model.md, allplan-integration.md, roadmap.md
SPANOVA_MASTER_SPEC.md   The original product specification (do not edit; append clarifications to docs/ instead)
```

## Build & test

```bash
dotnet build
dotnet test
```

Target framework: `net10.0` (`net10.0-windows` for `Spanova.App`, which
uses WPF and is Windows-only). No external MVVM/DI packages are used yet
(`RelayCommand`/`ObservableObject` in `Spanova.App` are hand-rolled) -
keep it that way unless the user asks for one.

## Working style expected on this project

- Read `SPANOVA_MASTER_SPEC.md` and `docs/roadmap.md` before adding a
  feature - confirm which prototype milestone it belongs to.
- When a spec passage is ambiguous, prefer the simplest reading that is
  still faithful to the text, document the assumption inline, and surface
  it in the response to the user rather than silently deciding.
- Keep `Spanova.Core` free of any UI, persistence, or external-system
  concerns.
- Every new rule or generative-engine behavior change needs a test.
