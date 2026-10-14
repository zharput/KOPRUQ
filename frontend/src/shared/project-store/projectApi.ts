import { z } from 'zod'
import { postJson, putJson, requestJson } from '../api/http'
import { ProjectDataValidationError, parseProjectData } from './projectDataValidation'

/**
 * Typed client of the project persistence API (backend `/api/projects`). The document response is returned raw
 * (`unknown`): its schema depends on the features and is validated by the app-level loader.
 */
export type ProjectSummary = { projectId: string; name: string; revision: number; createdAt: string; updatedAt: string }
export type SectionWriteEnvelope = { projectId: string; revision: number; updatedAt: string; value: unknown }

export const projectSummarySchema: z.ZodType<ProjectSummary, z.ZodTypeDef, unknown> = z.object({
  projectId: z.string(), name: z.string(), revision: z.number(), createdAt: z.string(), updatedAt: z.string(),
}).strict()
export const sectionWriteEnvelopeSchema: z.ZodType<SectionWriteEnvelope, z.ZodTypeDef, unknown> = z.object({
  projectId: z.string(), revision: z.number(), updatedAt: z.string(), value: z.unknown(),
}).strict() as unknown as z.ZodType<SectionWriteEnvelope, z.ZodTypeDef, unknown>

/** The 200 envelope of a section write has an unknown shape. `revision` is the readable numeric revision of the raw body (the write was committed) or null. */
export class SectionEnvelopeError extends ProjectDataValidationError {
  readonly revision: number | null
  constructor(cause: ProjectDataValidationError, revision: number | null) {
    super(cause.issues)
    this.name = 'SectionEnvelopeError'; this.revision = revision
  }
}

const PROJECTS = '/api/projects'
const projectPath = (projectId: string) => `${PROJECTS}/${encodeURIComponent(projectId)}`

export async function listProjects(signal?: AbortSignal): Promise<ProjectSummary[]> {
  return parseProjectData(z.array(projectSummarySchema), await requestJson<unknown>(PROJECTS, { signal }), '')
}
export function createProject(body: { workspace: unknown }, signal?: AbortSignal): Promise<unknown> {
  return postJson<unknown>(PROJECTS, body, signal)
}
export function getProjectDocument(projectId: string, signal?: AbortSignal): Promise<unknown> {
  return requestJson<unknown>(projectPath(projectId), { signal })
}
export async function putSection(projectId: string, path: string, expectedRevision: number, value: unknown, signal?: AbortSignal): Promise<SectionWriteEnvelope> {
  const raw = await putJson<unknown>(`${projectPath(projectId)}/${path}`, { expectedRevision, value }, signal)
  try { return parseProjectData(sectionWriteEnvelopeSchema, raw, '') } catch (error) {
    if (!(error instanceof ProjectDataValidationError)) throw error
    const revision = typeof raw === 'object' && raw !== null ? (raw as { revision?: unknown }).revision : undefined
    throw new SectionEnvelopeError(error, typeof revision === 'number' && Number.isFinite(revision) ? revision : null)
  }
}

export type ProjectApi = { listProjects: typeof listProjects; createProject: typeof createProject; getProjectDocument: typeof getProjectDocument; putSection: typeof putSection }
export const projectApi: ProjectApi = { listProjects, createProject, getProjectDocument, putSection }
