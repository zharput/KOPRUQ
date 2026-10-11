# Project review workflow

## Invocation and roles
`/project-review` audits current working-tree source across the Git repository.
`/project-review src/backend` audits an existing repo-relative directory or file.
Argument is a literal path, not a module name search or shell code. Accept zero
or one path, including spaces. Validate via helper. Feature state is irrelevant.
Main session coordinates, invokes project-reviewer explicitly and saves reports.
Reviewer has Read/Grep/Glob only. No source edits, auto-fixes, install, commit,
push, deployment or network scans. Do not launch a feature implementer.
One local review at a time; no concurrent sessions. Normal tool permissions apply.

## Inventory, snapshot and coverage
Run `python3 .claude/scripts/project_review_snapshot.py snapshot <quoted-scope>`
(use `.` for empty scope); it returns inventory, hashes and HEAD. On error stop.
Save JSON with Write under a new `docs/reviews/<UTC-timestamp>/inventory-before.json`.
Use a numeric suffix if directory already exists; never overwrite a previous run.
Git-visible tracked and nonignored untracked files are candidates, including dirty
source. Defaults exclude generated/dependency/control/report paths. Config is
`.claude/project-review.json`; if build/vendor contains handwritten source remove
those exclusions before auditing. Deleted tracked, binary, symlink and oversized
files are recorded. Git ignored files are absent: state this explicitly.

Inventory is not proof of inspection. Maintain per-file full/partial/not-inspected
coverage plus exclusions and reasons. Read oversized text in chunks if possible;
otherwise mark gaps. Batch sequentially by configured batch_size, save each handoff
to batches/NNN.md and persist remaining inventory before context compaction. Do not
silently truncate input/output or claim full review from keyword search. If limits
stop progress report INCOMPLETE and list exact remaining files and continuation step.
Root manifests/docs may be read outside a scoped directory for architectural context;
mark them context-only. Do not expose secrets in report or tool logs.

At end rerun helper and save inventory-after.json. Compare fingerprints: a changed
fingerprint makes result STALE. HEAD, config and selected file content hashes are
included; report paths excluded. Endpoints cannot detect temporary reverted changes
or ensure atomic reads. If tools changed product files, report it and do not undo
user changes. Avoid concurrent edits. Report creation is the intentional write.

## Phase 1: architecture first
Invoke project-reviewer explicitly via Agent with phase=architecture, absolute root,
scope, inventory, workflow/config/project context paths and repository facts. Agent
starts without prior conversation context. Wait; save architecture.md. For large
repos finish sequential architecture batches and merge evidence BEFORE phase 2.
Map actual boundaries and dependencies; validate antipatterns from source rather
than directory names. Record hypotheses needing more evidence, and critical paths.

## Optional existing tools
Coordinator discovers existing lint/static analysis commands from manifests, CI and
README. Read scripts/config before execution. Only run known local report/check
modes without autofix/write/install/build/deploy steps. No package downloads, npx
installation, online vulnerability scans or mandatory Sonar credentials. Existing
Sonar reports can be read; this MVP has no Sonar server integration. Tests optional
when needed to substantiate a finding via known local non-destructive commands.
Record tool/command/version (if available), exit code, scope, full output path and
skipped tools with reasons. Redact credentials. A lint failure is not automatically
a production bug. Never invent metrics when tools are missing.

## Phase 2: code quality
Invoke project-reviewer explicitly per sequential file batch with phase=code,
architecture.md, batch inventory, instructions and analyzer evidence. Wait for each;
save batches, aggregate code-quality.md, deduplicate root causes, validate paths and
lines. Inspect readability, responsibility, coupling, duplication, complexity,
error handling, security and testability in architectural context. Retain all
confirmed findings in report; user summary highlights priorities. No source edits.

## Severity and certainty
BLOCKER: proven urgent catastrophic/exploitable issue with trigger evidence.
CRITICAL: substantial concrete reliability/security/architecture risk.
MAJOR: actionable behavior or maintenance problem with demonstrated consequence.
MINOR: localized clarity/responsibility issue. INFO: optional improvement.
Do not mark stylistic preference BLOCKER. Confidence high/medium/low is separate
from severity; unconfirmed hypotheses do not count as confirmed findings.

## Report and verdict
Use `.claude/templates/project-review-report.md`. Deliver architecture.md,
code-quality.md, report.md, before/after inventories, batches and analyzer evidence.
Include timestamp, HEAD/fingerprint, scope, exclusions, complete/partial/unread
counts, tool status, confirmed findings and incremental repair priorities.
ACTION_REQUIRED: confirmed actionable issues. NO_ACTIONABLE_FINDINGS: all selected
reviewable text fully inspected and no unresolved material hypotheses.
INCOMPLETE: coverage/context/verification gaps constrain the conclusion.
STALE: endpoint fingerprints differ. STALE/INCOMPLETE take precedence; confirmed
issues still appear. Excluded/binary files explicitly limit any complete verdict.
No fabricated quality score, Sonar grade, debt duration or quality gate.
This is AI-assisted inspection with optional tool evidence, not an exhaustive
SonarQube engine. Summarize top evidence-backed findings; link report location.
Apply fixes only after a separate user request.
