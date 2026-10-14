import { ApiError } from '../shared/api/http'
import type { ProjectApi, ProjectSummary, SectionWriteEnvelope } from '../shared/project-store/projectApi'

/**
 * In-memory stand-in of the project persistence API for tests (BACKEND-DB-PERSISTENCE M5b). Documents have the wire shape of
 * `GET /api/projects/{id}`. Every call is appended to `requests`; `failNext` injects a one-shot error; `hold` keeps the calls of a method
 * pending until `release`. Timestamps are counter based, so fake timers do not influence them.
 */
export type FakeMethod = 'LIST' | 'GET' | 'POST' | 'PUT'
export type FakeRequest = { method: FakeMethod; path: string; body?: unknown }
type Doc = Record<string, unknown> & { projectId: string; revision: number; updatedAt: string }

export interface FakeProjectApi extends ProjectApi {
  requests: FakeRequest[]
  /** Stores a copy of a document JSON; returns its project id. */
  seed(documentJson: unknown): string
  document(projectId: string): Doc | undefined
  failNext(method: FakeMethod, error: unknown): void
  /** Subsequent calls of `method` wait until released. */
  hold(method: FakeMethod): void
  /** Number of calls of `method` currently waiting. */
  pending(method: FakeMethod): number
  /** Releases the `index`-th waiting call of `method` (default: the oldest). */
  release(method: FakeMethod, index?: number): void
  /** Stops holding `method` and releases everything that is waiting. */
  unhold(method: FakeMethod): void
}

const SECTION_KEYS: Record<string, string[]> = {
  workspace: ['workspace'], 'bridge-definitions': ['bridgeDefinitions'],
  'families/piers': ['families', 'piers'], 'families/pier-caps': ['families', 'pierCaps'], 'families/foundations': ['families', 'foundations'],
  'families/bearings': ['families', 'bearings'], 'families/materials': ['families', 'materials'],
  'girder-library': ['girderLibrary'], 'preferred-span-rules': ['preferredSpanRules'], 'cross-section': ['crossSection'],
  'loads/seismic': ['loads', 'seismic'], 'loads/wind': ['loads', 'wind'], 'loads/temperature': ['loads', 'temperature'],
  'loads/self-weight': ['loads', 'selfWeight'], 'loads/traffic-lm1': ['loads', 'trafficLm1'], 'loads/wind-snapshot': ['loads', 'windSnapshot'],
}
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T
const notFound = (projectId: string) => new ApiError({ status: 404, message: `Project ${projectId} not found`, code: 'PROJECT_NOT_FOUND' })

export function createFakeProjectApi(): FakeProjectApi {
  const documents = new Map<string, Doc>()
  const requests: FakeRequest[] = []
  const failures = new Map<FakeMethod, unknown[]>()
  const holding = new Set<FakeMethod>()
  const held = new Map<FakeMethod, (() => void)[]>()
  let tick = 0
  let created = 0
  const stamp = () => { tick += 1; return `2026-11-01T00:00:${String(tick % 60).padStart(2, '0')}.${String(tick).padStart(3, '0')}Z` }

  async function gate(method: FakeMethod, path: string, body?: unknown) {
    requests.push({ method, path, ...(body !== undefined && { body }) })
    if (holding.has(method)) {
      await new Promise<void>((resolve) => { held.set(method, [...(held.get(method) ?? []), resolve]) })
    }
    const queued = failures.get(method)
    if (queued && queued.length > 0) throw queued.shift()
  }

  const api: FakeProjectApi = {
    requests,
    seed(json) {
      const doc = clone(json) as Doc
      documents.set(doc.projectId, doc)
      return doc.projectId
    },
    document: (projectId) => documents.get(projectId),
    failNext(method, error) { failures.set(method, [...(failures.get(method) ?? []), error]) },
    hold(method) { holding.add(method) },
    pending: (method) => held.get(method)?.length ?? 0,
    release(method, index = 0) {
      const [resolve] = (held.get(method) ?? []).splice(index, 1)
      resolve?.()
    },
    unhold(method) {
      holding.delete(method)
      for (const resolve of held.get(method)?.splice(0) ?? []) resolve()
    },
    async listProjects() {
      await gate('LIST', '/api/projects')
      return [...documents.values()].map((doc): ProjectSummary => ({
        projectId: doc.projectId, name: (doc.workspace as { project?: { name?: string } } | null)?.project?.name ?? '', revision: doc.revision,
        createdAt: String(doc.createdAt ?? doc.updatedAt), updatedAt: doc.updatedAt,
      }))
    },
    async createProject(body) {
      await gate('POST', '/api/projects', body)
      created += 1
      const projectId = `00000000-0000-4000-8000-${String(created).padStart(12, '0')}`
      const now = stamp()
      const doc: Doc = {
        projectId, revision: 1, createdAt: now, updatedAt: now, workspace: clone(body.workspace), bridgeDefinitions: null,
        families: { piers: null, pierCaps: null, foundations: null, bearings: null, materials: null },
        girderLibrary: null, preferredSpanRules: null, crossSection: null,
        loads: { seismic: null, wind: null, temperature: null, selfWeight: null, trafficLm1: null, windSnapshot: null }, graphs: [],
      }
      documents.set(projectId, doc)
      return clone(doc)
    },
    async getProjectDocument(projectId) {
      await gate('GET', `/api/projects/${projectId}`)
      const doc = documents.get(projectId)
      if (!doc) throw notFound(projectId)
      return clone(doc)
    },
    async putSection(projectId, path, expectedRevision, value): Promise<SectionWriteEnvelope> {
      await gate('PUT', `/api/projects/${projectId}/${path}`, { expectedRevision, value })
      const doc = documents.get(projectId)
      if (!doc) throw notFound(projectId)
      if (doc.revision !== expectedRevision) throw new ApiError({ status: 409, message: 'Project revision conflict', code: 'PROJECT_REVISION_CONFLICT' })
      const stored = clone(value)
      if (path.startsWith('graphs/')) {
        const graphs = doc.graphs as { id: string }[]
        const id = decodeURIComponent(path.slice('graphs/'.length))
        const index = graphs.findIndex((graph) => graph.id === id)
        if (index >= 0) graphs[index] = stored as { id: string }; else graphs.push(stored as { id: string })
      } else {
        const keys = SECTION_KEYS[path]
        if (!keys) throw new ApiError({ status: 404, message: `Unknown section ${path}`, code: 'SECTION_NOT_FOUND' })
        if (keys.length === 1) doc[keys[0]] = stored
        else (doc[keys[0]] as Record<string, unknown>)[keys[1]] = stored
      }
      doc.revision += 1; doc.updatedAt = stamp()
      return { projectId, revision: doc.revision, updatedAt: doc.updatedAt, value: clone(stored) }
    },
  }
  return api
}
