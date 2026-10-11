# Project review — <UTC timestamp>

## Result
- Verdict: ACTION_REQUIRED / NO_ACTIONABLE_FINDINGS / INCOMPLETE / STALE
- Scope and working-tree HEAD: <path and hash>
- Before/after fingerprints: <hashes>; unchanged/changed
- Architecture summary: <evidence based>
- Full text inspection: <count>/<selected text count>
- Partial/not inspected/excluded/binary/oversized/deleted/symlink: <counts and limits>
- Analyzer state: <executed/skipped/unavailable, reasons>

## Confirmed findings
| ID | Severity | Category | Confidence | Location | Impact | Smallest useful repair |
| --- | --- | --- | --- | --- | --- | --- |

For each finding: exact source evidence/call paths; trigger or maintenance scenario;
consequence; why the rule applies to this project; correction and verification.

## Architecture map
<Actual boundaries/dependencies/entry points with evidence. See architecture.md.>

## Code quality
<Evidence-based responsibility/readability/duplication/complexity/coupling/error
handling/testability findings. See code-quality.md.>

## Hypotheses and optional improvements
<Unconfirmed items, missing evidence and verification; not counted as confirmed.>

## Analyzer evidence
| Command/tool | Version | Scope | Exit code | Output | Interpretation and limits |
| --- | --- | --- | --- | --- | --- |

## Coverage
| File | Full / partial / not inspected / excluded | Reason and batch |
| --- | --- | --- |

## Repair priorities
<Small ordered fixes/refactors and behavior-preserving checks; no invented times.>

## Limits and next steps
<Exact remaining scope, tool gaps, ignored/external files, stale evidence.>
