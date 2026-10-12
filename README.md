# KOPRUQ

**Computational & Generative Bridge Design platform.** KOPRUQ turns a
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
| `docs/KOPRUQ_MASTER_SPEC.md` | The authoritative specification - domain model, milestone plan (P00-P12), the hard engineering-safety and milestone-gating rules. Read this first. |
| `docs/ARCHITECTURE_AMENDMENT_V2.md` | Replaces the original C#/.NET/Avalonia stack with the polyglot architecture - amends the master spec, doesn't replace it. Its "Revision 2026-10-12" section defines the current backend structure. |
| `docs/architecture/backend-reference.md` | The backend's architectural target: rules R1-R16 taken from the reference project ([spanova-backend](https://github.com/CemHarput/spanova-backend) @ `6beb984`) and how KOPRUQ applies them. |
| `docs/SITE_LAYOUT_PLATFORM_ANALYSIS.md` | Bridge length and abutment/pier positions become *generated* design variables (`BridgeLayoutEngine`); KOPRUQ gets its own native analysis engine, with MIDAS NX kept as a post-selection verification tier. |
| `docs/architecture.md` | Dated log of what has actually been built and verified, and how - the implementation record. |
| `docs/roadmap.md` | Milestone-by-milestone status table, including the BACKEND-REMEDIATION, BACKEND-ARCHITECTURE and BACKEND-MODULAR-MONOLITH tracks. |
| `docs/reviews/` | Project review reports (architecture, code quality, findings) for the frontend and backend. |
| `docs/features/<slug>/` | Per-feature request, approved plan and implementation report. |
| `CLAUDE.md` | Working rules for AI-assisted development in this repo (milestone gating, "never invent engineering content", backend structure). |

## Repository layout

```
backend/                     one Maven module (kopruq-backend), Spring Boot 3.5, Java 21
  pom.xml
  src/main/java/com/kopruq/
    KopruqApplication.java   application entry point
    shared/                  cross-cutting: config (bean wiring, CORS, correlation id),
                             exception (one API error contract), validation
    <domain>/                one package per domain, sub-packages only where needed:
      api/                     controllers, request/response DTOs, mappers
      application/             use-case services, ports and repository interfaces
      domain/                  framework-free domain services and algorithms
      model/                   domain models that own their business rules/invariants
      enums/                   domain enums
      infra/                   adapters (in-memory repositories, solver adapters)
    domains:
      geometry               CoordinateSystem, Point3D
      alignment              chainage <-> XYZ, vertical profile, chainage sampling
      terrain                terrain TIN import (XYZ), elevation queries
      landxml                LandXML parsing and import (surfaces, alignments, profiles)
      loads                  EN 1991-2 traffic (LM1, notional lanes) + wind, seismic, temperature
      materials              EN 1992-1-1 concrete properties and strength classes
      layout                 BridgeLayoutEngine, NoPierZone constraints
      bridge                 bridge domain model (Bridge, DesignSpace, Span, Girder, Pier, ...)
      rules                  rule-engine infrastructure (only engineer-approved rules)
      generative             alternative generation + rule evaluation
      analysis               solver-agnostic port, frame model builder, native solver
                             (infra/nativeengine), MIDAS Civil NX adapter (infra/midas)
  src/main/resources/application.properties
  src/test/java/com/kopruq/  tests beside their subject; contract/ pins the REST API,
                             architecture/ enforces the package boundaries

frontend/
  src/app/                app shell: routing, workspace layout, providers, global styles
  src/pages/              screens that compose more than one feature
  src/features/<domain>/  one folder per domain screen (project, materials, loads,
                           pier-families, girder-library, graph, layout-generator, ...),
                           each with components/, and model/ or api/ as needed
  src/shared/             UI primitives, project-file handling and helpers reused across features

docs/                    specs, architecture log, roadmap, reviews, feature plans
archive/                 two earlier, superseded build generations - reference only
```

## Backend architecture

