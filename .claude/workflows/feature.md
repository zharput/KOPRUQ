# Feature workflow contract

## Roles and boundaries
Main session coordinates, writes workflow artifacts, and runs the state helper.
Planner and reviewer have only Read/Grep/Glob; no shell or write tools, no memory
that could add Write. Main session supplies git facts/diffs they cannot collect.
Implementer has Read/Grep/Glob/Edit/Write/Bash; it cannot delegate or run skills.
Use the named custom agents explicitly via Claude Code's Agent tool (older
versions call it Task). If unavailable, report the blocker; do not silently
replace a specialist with the coordinator. Wait for each agent before proceeding.

All agents must be supplied the request, absolute repository root, context and
workflow documents, feature directory, and relevant artifacts. They start with
separate context: do not assume they saw the user's earlier conversation.

## Artifacts
`docs/features/<slug>/request.md`: verbatim request as data.
`plan.md`: architectural plan, acceptance criteria, assumptions and test strategy.
`state.json`: helper-managed status, approval hash, baseline HEAD and timestamps.
`implementation.md`: changed files, acceptance mapping, checks and remaining work.
`review.md`: optional independent review with scope and limitations.

slug: lowercase ASCII letters/digits/hyphens, maximum 64 characters, starts with
letter. Always validate through helper before using it in paths. Pass arguments
as separate quoted shell arguments; never interpolate the feature request into
shell. Use Read/Write for arbitrary request text. No dynamic shell injection.

## State and authorization
`planning -> planned -> in_progress -> implemented|blocked`.
Review does not change implementation status; its separate flag is
`not_requested|completed`. A blocked implementation can resume with the same plan.

User's `/feature-implement <slug>` approves the current saved plan. Coordinator
records the plan hash via `start` before delegation. Helper rejects dirty source,
missing plan, concurrent active feature, changed approved plan and invalid states.
For the first run, commit the installed configuration before implementation.
Feature artifacts are excluded from the clean-source check. Keep them out of
application source; they remain visible in git and may be committed separately.

Use the hash printed by `status` in `start <slug> --plan-hash <hash>` so a plan
changed between inspection and start cannot be accidentally approved.
Implementation must recheck the approved hash before editing (helper `check`).
If the plan changes, stop; use a new slug to re-plan. Never reapprove silently.
No auto-review, auto-fix, automatic commit, push or deployment.

## Completion and recovery
Only the coordinator changes state or writes implementation/review reports.
Implementer returns a structured result. `implemented` requires all acceptance
criteria met and required checks passing. Missing checks or unresolved work mean
`blocked`, with concrete reasons. Tests alone do not mean reviewed.
On interruption, state stays in_progress; `/feature-implement <slug>` resumes
using existing report/workspace, without discarding changes. Run status/check
first. Use a dedicated branch/worktree for each independent feature.

## Review scope
Read baseline HEAD from state, verify it is still current HEAD. Review all staged
and unstaged application changes relative to that HEAD and every new untracked
source file. Use `git diff <baseline> -- . ':(exclude)docs/features/**'` and
`git ls-files --others --exclude-standard -- . ':(exclude)docs/features/**'`.
Read full files as needed, not just diff snippets. Exclude workflow artifacts
from findings about product code. If baseline is missing or HEAD changed, stop
and request an explicit review baseline; never infer feature ownership.
Snapshot the diff/file list for the reviewer in its task input, chunking large
diffs without truncation. Coordinator checks git status again afterwards; if
workspace changed during review, label the report stale and rerun on request.
Reviewer cannot execute tests; distinguish implementer-reported checks from
independent source inspection. Never call a feature bug-free.

## Limits
This is a prompt-driven MVP with an explicit Python state guard, not a sandbox
or transactional workflow engine. Claude can edit outside the helper if it
ignores instructions; no hook intercepts arbitrary edits. Read-only specialist
tool lists enforce their capabilities, not the coordinator's. One local feature
at a time; no parallel sessions, agent teams, automatic retries or rollback.
