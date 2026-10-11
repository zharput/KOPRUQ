# Analyzer evidence — scope `backend`

Discovery (2026-10-11 UTC, HEAD bdca6d8):
- `backend/**/pom.xml`: no checkstyle, spotbugs, pmd, jacoco, error-prone, archunit, enforcer or sonar plugin configured (grep).
- No CI workflow (`.github/workflows` absent).
- No architecture test exists in the backend (no `*Arch*` test class).

| Tool | Status | Reason |
|---|---|---|
| Static analysis (Checkstyle/SpotBugs/PMD) | unavailable | Not configured in any pom; installing/downloading plugins is forbidden by policy |
| `mvn -B test` / `package` | skipped | `mvn` is not on PATH in this shell (CLAUDE.md notes a local install under a user tools dir); it is also a build step that writes `target/`, which the analyzer policy excludes |
| Architecture tests | unavailable | None exist; reference rules in `docs/architecture/backend-reference.md` are checked manually |
| SonarQube | unavailable | No server or report in repo |

No numeric metrics were produced. Findings rely on source inspection only.
