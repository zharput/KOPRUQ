import { afterEach, describe, expect, it, vi } from 'vitest'
import { API_BASE, ApiError } from '../api/http'
import { SectionEnvelopeError, createProject, getProjectDocument, listProjects, projectApi, putSection } from './projectApi'
import { ProjectDataValidationError } from './projectDataValidation'

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } })
const stub = (response: () => Response | Promise<Response>) => { const fetchMock = vi.fn(async () => response()); vi.stubGlobal('fetch', fetchMock); return fetchMock }
const call = (fetchMock: ReturnType<typeof stub>, index = 0) => fetchMock.mock.calls[index] as unknown as [string, RequestInit]
afterEach(() => { vi.unstubAllGlobals() })

const SUMMARY = { projectId: 'p1', name: 'Corridor', revision: 3, createdAt: '2026-10-13T10:00:00Z', updatedAt: '2026-10-13T11:00:00Z' }
const ENVELOPE = { projectId: 'p1', revision: 8, updatedAt: '2026-10-13T11:00:00Z', value: [{ id: 'a' }] }

describe('projectApi', () => {
  it('lists projects with GET /api/projects', async () => {
    const fetchMock = stub(() => json([SUMMARY]))
    await expect(listProjects()).resolves.toEqual([SUMMARY])
    const [url, init] = call(fetchMock); expect(url).toBe(`${API_BASE}/api/projects`); expect(init.method).toBeUndefined()
  })
  it('rejects a summary with an unknown key or a wrong type', async () => {
    stub(() => json([{ ...SUMMARY, extra: 1 }]))
    await expect(listProjects()).rejects.toBeInstanceOf(ProjectDataValidationError)
    stub(() => json([{ ...SUMMARY, revision: '3' }]))
    await expect(listProjects()).rejects.toThrow('Invalid project data: [0].revision - Expected number, received string')
  })
  it('creates a project with POST /api/projects and the workspace body', async () => {
    const fetchMock = stub(() => json({ projectId: 'p1' }, 201))
    await expect(createProject({ workspace: { project: {}, bridges: [] } })).resolves.toEqual({ projectId: 'p1' })
    const [url, init] = call(fetchMock); expect(url).toBe(`${API_BASE}/api/projects`); expect(init.method).toBe('POST'); expect(init.body).toBe('{"workspace":{"project":{},"bridges":[]}}')
  })
  it('gets a document with an encoded project id and returns raw JSON', async () => {
    const fetchMock = stub(() => json({ any: 'thing' }))
    await expect(getProjectDocument('a/b c')).resolves.toEqual({ any: 'thing' })
    expect(call(fetchMock)[0]).toBe(`${API_BASE}/api/projects/a%2Fb%20c`)
  })
  it('puts a section with exactly { expectedRevision, value }', async () => {
    const fetchMock = stub(() => json(ENVELOPE))
    const signal = new AbortController().signal
    await expect(putSection('p1', 'families/pier-caps', 7, [{ id: 'a' }], signal)).resolves.toEqual(ENVELOPE)
    const [url, init] = call(fetchMock); expect(url).toBe(`${API_BASE}/api/projects/p1/families/pier-caps`); expect(init.method).toBe('PUT'); expect(init.signal).toBe(signal)
    expect(init.body).toBe('{"expectedRevision":7,"value":[{"id":"a"}]}')
  })
  it('sends value null explicitly when a section is cleared', async () => {
    const fetchMock = stub(() => json({ ...ENVELOPE, value: null }))
    await putSection('p1', 'girder-library', 1, null)
    expect(call(fetchMock)[1].body).toBe('{"expectedRevision":1,"value":null}')
  })
  it('rejects an envelope with an unknown key or a wrong type', async () => {
    stub(() => json({ ...ENVELOPE, extra: true }))
    await expect(putSection('p1', 'workspace', 1, {})).rejects.toBeInstanceOf(ProjectDataValidationError)
    stub(() => json({ ...ENVELOPE, revision: 'x' }))
    await expect(putSection('p1', 'workspace', 1, {})).rejects.toThrow('revision')
  })
  it('an invalid 200 envelope throws a SectionEnvelopeError carrying the readable numeric revision (null when unreadable)', async () => {
    stub(() => json({ ...ENVELOPE, extra: true }))
    const withRevision = await putSection('p1', 'workspace', 1, {}).catch((e: unknown) => e) as SectionEnvelopeError
    expect(withRevision).toBeInstanceOf(SectionEnvelopeError); expect(withRevision).toBeInstanceOf(ProjectDataValidationError); expect(withRevision.revision).toBe(8)
    stub(() => json({ ...ENVELOPE, revision: 'x' }))
    expect(((await putSection('p1', 'workspace', 1, {}).catch((e: unknown) => e)) as SectionEnvelopeError).revision).toBeNull()
    stub(() => json([1]))
    expect(((await putSection('p1', 'workspace', 1, {}).catch((e: unknown) => e)) as SectionEnvelopeError).revision).toBeNull()
  })
  it.each([[400, 'INVALID_REQUEST'], [404, 'PROJECT_NOT_FOUND'], [409, 'PROJECT_REVISION_CONFLICT'], [500, 'INTERNAL_ERROR']])('propagates HTTP %i as an ApiError', async (status, code) => {
    stub(() => json({ status, code, message: 'm', correlationId: 'c1', errors: [{ field: 'value.x', message: 'is required' }] }, status))
    const error = await putSection('p1', 'workspace', 1, {}).catch((e: unknown) => e) as ApiError
    expect(error).toBeInstanceOf(ApiError); expect(error).toMatchObject({ status, code, correlationId: 'c1', fieldErrors: [{ field: 'value.x', message: 'is required' }] })
  })
  it('propagates a network failure', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch') }))
    await expect(getProjectDocument('p1')).rejects.toBeInstanceOf(TypeError)
  })
  it('exposes the four functions as projectApi', () => {
    expect(Object.keys(projectApi).sort()).toEqual(['createProject', 'getProjectDocument', 'listProjects', 'putSection'])
  })
})
