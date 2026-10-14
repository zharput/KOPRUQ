# Project context

This file is project-specific guidance, not a Claude Code settings schema.

- Stack: discover from repository manifests and existing source files.
- Architecture: discover existing module boundaries; prefer current patterns.
- Test/lint/typecheck/build commands: discover from manifests, CI and README.
- Runtime requirements: discover; report missing dependencies explicitly.
- Domain constraints: read repository guidance; ask about material ambiguity.
- Additional constraints: none specified yet.

Optional: replace these entries with exact commands and boundaries once known.
Do not invent a command, silently install dependencies, or report unrun checks
as passing. Run focused relevant tests plus the required repository checks.
