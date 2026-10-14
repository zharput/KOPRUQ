import { afterEach, describe, expect, it } from 'vitest'
import { CANONICAL_PROJECT_DOCUMENT_JSON, NEW_PROJECT_DOCUMENT_JSON } from '../app/project-session/projectDocumentFixtures'
import { ApiError } from '../shared/api/http'
import { activeProjectApi, activeProjectSession, activeSections } from '../shared/project-store/activeProject'
import { projectApi } from '../shared/project-store/projectApi'
import { createFakeProjectApi } from './fakeProjectApi'
import { closeTestProject, installFakeProjectApi, openTestProject, resetActiveProject } from './projectSessionTestUtils'

afterEach(resetActiveProject)

describe('fake project api', () => {
  it('chains revisions, upserts graphs and logs every request', async () => {
    const fake = createFakeProjectApi()
    const id = fake.seed(NEW_PROJECT_DOCUMENT_JSON)
    const first = await fake.putSection(id, 'loads/seismic', 1, { a: '1' })
    const second = await fake.putSection(id, 'families/pier-caps', first.revision, [])
    expect([first.revision, second.revision]).toEqual([2, 3])
    expect(fake.document(id)).toMatchObject({ revision: 3, loads: { seismic: { a: '1' } }, families: { pierCaps: [] } })
    await fake.putSection(id, 'graphs/g1', 3, { id: 'g1', name: 'one' })
    await fake.putSection(id, 'graphs/g1', 4, { id: 'g1', name: 'two' })
    expect(fake.document(id)?.graphs).toEqual([{ id: 'g1', name: 'two' }])
    expect(fake.requests.map((request) => `${request.method} ${request.path}`)).toEqual([
      `PUT /api/projects/${id}/loads/seismic`, `PUT /api/projects/${id}/families/pier-caps`, `PUT /api/projects/${id}/graphs/g1`, `PUT /api/projects/${id}/graphs/g1`,
    ])
    expect(fake.requests[0].body).toEqual({ expectedRevision: 1, value: { a: '1' } })
  })

  it('answers 409 for a stale revision and 404 for an unknown project', async () => {
    const fake = createFakeProjectApi()
    const id = fake.seed(NEW_PROJECT_DOCUMENT_JSON)
    await expect(fake.putSection(id, 'workspace', 99, {})).rejects.toMatchObject({ status: 409, code: 'PROJECT_REVISION_CONFLICT' })
    await expect(fake.getProjectDocument('nope')).rejects.toBeInstanceOf(ApiError)
    await expect(fake.getProjectDocument('nope')).rejects.toMatchObject({ status: 404, code: 'PROJECT_NOT_FOUND' })
    await expect(fake.putSection('nope', 'workspace', 1, {})).rejects.toMatchObject({ status: 404 })
  })

  it('creates projects with deterministic ids and lists summaries', async () => {
    const fake = createFakeProjectApi()
    const created = await fake.createProject({ workspace: { project: { name: 'A' }, bridges: [] } }) as { projectId: string; revision: number }
    expect(created.revision).toBe(1)
    expect(created.projectId).toBe('00000000-0000-4000-8000-000000000001')
    expect(await fake.listProjects()).toMatchObject([{ projectId: created.projectId, name: 'A', revision: 1 }])
  })

  it('injects a one-shot failure', async () => {
    const fake = createFakeProjectApi()
    const id = fake.seed(NEW_PROJECT_DOCUMENT_JSON)
    fake.failNext('GET', new ApiError({ status: 500, message: 'down' }))
    await expect(fake.getProjectDocument(id)).rejects.toMatchObject({ status: 500 })
    await expect(fake.getProjectDocument(id)).resolves.toMatchObject({ projectId: id })
  })

  it('holds responses until released, in a chosen order', async () => {
    const fake = createFakeProjectApi()
    const a = fake.seed(NEW_PROJECT_DOCUMENT_JSON)
    const b = fake.seed({ ...NEW_PROJECT_DOCUMENT_JSON, projectId: 'other' })
    fake.hold('GET')
    const order: string[] = []
    const pa = fake.getProjectDocument(a).then(() => order.push('a'))
    const pb = fake.getProjectDocument(b).then(() => order.push('b'))
    expect(fake.pending('GET')).toBe(2)
    fake.release('GET', 1); await pb
    expect(order).toEqual(['b']); expect(fake.pending('GET')).toBe(1)
    fake.release('GET'); await pa
    expect(order).toEqual(['b', 'a'])
  })
})

describe('project session test utils', () => {
  it('opens and closes a project through the session layer and restores the api on reset', () => {
    const fake = installFakeProjectApi()
    expect(activeProjectApi()).toBe(fake)
    const prepared = openTestProject(CANONICAL_PROJECT_DOCUMENT_JSON, fake)
    expect(prepared.projectId).toBe(CANONICAL_PROJECT_DOCUMENT_JSON.projectId)
    expect(activeProjectSession.getSnapshot()).toMatchObject({ projectId: CANONICAL_PROJECT_DOCUMENT_JSON.projectId, revision: 17 })
    expect(fake.document(prepared.projectId)).toBeDefined()
    closeTestProject()
    expect(activeProjectSession.getSnapshot().projectId).toBeNull()
    expect(activeSections().length).toBe(17)
    resetActiveProject()
    expect(activeProjectApi()).toBe(projectApi)
  })
})
