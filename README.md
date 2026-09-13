# SPANOVA

**Computational & Generative Bridge Design platform.** SPANOVA turns a
bridge site (alignment, constraints, span search ranges) and a design
space (superstructure/pier/girder families, materials, loads) into
generated, analyzed, and eventually optimized structural alternatives -
built incrementally, milestone by milestone, with a senior bridge/
structural engineer.

This is the **second** build generation, on a polyglot stack (Java
backend + React frontend). An earlier C#/.NET/Avalonia build reached its
own P05 before the engineer moved the whole platform to this stack; it's
kept under `archive/` for reference only, not a completed prerequisite.

## Where to start reading

| Document | What it's for |
| --- | --- |
| `docs/SPANOVA_MASTER_SPEC.md` | The authoritative specification - domain model, milestone plan (P00-P12), the hard engineering-safety and milestone-gating rules. Read this first. |
| `docs/ARCHITECTURE_AMENDMENT_V2.md` | Replaces the original C#/.NET/Avalonia stack with the polyglot architecture described below - amends the master spec, doesn't replace it. |
| `docs/SITE_LAYOUT_PLATFORM_ANALYSIS.md` | A later, additive architecture change: bridge length and abutment/pier positions become *generated* design variables (a new `BridgeLayoutEngine`) instead of hand-typed inputs; SPANOVA gets its own native analysis engine, with MIDAS NX kept only as a post-selection verification tier. |
| `docs/architecture.md` | Dated log of what has actually been built and verified, and how - the implementation record. |
| `docs/roadmap.md` | Current milestone-by-milestone status table - what's done, what's next. |
| `CLAUDE.md` | Working rules for AI-assisted development in this repo (milestone gating, "never invent engineering content," module boundaries). |

## Repository layout

```
backend/
  bridge-core/          domain model (Project, Bridge, Span, Girder, Pier, ...) - no framework deps
  spatial-core/          CoordinateSystem, Point3D - coordinate geometry
  alignment/              chainage <-> XYZ conversion for site alignments
  constraints/            NoPierZone and other layout constraints
  bridge-layout/          BridgeLayoutEngine - generates candidate bridge layouts
  rules-engine/           design-rule infrastructure (only engineer-approved rules)
  generative-engine/      structural-alternative generation
  analysis-api/           analysis engine port/interface (solver-agnostic)
  analysis-engine/        native linear-elastic 3D direct-stiffness solver
  midas-adapter/          MIDAS Civil NX integration (post-selection verification tier)
  api/                    Spring Boot REST API - the only module depending on Spring

frontend/
  src/app/                app shell: routing, layout (Sidebar/TopBar), providers, global styles
  src/pages/              screens that compose more than one feature (currently just Home)
  src/features/<domain>/  one folder per domain screen (project, materials, loads,
                           pier-families, girder-library, layout-generator, ...),
                           each with components/, and model/ or api/ as needed
  src/shared/             domain-free UI primitives and helpers reused across features

docs/                    specs, architecture log, roadmap (see table above)
archive/                 two earlier, superseded build generations - reference only
```

## Quick start

Requires JDK 21, Node.js LTS, and Apache Maven on `PATH`. From the repo
root:

```bash
start-dev.bat
```

Builds the backend, then opens the backend (`http://localhost:8080`)
and frontend dev server (`http://localhost:5173`) each in their own
window. Or run them separately:

```bash
# Backend
cd backend && mvn -B package
java -jar backend/api/target/api-*.jar   # then curl http://localhost:8080/actuator/health

# Frontend
cd frontend && npm install
npm run dev        # dev server at http://localhost:5173
npm run build       # typecheck + production build
npm test            # Vitest
npm run lint         # oxlint
```

On Windows PowerShell, use `npm.cmd` instead of `npm` if execution
policy blocks the `npm.ps1` shim.

## Status

Frontend: full navigation shell (sidebar/top bar, dark/light theme),
real screens for Project Information/Dashboard, Materials, Loads, Cost
Database, Pier Families, Girder Library, Superstructure Families,
Layout Generator, Bridge Alternatives, and the SPANOVA Fast Solver -
built on React Router, TanStack Query, React Hook Form + Zod, and a
small `app/features/shared` domain-sliced architecture (see
`docs/architecture.md`'s matching sections for how and why). Backend:
bridge-core domain model, a native linear-elastic 3D frame analysis
engine (validated against closed-form results and a real worked
example), the LAYOUT-P01 bridge-layout generator, and a MIDAS NX
adapter with a verified round trip. See `docs/roadmap.md` for the exact
milestone table and what's still not started (MIDAS analysis
integration, quantities/cost/carbon, optimization, AI service).

No real MIDAS NX analysis integration, real GIS/terrain data, or
optimization exists yet - screens for those areas say so explicitly
rather than showing invented data (spec section 22: never invent
engineering content).
