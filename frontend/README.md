# KOPRUQ frontend

React + TypeScript (Vite) frontend for the KOPRUQ Computational &
Generative Bridge Design platform. See the repo root's `README.md` for
what KOPRUQ is and how the backend fits in; `../docs/architecture.md`
for the dated log of what's actually been built here and why.

## Architecture

Component-based, domain/feature-sliced (`app/ -> pages/ -> features/<domain>/
-> shared/`, dependency direction one-way):

- `src/app/` - app shell: `App.tsx`, `router.tsx` (React Router,
  `/:section` URL param), `providers/` (TanStack Query client),
  `layout/` (Sidebar, TopBar), `navigation/sections.ts` (the full
  sidebar/menu tree), `styles/App.css`.
- `src/pages/` - screens that compose more than one feature (currently
  just `home/`, which reads bridge-alternatives' results to build a
  summary). Every other section renders straight from its own feature -
  `app/router.tsx`'s route table is the composition point for those.
- `src/features/<domain>/` - one folder per domain screen (`project`,
  `materials`, `loads`, `pier-families`, `girder-library`,
  `layout-generator`, `bridge-alternatives`, `kopruq-fast-solver`,
  `cost-database`, ...), each with `components/`, and `model/`/`api/`/
  `hooks/` as needed. A feature exposes a public `index.ts` barrel;
  nothing reaches into another feature's internal files directly.
- `src/shared/` - domain-free UI primitives (`ParamSweepCard`,
  `TabDetailPanel`, `ThemeToggle`, `CountryMap`, ...) and helpers
  (`lib/countries.ts`) reused across features. Never imports from
  `features/`/`app/`/`pages/`.
- `src/test/` - Vitest setup (`jsdom`, `@testing-library/jest-dom`,
  explicit `afterEach(cleanup)`).

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
- **TanStack Query** - wraps the 3 real backend calls (layout
  generation, alternative generation, the fast solver) as mutations.
- **React Hook Form + Zod** - the same 3 backend-calling forms; Zod
  schemas enforce only generic UI-level checks (required, positive,
  min &lt;= max), never an invented engineering rule.
- **`xlsx` (SheetJS)** - installed from the official
  `cdn.sheetjs.com` tarball, **not** the npm registry package (which
  has unpatched high-severity advisories) - see `package.json`.
- **Radix UI** (Tabs) - the tab-row pattern used by Loads,
  Superstructure Families, and Girder Library.
- TanStack Table, Recharts, and Radix Dialog are installed but not yet
  used anywhere - no current screen needs sorting/filtering, chartable
  data, or a modal; they're available for when one genuinely does.

## Testing

Vitest + React Testing Library. Current coverage is a safety net, not
exhaustive: the pure `generateValues` sweep logic, one schema test per
backend-calling form, and a couple of routing/render smoke tests. See
`../docs/architecture.md` for what each round of work verified live in
the browser (this project's actual functional-correctness check, not
just the automated tests).
