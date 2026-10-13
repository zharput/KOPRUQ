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

The one accepted exception is `shared/project-file/*` (the project
save/open layer, which still composes feature stores); its edges are listed
explicitly in the test's allow-list and may only shrink. Splitting that
layer is planned as a separate feature.

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
  project file service (`shared/project-file`).
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
```

On Windows PowerShell, use `npm.cmd` if execution policy blocks the
`npm.ps1` shim.

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
backend is exposed on another port (for example, by setting
`BACKEND_PORT` for the Compose backend), set `VITE_API_BASE` to its URL
in `frontend/.env.local`, such as `VITE_API_BASE=http://localhost:8081`.
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
parity matrix), project-file persistence, schema tests, component tests, and
the architecture tests under `src/test/architecture/`. See
`../docs/architecture.md` for what each round of work verified live in
the browser (this project's actual functional-correctness check, not
just the automated tests).
