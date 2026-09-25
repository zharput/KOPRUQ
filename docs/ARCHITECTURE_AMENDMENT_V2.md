# Architecture Amendment v2 (2026-09-09)

This amends `docs/KOPRUQ_MASTER_SPEC.md` sections 3, 4, 12-14 and 19-20.
The master spec file itself is kept verbatim as the historical record of
what was originally decided; this document is the current source of
truth for the technology stack and adapter target. Everything else in
the master spec (product vision, engineering safety rules, working
method, rules-engine philosophy, milestone *content*) is unchanged.

## What changed

**Technology stack** - replaces spec section 4 in full:

| Component | Responsibility | Technology |
|---|---|---|
| Frontend | Project, design space, generate, results, report cockpit | React + TypeScript; talks to backend over REST/JSON |
| Backend API | Use-case orchestration, authorization, workflow, audit | Spring Boot modular monolith |
| Bridge Core | Solver-independent bridge model and invariants | Plain Java domain, no framework dependency |
| Rules Engine | Deterministic feasibility and explainable reject reasons | Versioned rules + test vectors |
| Generative Engine | Design-space combination, pruning, alternative identity | Deterministic and repeatable |
| Analysis API | Job, status, cancel, retry and result contracts | Port/interface, adapter-independent |
| MIDAS NX Adapter | Canonical model -> Tcl; later execution/result retrieval | Separate Windows worker boundary |
| Optimization Service | Multi-objective search and Pareto | Python/FastAPI - after P01 |
| AI Service | NLP -> validated structured command; explanation/RAG | Python/FastAPI - after P01 |

**Primary analysis solver/adapter** - replaces spec sections 12-14's
ALLPLAN-first framing: **MIDAS Civil NX**, not ALLPLAN Civil. The
engineer's stated reason: structural analyses need loads, bearing and
soil-parameter input (and eventually an optimization module) that live
naturally in MIDAS NX's own domain. This is also the adapter Claude has
real, verified experience with (see the MIDAS Civil NX MAPI work earlier
in this project's session history: node/element/material/section
creation, load application, running an analysis, and pulling reaction
and displacement results over the cloud API) - unlike ALLPLAN Civil's
Tcl/API, which was never verified (this was P06's original blocker
before the pivot).

**Milestone content remapped** (numbering P00-P12 unchanged, spec
section 20):
- P06 was "ALLPLAN Adapter" -> now **MIDAS NX Adapter** (canonical
  BridgeAlternative -> MIDAS model, spec section 13's "no GUI automation
  first" principle still applies, just targeting MIDAS's MAPI instead of
  ALLPLAN's Tcl)
- P07 was "ALLPLAN Analysis Adapter" -> now **MIDAS NX Analysis
  Integration** (run the analysis, retrieve results)
- P12 was "MIDAS/SCIA adapters" (solver independence) -> now **SCIA
  Engineer adapter, and ALLPLAN Civil if wanted later** - the
  `IAnalysisEngine` port/interface (spec section 14, now living in
  Analysis API) still exists specifically so MIDAS is not hard-wired
  into Bridge Core/Rules/Generative Engine.

## What did NOT change

- The P00-P12 milestone *sequence and gating discipline* (spec section
  24: explain -> assumptions -> ask engineering questions -> approved
  scope only -> build/test -> stop).
- Engineering safety rules (spec section 22) - still never invent
  equations/limits/rules.
- The Bridge Kernel independence principle (spec section 3) - Bridge
  Core must not depend on MIDAS, ALLPLAN, SCIA or any solver; the MIDAS
  NX Adapter is the only place MIDAS-specific code may live (mirrors the
  old "keep ALLPLAN-specific logic out of Kopruq.Core" rule, spec
  section 21).
- The project file concept, quantities/cost/carbon phasing, optimization
  timing (after the deterministic workflow), AI policy - all unchanged.

## Repository consequence

The previous two build generations (informal C#/WPF, then disciplined
C#/.NET/Avalonia through P05) are archived under `archive/`, not
deleted:
- `archive/` (root-level `src`/`tests`/etc. before this amendment) -
  the original informal build.
- `archive/v2-csharp-avalonia/` - the milestone-gated C#/.NET/Avalonia
  build (P00 through P05 complete, P05 included a real bugfix worth
  reading if the new frontend ever needs equivalent selection/rendering
  logic).

Neither is source for the new stack; both are reference only.
