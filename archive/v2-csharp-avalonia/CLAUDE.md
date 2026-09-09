# CLAUDE.md

Guidance for Claude Code sessions working in this repository.

## What this is

SPANOVA is a Computational & Generative Bridge Design platform being built
incrementally with the engineer, milestone by milestone. The authoritative
specification is `docs/SPANOVA_MASTER_SPEC.md` — read it before making any
architectural decision. `docs/architecture.md` and `docs/roadmap.md` record
how the spec is being implemented and what is done so far.

An earlier, ad-hoc build of this same idea exists under `archive/` for
reference. It was set aside (not deleted) when the engineer asked to
restart from zero under the more disciplined process below — do not treat
anything in `archive/` as current or as a source of approved decisions.

## The working method (spec section 24) — this is not optional

1. Work milestone by milestone (see `docs/roadmap.md` for the current one).
   Never implement a milestone that has not been explicitly approved.
2. Before implementing a milestone: explain what you intend to build,
   state your assumptions, and ask about missing **engineering**
   information. Don't ask software questions you can reasonably resolve
   yourself.
3. Implement only the approved scope. Build the solution. Run tests. Fix
   errors. Summarize what changed. Update `docs/architecture.md` and
   `docs/roadmap.md`.
4. Stop. Do not silently continue into the next milestone.

## Engineering safety rules (spec section 22) — hard rules

- **Never invent** equations, code limits, load factors, material
  factors, structural assumptions, Eurocode/AASHTO clauses, or bridge
  design rules of any kind.
- If an engineering requirement is missing, **stop and ask** the
  engineer. Do not guess, and do not fill the gap with a "reasonable
  default" — there is no such thing for structural safety.
- When the engineer provides a formula, implement it with: explicit
  units, stated assumptions, a source/reference, a validation example,
  and an automated test.
- AI-generated engineering logic must never silently become production
  logic.

## Architectural rules (spec sections 3, 21)

- `Spanova.Core` (the Bridge Kernel) must never reference ALLPLAN, MIDAS,
  SCIA, or any solver/BIM-specific type. External systems are reached
  only through adapter projects (`Spanova.Allplan`, future
  `Spanova.Midas`, `Spanova.Scia`).
- All internal engineering lengths/quantities use SI units, unambiguously.
- Keep domain logic out of UI code. Keep ALLPLAN-specific logic out of
  `Spanova.Core`. Keep optimization logic independent of the UI.
- Do not add a project reference, package, or abstraction ahead of the
  milestone that needs it (see `docs/roadmap.md`'s per-project
  dependency notes) — this project builds forward, one approved gate at
  a time, not by scaffolding capability early "because it'll be useful."

## Repository layout

```
SPANOVA.sln
src/            16 projects — see docs/architecture.md for the full dependency graph
tests/          Spanova.Core.Tests, Spanova.Geometry.Tests, Spanova.Rules.Tests, Spanova.Generative.Tests
docs/           SPANOVA_MASTER_SPEC.md (authoritative), architecture.md, roadmap.md
archive/        Superseded first-pass build — reference only, not current
```

## Build & test

```bash
dotnet build
dotnet test
```

Target framework: `net10.0` (Avalonia's `Spanova.App` is cross-platform;
ALLPLAN/MIDAS/SCIA adapters will only ever run on Windows, so treat
Windows as the primary target without deliberately breaking other
platforms in `Spanova.Core`/UI code).
