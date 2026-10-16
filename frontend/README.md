# KOPRUQ frontend

React + TypeScript (Vite) frontend for the KOPRUQ Computational &
Generative Bridge Design platform. See the repo root's `README.md` for
what KOPRUQ is and how the backend fits in; `../docs/architecture.md`
for the dated log of what's actually been built here and why.

## Architecture

Component-based, domain/feature-sliced. Dependency direction is one-way
(`app/ -> features/<domain>/ -> shared/`) and is **enforced by a test**
(`src/test/architecture/layerRules.test.ts`):

- **R1** `shared/**` never imports `app/`, `pages/` or `features/`.
- **R2** `features/**` never imports `app/` or `pages/`.
- **R4** `features/*/model/**` and `features/graph/domain/**` never import
  `shared/ui/**` (pure domain code stays UI-free).
- **R3** (a feature reaching into another feature below its `index.ts`
  barrel) is only counted, not enforced.

There is no accepted exception: the test's allow-list is empty (g5). The
project session layer (New / Open / Exit, save status, the unsaved-changes
gate, the `?project=<id>` URL adapter) lives in `app/project-session/`; the
project data itself is kept in server sections (`shared/project-store`), one
per feature data store, created by the owning feature (`*ServerSection(s).ts`)
and saved to the backend through a write queue - nothing is stored in the
browser. `shared/project-file/` holds only generic, domain-free parts.

- `src/app/` - app shell: `App.tsx`, `router.tsx` (React Router),
  `providers/` (TanStack Query client), `layout/` (`TopWorkspaceNav`),
  `navigation/sections.ts`, `workspaces/` (workspace pages and registry),
  `styles/App.css` (an ordered list of `@import`s of `styles/app/NN-*.css`;
  the cascade depends on that order).
- `src/features/<domain>/` - one folder per domain screen (`project`,
  `materials`, `loads`, `graph`, `pier-families`, `girder-library`,
  `bridge-definition`, `system-assembly`, ...), each with `components/`
  and `model/`/`api/`/`hooks/` as needed. Several features expose a public
  `index.ts` barrel.
- `src/shared/` - domain-free UI primitives (`shared/ui`, including
  `WorkspaceLayout` and `ParamSweepCard`), helpers (`shared/lib`, e.g.
  `parameterSweep.ts`), the HTTP layer (`shared/api/http.ts`), and the
  project-store infrastructure (`shared/project-store`: session, write
  queue, server sections, project API) and the thin project-module views over
  server sections (`shared/project-file`: `projectModuleStore`,
  `useProjectModule`, validation helpers).
- `src/test/` - Vitest setup (`jsdom`, `@testing-library/jest-dom`,
  explicit `afterEach(cleanup)`) and `architecture/` tests (layer rules,
  source-encoding guard).

Graph nodes live in `features/graph/registry/nodeRegistry.ts`. A node's
live preview (`preview`) and its Run executor share one compute core, so the
canvas preview and Run give the same result; the only intended differences are
that the preview does not resolve materials from the catalog, and that the
superstructure preview returns an empty candidates list when no girder is
connected (Run still validates the length inputs).

Source files must be UTF-8 (`../.editorconfig`); `sourceEncoding.test.ts`
fails on mojibake sequences.

## Commands

```sh
npm install
npm run dev         # dev server at http://localhost:5173
npm run build        # tsc -b && vite build
npm test              # vitest run
npm run test:watch  # vitest, watch mode
npm run lint          # oxlint
npm run preview      # serve the production build locally
npm run test:e2e:install   # one-time: install Chromium for Playwright
npm run test:e2e           # Playwright e2e (needs the backend and PostgreSQL running)
npm run test:e2e:headed    # same, with a visible browser (also test:e2e:ui, test:e2e:report)
```

On Windows PowerShell, use `npm.cmd` if execution policy blocks the
`npm.ps1` shim.

## Playwright e2e

