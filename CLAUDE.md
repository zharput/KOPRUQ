# CLAUDE.md

Guidance for Claude Code sessions working in this repository.

## What this is

SPANOVA is a Computational & Generative Bridge Design platform, built
incrementally with the engineer, milestone by milestone. The
authoritative specification is `docs/SPANOVA_MASTER_SPEC.md` - read it
before making any architectural decision - **amended by
`docs/ARCHITECTURE_AMENDMENT_V2.md`**, which replaces the original
C#/.NET/Avalonia stack with the polyglot architecture described below.
Read both. `docs/architecture.md` and `docs/roadmap.md` record how the
(amended) spec is being implemented and what is done so far.

Two earlier build generations exist under `archive/` for reference only
(not current, not approved work): an informal first pass, and a
milestone-gated C#/.NET/Avalonia build that reached P05 before the
engineer decided to move to this stack.

## Technology stack (architecture amendment v2)

| Component | Path | Technology |
|---|---|---|
| Frontend | `frontend/` | React + TypeScript (Vite), a web app (browser-based). REST/JSON to backend. A Tauri desktop-shell attempt was tried and reverted 2026-09-09 - see `docs/architecture.md`. |
| Backend API | `backend/api` | Spring Boot 3.5.x modular monolith |
| Bridge Core | `backend/bridge-core` | Plain Java, no framework dependency |
| Rules Engine | `backend/rules-engine` | Plain Java |
| Generative Engine | `backend/generative-engine` | Plain Java |
| Analysis API | `backend/analysis-api` | Plain Java - port/interface only |
| MIDAS NX Adapter | `backend/midas-adapter` | Plain Java - all MIDAS-specific code lives here |
| Optimization Service | `services/optimization-service` | Python/FastAPI - not implemented until after P01 |
| AI Service | `services/ai-service` | Python/FastAPI - not implemented until after P01 |

Backend build: Maven multi-module (`backend/pom.xml` is the parent).
Java 21. Only `backend/api` depends on Spring; every other backend
module must stay framework-free so it is testable and portable in
isolation. Local toolchain: JDK 21 (Microsoft build), Node.js LTS,
Apache Maven 3.9.16 (installed to `C:\Users\harput\tools\` - not on the
system installer registry, added to `~/.bashrc` PATH for Git Bash).
Rust + VS Build Tools were installed for a Tauri desktop-shell attempt
that was reverted - not needed for the current web-app frontend.

**Primary analysis solver: MIDAS Civil NX**, not ALLPLAN. See
`docs/ARCHITECTURE_AMENDMENT_V2.md` for why, and note that this
project's own session history already has verified, working MIDAS MAPI
calls (node/element/material/section creation, loads, running an
analysis, pulling results) - real prior art for `midas-adapter`, unlike
the ALLPLAN Tcl/API which was never verified.

## The working method (spec section 24) - this is not optional

1. Work milestone by milestone (see `docs/roadmap.md` for the current
   one). Never implement a milestone that has not been explicitly
   approved.
2. Before implementing a milestone: explain what you intend to build,
   state your assumptions, and ask about missing **engineering**
   information. Don't ask software questions you can reasonably resolve
   yourself.
3. Implement only the approved scope. Build the solution (`mvn -f
   backend/pom.xml -B package` and `npm run build` in `frontend/`). Run
   tests. Fix errors. Summarize what changed. Update
   `docs/architecture.md` and `docs/roadmap.md`.
4. Stop. Do not silently continue into the next milestone.

## Engineering safety rules (spec section 22) - hard rules

- **Never invent** equations, code limits, load factors, material
  factors, structural assumptions, Eurocode/AASHTO clauses, or bridge
  design rules of any kind.
- If an engineering requirement is missing, **stop and ask** the
  engineer. Do not guess, and do not fill the gap with a "reasonable
  default" - there is no such thing for structural safety.
- When the engineer provides a formula, implement it with: explicit
  units, stated assumptions, a source/reference, a validation example,
  and an automated test.
- AI-generated engineering logic must never silently become production
  logic.

## Architectural rules (spec sections 3, 21; amendment v2)

- `bridge-core` must never reference Spring, MIDAS, ALLPLAN, SCIA, or
  any solver/BIM-specific type. External systems are reached only
  through adapter modules (`midas-adapter`, future `scia-adapter`).
- All internal engineering lengths/quantities use SI units,
  unambiguously.
- Keep domain logic out of the frontend and out of `api`'s controllers.
  Keep MIDAS-specific logic out of `bridge-core`/`rules-engine`/
  `generative-engine`. Keep optimization logic independent of the UI.
- Do not add a Maven module dependency, a new REST endpoint, or a
  frontend feature ahead of the milestone that needs it (see
  `docs/roadmap.md`'s per-module dependency notes) - this project builds
  forward, one approved gate at a time, not by scaffolding capability
  early "because it'll be useful."

## Build & test

```bash
# Backend (from repo root)
cd backend && mvn -B package

# Run the API locally
java -jar backend/api/target/api-*.jar   # then curl http://localhost:8080/actuator/health

# Frontend (web app)
cd frontend && npm install && npm run build
cd frontend && npm run dev   # dev server at http://localhost:5173
```
