import type { z } from 'zod'

export type ProjectFileIssue = { path: string; message: string }
const MAX_LISTED_ISSUES = 3

/**
 * A .kopruq file was rejected as a whole (no partial import). `path` is the location inside the file
 * (e.g. `projectState.bridges[2].spansM[0]`); the message lists the first few problems.
 */
export class ProjectFileValidationError extends Error {
  readonly issues: ProjectFileIssue[]
  readonly path: string
  constructor(issues: ProjectFileIssue[]) {
    const listed = issues.slice(0, MAX_LISTED_ISSUES).map((issue) => `${issue.path} — ${issue.message}`).join('; ')
    const more = issues.length > MAX_LISTED_ISSUES ? ` (+${issues.length - MAX_LISTED_ISSUES} more)` : ''
    super(`Invalid project file: ${listed}${more}`)
    this.name = 'ProjectFileValidationError'; this.issues = issues; this.path = issues[0]?.path ?? ''
  }
}

export function formatIssuePath(prefix: string, path: readonly (string | number)[]): string {
  return path.reduce<string>((text, part) => typeof part === 'number' ? `${text}[${part}]` : text ? `${text}.${part}` : String(part), prefix)
}

/** Validates `value` against `schema`; throws ProjectFileValidationError whose paths start with `prefix`. */
export function parseWithSchema<T>(schema: z.ZodType<T, z.ZodTypeDef, unknown>, value: unknown, prefix: string): T {
  const result = schema.safeParse(value)
  if (result.success) return result.data
  throw new ProjectFileValidationError(result.error.issues.map((issue) => ({ path: formatIssuePath(prefix, issue.path), message: issue.message })))
}
