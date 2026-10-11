---
description: Audit architecture first, then code quality and antipatterns; report only.
argument-hint: "[repo-relative-directory-or-file]"
disable-model-invocation: true
---
Literal scope data: $ARGUMENTS

Read `.claude/workflows/project-review.md`, `.claude/project-review.json`,
`.claude/project-context.md` and repo guidance. Follow the workflow exactly.

1. From repo root, validate empty scope as `.` or entire argument as one existing
   literal repo-relative path using snapshot helper. Safely quote shell argument;
   never execute syntax in user input. Save complete before inventory in a unique
   timestamped report directory. Stop on helper error.
2. Invoke custom project-reviewer via Agent with phase=architecture, absolute root,
   complete scope/inventory/instructions/context. Wait; save architecture.md.
   Finish all necessary sequential architecture batches before the code phase.
3. Discover existing static analyzers; inspect commands and run available local
   report/check-only modes following workflow. Save outputs, exit codes and skips.
4. Invoke project-reviewer for phase=code in sequential configured batches, with
   architecture report and analyzer evidence. Wait for each, save handoffs and
   maintain full/partial/unread coverage. Aggregate code-quality.md. Do not replace
   the custom agent silently or claim a search summary inspected the whole project.
5. Save after snapshot; compare fingerprints. Generate report.md using template,
   real path:line evidence, severity/confidence, limits, verdict and repair priorities.
   STALE/INCOMPLETE override a clean conclusion. Never invent numeric metrics.
6. Report architecture summary, top findings, coverage and report path. No fixes,
   implementer, commit or deployment. Reviewer runs only on this explicit command.
