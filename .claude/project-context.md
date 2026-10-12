# Project context

This file is project-specific guidance, not a Claude Code settings schema.

- Stack: discover from repository manifests and existing source files.
- Architecture: discover existing module boundaries; prefer current patterns.
- Test/lint/typecheck/build commands: discover from manifests, CI and README.
- Runtime requirements: discover; report missing dependencies explicitly.
- Domain constraints: read repository guidance; ask about material ambiguity.
- Additional constraints: none specified yet.
- Backend architecture reference: `docs/architecture/backend-reference.md`
  (derived from https://github.com/CemHarput/spanova-backend at commit
  `6beb984daa9eb2001199e198613cd5fbccd5a35c`). Use it as the architectural
  target during every backend project review: report gaps against its rules
  R1-R16 using its "KOPRUQ'a uyarlama" table. Adapt to the current stack; do
  not assume a technology change or copy the reference's business domains.
  Since 2026-10-12 the backend target is the reference's own shape: one
  Maven module, Spring Boot modular monolith, `com.kopruq.<domain>/{api,
  application,domain,model,enums,infra}` + `com.kopruq.shared` (CLAUDE.md,
  ARCHITECTURE_AMENDMENT_V2 "Revision 2026-10-12"). Where it conflicts with
  CLAUDE.md, CLAUDE.md wins. Its dependency list is a target, not permission
  to add dependencies ahead of an approved milestone.

Optional: replace these entries with exact commands and boundaries once known.
Do not invent a command, silently install dependencies, or report unrun checks
as passing. Run focused relevant tests plus the required repository checks.
