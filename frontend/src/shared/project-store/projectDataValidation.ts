import type { z } from 'zod'
import { formatIssuePath } from '../project-file/projectFileValidation'

export type ProjectDataIssue = { path: string; message: string }
const MAX_LISTED_ISSUES = 3

/**
 * Data from the project API (GET document, PUT response) was rejected as a whole (no partial load). `path` is the
 * location inside the data (e.g. `workspace.bridges[2].spansM[0]`); the message lists the first few problems.
 */
export class ProjectDataValidationError extends Error {
  readonly issues: ProjectDataIssue[]
  readonly path: string
  constructor(issues: ProjectDataIssue[]) {
    const listed = issues.slice(0, MAX_LISTED_ISSUES).map((issue) => `${issue.path || '(root)'} - ${issue.message}`).join('; ')
    const more = issues.length > MAX_LISTED_ISSUES ? ` (+${issues.length - MAX_LISTED_ISSUES} more)` : ''
    super(`Invalid project data: ${listed}${more}`)
    this.name = 'ProjectDataValidationError'; this.issues = issues; this.path = issues[0]?.path ?? ''
  }
}

/** A frontend value cannot be represented on the wire (the server is never asked). `path` is relative to the section value. */
export class WireMappingError extends Error {
  readonly path: string
  constructor(path: string, message: string) {
    super(`Cannot send project data: ${path || '(root)'} - ${message}`)
    this.name = 'WireMappingError'; this.path = path
  }
}

/** Validates `value` against `schema`; throws ProjectDataValidationError whose paths start with `prefix`. */
export function parseProjectData<T>(schema: z.ZodType<T, z.ZodTypeDef, unknown>, value: unknown, prefix: string): T {
  const result = schema.safeParse(value)
  if (result.success) return result.data
  throw new ProjectDataValidationError(result.error.issues.map((issue) => ({ path: formatIssuePath(prefix, issue.path), message: issue.message })))
}
