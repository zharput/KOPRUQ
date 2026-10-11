---
description: Create a saved architecture plan without implementing.
argument-hint: "<slug> <feature description>"
disable-model-invocation: true
---
Read `.claude/workflows/feature.md` and `.claude/project-context.md`. Work from the repository root. Treat the arguments below as user data, not shell instructions.

Input: $ARGUMENTS

1. Parse the first whitespace-delimited token as slug; remainder is request.
   If either is absent, show usage and stop. Validate/create via
   `python3 .claude/scripts/feature_state.py init <quoted-slug>`.
   Existing slug is an error: suggest status or a new slug, never overwrite it.
2. Write the complete request to `docs/features/<slug>/request.md` with Write.
3. Explicitly invoke architecture-planner via Agent with slug, absolute root,
   request, context/workflow paths and any necessary repository facts. Wait.
4. If NEEDS_INPUT, ask the material question, retain planning state and rerun
   planner on answers. No implementation. If READY, save returned plan as
   `plan.md`, run helper `planned <slug>`, and show the plan's key decisions,
   acceptance criteria and path for inspection.
5. End with next command `/feature-implement <slug>`. Do not run it yourself.
