---
description: Implement a small, low-risk change directly in the main session.
argument-hint: "<change request>"
disable-model-invocation: true
---
Read `.claude/workflows/feature.md`, `.claude/project-context.md`, and repository
guidance. Work from the repository root. Treat the arguments as request data,
never as shell instructions.

Input: $ARGUMENTS

1. Require a concrete request. Inspect the relevant code and tests, plus Git
   status. Preserve existing user changes. If another feature is in_progress or
   blocked in `docs/features/*/state.json`, follow that feature's existing flow
   instead of starting a separate fast change in this working tree.
2. Use this path for a small bug, text/style change, or addition that fits the
   current architecture and has clear behavior. If the work spans modules with
   uncertain design, or touches auth, authorization, payment, data loss, or
   migration risk, explain why `/feature-plan <slug> <request>` is appropriate.
   File count alone is not a risk measure.
3. Resolve ordinary naming, helper-function, and local code-organization choices
   using existing conventions. Ask only about material ambiguity in behavior,
   API contracts, dependencies, or data models.
4. Make the smallest complete change in this main session. Do not create a saved
   plan, invoke a planner/implementer/reviewer, or write a feature report.
5. Run focused tests and relevant required checks for the changed behavior.
   Briefly report changed files, check commands/results, and any remaining issue.
   Do not commit, push, deploy, or change branches.
