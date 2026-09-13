# SPANOVA frontend

React + TypeScript (Vite) frontend for the SPANOVA Computational &
Generative Bridge Design platform. See the repo root's `README.md` for
what SPANOVA is and how the backend fits in; `../docs/architecture.md`
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
  `layout-generator`, `bridge-alternatives`, `spanova-fast-solver`,
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