`e2e/` holds one Playwright spec per manual scenario in `../docs/e2e` (`NN-<name>.spec.ts`, Chromium only, one worker because all specs share one real database). `e2e/support/` has the shared helpers: fixtures (diagnostics collector, section-write tracker, save-toast recorder, project reader), project/navigation/bridge/graph/file helpers, `scenarioData.ts` (values written in the scenario documents, each with its source step) and `evidence.ts` (screenshots as report attachments). `playwright.config.ts` starts or reuses only the Vite dev server; the backend and PostgreSQL must already run (`e2e/global-setup.ts` stops the run with a Turkish message when `http://localhost:8080/actuator/health` is not `UP`). Vitest does not collect `e2e/**`; `tsc -b` type-checks it through `tsconfig.e2e.json`.

Every spec creates its own `E2E-NN-...` project through the UI. The API has no DELETE, so each run leaves 19 persistent projects: use a local/test database only (Compose `postgres-test` profile recommended). Expected 4xx responses are allowed per test with a reason; any other `pageerror`, `console.error`, 4xx/5xx API response or dialog fails the spec. Environment: `E2E_BASE_URL` (default `http://localhost:5173`, the only CORS origin) and `E2E_API_BASE` (default `http://localhost:8080`). The mapping from scenario to spec and the steps that stay manual are in `../docs/e2e/README.md`.

## Local backend and database

The backend requires PostgreSQL. From the repository root, copy
`.env.example` to `.env` and set `DB_PASSWORD`. Then run `start-dev.bat`
on Windows to start PostgreSQL, build and launch the backend, and start
the frontend. Alternatively, start only PostgreSQL with
`docker compose up -d --wait postgres` and run the backend and frontend
separately. When launching the backend directly, pass `DB_PASSWORD` in
its environment; Compose and `start-dev.bat` read the root `.env` file,
but a direct backend launch does not.

Frontend API requests use `http://localhost:8080` by default. If the
backend runs on another port, set `VITE_API_BASE` to its URL in
`frontend/.env.local`, such as `VITE_API_BASE=http://localhost:8081`.
`start-dev.bat` launches the backend directly on port 8080.

## Notable dependencies

- **React Router** - URL-based navigation (`/:section`), replacing an
  earlier manual `active`-state switch.
- **TanStack Query** - wraps the backend calls as mutations and queries:
  layout generation, alternative generation, the fast solver, LandXML import
  (inspect, import, longitudinal profile), terrain DTM import, the terrain
  viewer (`useTerrainMesh`, `useAlignmentSample`,
  `useImportedAlignmentSample`) and the loads hooks (`useLoadGroups`,
  `useResolveTraffic`, `useLm1Defaults`, `useSeismicSpectrum`,
  `useUniformTemperature`). The feature `api/*Service.ts` modules go through
  `shared/api/http.ts`, which owns the base URL and the backend error
  contract.
- **React Hook Form + Zod** - the backend-calling forms; Zod schemas enforce
  only generic UI-level checks (required, positive, min &lt;= max), never an
  invented engineering rule. Zod also validates project files and graph
  documents.
- **`xlsx` (SheetJS)** - installed from the official
  `cdn.sheetjs.com` tarball, **not** the npm registry package (which
  has unpatched high-severity advisories) - see `package.json`.
- **Radix UI** (Tabs) - the tab-row pattern used by Loads,
  Superstructure Families, and Girder Library.
- TanStack Table, Recharts, and Radix Dialog are installed but not yet
  used anywhere - no current screen needs sorting/filtering, chartable
  data, or a modal; they're available for when one genuinely does.

## Testing

Vitest + React Testing Library. Coverage is a safety net, not exhaustive:
domain generators and the graph registry (including a preview/executor
parity matrix), project session and server-section persistence, schema tests, component tests, and
the architecture tests under `src/test/architecture/`. See
`../docs/architecture.md` for what each round of work verified live in
the browser (this project's actual functional-correctness check, not
just the automated tests).