The backend is a **Spring Boot modular monolith in a single Maven
module**, laid out like the reference project (decision of 2026-10-12;
see `CLAUDE.md` and `docs/architecture/backend-reference.md`):

- **Domains are packages**, not Maven modules. Boundaries are enforced by
  `com.kopruq.architecture.ArchitectureTests` (package/import allow-lists,
  run with every build).
- **Spring** is used in `api`, `application`, `infra` and `shared.config`.
  `model` and `domain` packages import no Spring and no
  `application`/`api` code.
- **Business rules live in the domain models** (or a `domain` service when
  they span several models); controllers only map requests/responses and
  call an application service.
- **Solver independence:** bridge/rules/generative never reference
  MIDAS, SCIA or ALLPLAN. MIDAS-specific code lives only in
  `analysis/infra/midas`, behind the analysis port; the port uses SI units
  (m, kN, kN/m², kN/m³, t/m³, rad).
- **One error contract** for `/api/**`: `{timestamp, status, error, code,
  message, path, correlationId, errors[]}`; 5xx responses never leak
  internal messages.
- **Correlation id:** every response carries `X-Correlation-ID`, also
  written to each log line.
- **CORS** is configured once (`kopruq.cors.allowed-origins`, default
  `http://localhost:5173`).
- **No persistence yet:** imports are kept in in-memory repositories and
  are lost on restart. JPA/PostgreSQL is a future, separately approved
  milestone.

REST endpoints (all under `/api`): `kernel-state`, `alternatives`,
`layout`, `alignment`, `terrain`, `landxml`, `fast-solver`,
`materials/concrete`, `traffic-loads`, `wind-loads`, `seismic`,
`temperature`; plus `/actuator/health`.

## Quick start

Requires JDK 21, Node.js LTS, and Apache Maven on `PATH`. From the repo
root:

```bash
start-dev.bat
```

Builds the backend, then opens the backend (`http://localhost:8080`)
and frontend dev server (`http://localhost:5173`) each in their own
window. Or run them separately, from the repo root:

```bash
# Backend
mvn -B -f backend/pom.xml package        # compile + all backend tests (incl. architecture and contract tests)
java -jar backend/target/kopruq-backend-*.jar   # then curl http://localhost:8080/actuator/health

# Frontend
cd frontend && npm install
npm run dev        # dev server at http://localhost:5173
npm run build      # typecheck + production build
npm test           # Vitest
npm run lint       # oxlint
```

On Windows PowerShell, use `npm.cmd` instead of `npm` if execution
policy blocks the `npm.ps1` shim.

## Status

Frontend: navigation shell, real screens for Project Information/
Dashboard, Materials, Loads (traffic, wind, seismic, temperature, self
weight), Cost Database, Pier/Girder/Foundation/Bearing families,
Layout Generator, Bridge Alternatives, terrain/LandXML import and
viewer, a node-based design graph, and the KOPRUQ Fast Solver - built on
React Router, TanStack Query, React Hook Form + Zod.

Backend: bridge domain model, layout generator (LAYOUT-P01), alternative
generation with rule-engine infrastructure (no real rules yet), terrain
and LandXML import, traffic/wind/seismic/temperature load services, a
native linear-elastic 3D frame analysis engine (validated against
closed-form results and a worked example) behind the Fast Solver, and a
MIDAS NX adapter with a verified round trip (not yet wired to REST).
Inputs are validated fail-closed (missing or non-finite values are
rejected, invalid load inputs come back as `INVALID`), and the REST
contract is pinned by contract tests. See `docs/roadmap.md` for the
exact milestone table and what's still not started (MIDAS analysis
integration, persistence, quantities/cost/carbon, optimization, AI
service).

Several engineering values (seismic spectrum tables, LM1 values, wind
and temperature constants) still await documented engineer approval -
see the open questions in `docs/features/backend-remediation/plan.md`.
No real MIDAS NX analysis integration or optimization exists yet -
screens for those areas say so explicitly rather than showing invented
data (spec section 22: never invent engineering content).
