# Analyzer evidence — scope `frontend`

Run from `frontend/` on 2026-10-11 (UTC), HEAD 0cc62f9. Only existing local tools; no install, no autofix, no build output written.

| Tool | Version | Command | Exit | Output | Summary |
|---|---|---|---|---|---|
| oxlint | 1.82.0 | `./node_modules/.bin/oxlint` (repo `.oxlintrc.json`, no `--fix`) | 0 | `oxlint.txt` | 85 warnings, 0 errors. By rule: set-state-in-effect 19, exhaustive-deps 15, static-components 13, refs 11, only-export-components 10, preserve-manual-memoization 9, no-unreachable 3 (`EngineeringSchematics.tsx:76,81,82`), incompatible-library 2, immutability 1, only-used-in-recursion 1, no-unused-expressions 1 |
| tsc | 6.0.3 | `./node_modules/.bin/tsc -p tsconfig.app.json --noEmit` | 0 | `tsc.txt` | No type errors (note: `strict` is not enabled) |
| vitest | see `vitest.txt` line 1 | `./node_modules/.bin/vitest run` | 1 | `vitest.txt` | 62 files: 6 failed / 56 passed; 456 tests: 26 failed / 430 passed |

Failing test files: `src/app/App.test.tsx`, `src/features/graph/ui/BaseNode.test.tsx`, `EditableNumericInput.test.tsx`, `EngineeringNodeShell.test.tsx`, plus two more (see `vitest.txt`, includes schematic/family candidate rendering tests).
A lint warning or a failing test is not automatically a production bug; root cause must be confirmed in the code phase.

Skipped: `tsc -b` / `npm run build` (writes buildinfo/dist), SonarQube (no server/report in repo), npm audit (online), coverage (not configured as a check-only script). No CI workflow found in repo.
