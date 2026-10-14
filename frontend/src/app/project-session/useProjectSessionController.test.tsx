import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { StrictMode, useState, type ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, formatApiError } from '../../shared/api/http'
import { activeProjectSession, activeWriteQueue, onProjectSwitch } from '../../shared/project-store/activeProject'
import { INITIAL_PROJECT } from '../../features/project/model/projectWorkspaceModel'
import { SEISMIC_SERVER_SECTION } from '../../features/loads/model/loadsServerSections'
import { WORKSPACE_SERVER_SECTION } from '../../features/project/model/projectWorkspaceServerSection'
import { createFakeProjectApi, type FakeProjectApi } from '../../test/fakeProjectApi'
import { installFakeProjectApi, openTestProject, resetActiveProject } from '../../test/projectSessionTestUtils'
import { createProjectRequestBody } from './projectDocument'
import { CANONICAL_PROJECT_DOCUMENT_JSON } from './projectDocumentFixtures'
import { PROJECT_LIST_QUERY_KEY } from './useProjectList'
import { useProjectSessionController, type SessionPhase } from './useProjectSessionController'

const A = CANONICAL_PROJECT_DOCUMENT_JSON.projectId
const B = 'proj-b'
const SEISMIC = { a: '0.5', g: '9.81', t: '1', i: '1' }
const SEISMIC_SERVER = { a: '0.9', g: '9.81', t: '2', i: '1' }

afterEach(() => { cleanup(); vi.useRealTimers(); resetActiveProject() })

function setup(options: { url?: string | null; strict?: boolean; openA?: boolean; holdGet?: boolean } = {}) {
  const fake: FakeProjectApi = installFakeProjectApi(createFakeProjectApi())
  fake.seed(CANONICAL_PROJECT_DOCUMENT_JSON)
  fake.seed({ ...CANONICAL_PROJECT_DOCUMENT_JSON, projectId: B, workspace: { ...CANONICAL_PROJECT_DOCUMENT_JSON.workspace, bridges: [] }, bridgeDefinitions: null, graphs: [] })
  if (options.holdGet) fake.hold('GET')
  if (options.openA) openTestProject(CANONICAL_PROJECT_DOCUMENT_JSON)
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const invalidate = vi.spyOn(client, 'invalidateQueries')
  const urlCalls: (string | null)[] = []
  const phases: SessionPhase[] = []
  const wrapper = ({ children }: { children: ReactNode }) => {
    const tree = <QueryClientProvider client={client}>{children}</QueryClientProvider>
    return options.strict ? <StrictMode>{tree}</StrictMode> : tree
  }
  const view = renderHook(() => {
    const [url, setUrl] = useState<string | null>(options.url ?? null)
    const controller = useProjectSessionController({ urlProjectId: url, setUrlProjectId: (id) => { urlCalls.push(id); setUrl(id) } })
    phases.push(controller.phase)
    return { controller, url, setUrl }
  }, { wrapper })
  const ctl = () => view.result.current.controller
  return { fake, client, invalidate, urlCalls, phases, view, ctl }
}
const methods = (fake: FakeProjectApi) => fake.requests.map((request) => request.method)

describe('New', () => {
  it('creates the project with one POST, updates the URL and the project list, and sends nothing afterwards', async () => {
    vi.useFakeTimers()
    const { fake, invalidate, urlCalls, ctl } = setup()
    await act(async () => { await ctl().newProject('  Köprü A  ') })
    expect(fake.requests.map((request) => `${request.method} ${request.path}`)).toEqual(['POST /api/projects'])
    expect(fake.requests[0].body).toEqual(createProjectRequestBody({ project: { ...INITIAL_PROJECT, name: 'Köprü A' }, bridges: [] }))
    const id = activeProjectSession.getSnapshot().projectId
    expect(id).toBe('00000000-0000-4000-8000-000000000001')
    expect(ctl().phase).toEqual({ kind: 'ready', projectId: id })
    expect(urlCalls).toEqual([id])
    expect(invalidate).toHaveBeenCalledWith({ queryKey: PROJECT_LIST_QUERY_KEY })
    expect(WORKSPACE_SERVER_SECTION.read()?.project.name).toBe('Köprü A')
    await act(() => vi.advanceTimersByTimeAsync(1000))
    expect(fake.requests).toHaveLength(1)
  })

  it('ignores an empty or blank name', async () => {
    const { fake, ctl } = setup()
    await act(async () => { await ctl().newProject(''); await ctl().newProject('   ') })
    expect(fake.requests).toEqual([])
    expect(ctl().phase.kind).toBe('welcome')
  })

  it('keeps the open project and reports an error when the POST fails', async () => {
    const { fake, ctl } = setup({ openA: true })
    fake.failNext('POST', new ApiError({ status: 500, message: 'down' }))
    await act(async () => { await ctl().newProject('X') })
    expect(ctl().actionError).toBe('down')
    expect(activeProjectSession.getSnapshot().projectId).toBe(A)
  })

  it('uses the API error text for a failed POST with status 404', async () => {
    const { fake, ctl } = setup({ openA: true })
    fake.failNext('POST', new ApiError({ status: 404, message: 'Create endpoint missing' }))
    await act(async () => { await ctl().newProject('X') })
    expect(ctl().actionError).toBe('Create endpoint missing')
    expect(activeProjectSession.getSnapshot().projectId).toBe(A)
  })

  it('clears a superseded loading phase when New fails', async () => {
    const { fake, ctl, view } = setup({ url: A, holdGet: true })
    await vi.waitFor(() => expect(fake.pending('GET')).toBe(1))
    fake.failNext('POST', new ApiError({ status: 500, message: 'create failed' }))
    await act(async () => { await ctl().newProject('X') })
    expect(ctl().actionError).toBe('create failed')
    expect(ctl().phase).toEqual({ kind: 'welcome' })
    expect(view.result.current.url).toBeNull()
    await act(async () => { fake.release('GET') })
    expect(ctl().phase).toEqual({ kind: 'welcome' })
    expect(activeProjectSession.getSnapshot().projectId).toBeNull()
  })

  it('shows welcome while a New POST supersedes the first URL load', async () => {
    const { fake, ctl, view } = setup({ url: B, holdGet: true })
    await vi.waitFor(() => expect(fake.pending('GET')).toBe(1))
    fake.hold('POST')
    let creating!: Promise<void>
    await act(async () => {
      creating = ctl().newProject('X')
      await vi.waitFor(() => expect(fake.pending('POST')).toBe(1))
    })
    expect(view.result.current.url).toBeNull()
    expect(ctl().phase).toEqual({ kind: 'welcome' })
    await act(async () => { fake.release('POST'); await creating })
    await act(async () => { fake.release('GET') })
    expect(activeProjectSession.getSnapshot().projectId).not.toBeNull()
  })

  it('sends only one POST for concurrent New calls', async () => {
    const { fake, ctl } = setup()
    fake.hold('POST')
    let first!: Promise<void>
    await act(async () => {
      first = ctl().newProject('X')
      await vi.waitFor(() => expect(fake.pending('POST')).toBe(1))
      await ctl().newProject('X')
    })
    expect(methods(fake)).toEqual(['POST'])
    await act(async () => { fake.release('POST'); await first })
    expect(activeProjectSession.getSnapshot().projectId).not.toBeNull()
  })

  it('invalidates the project list when a superseded New still succeeds on the server', async () => {
    const { fake, ctl, invalidate } = setup()
    fake.hold('POST')
    let creating!: Promise<void>
    await act(async () => {
      creating = ctl().newProject('X')
      await vi.waitFor(() => expect(fake.pending('POST')).toBe(1))
      await ctl().openProject(B)
    })
    await act(async () => { fake.release('POST'); await creating })
    expect(activeProjectSession.getSnapshot().projectId).toBe(B)
    expect(fake.document('00000000-0000-4000-8000-000000000001')).toBeDefined()
    expect(invalidate).toHaveBeenCalledWith({ queryKey: PROJECT_LIST_QUERY_KEY })
  })

  it('allows another New while a superseded POST is still waiting', async () => {
    const { fake, ctl } = setup()
    fake.hold('POST')
    let first!: Promise<void>
    let second!: Promise<void>
    await act(async () => {
      first = ctl().newProject('First')
      await vi.waitFor(() => expect(fake.pending('POST')).toBe(1))
      await ctl().openProject(B)
      second = ctl().newProject('Second')
      await vi.waitFor(() => expect(fake.pending('POST')).toBe(2))
    })
    await act(async () => { fake.release('POST', 1); await second })
    const activeId = activeProjectSession.getSnapshot().projectId
    expect(WORKSPACE_SERVER_SECTION.read()?.project.name).toBe('Second')
    await act(async () => { fake.release('POST'); await first })
    expect(activeProjectSession.getSnapshot().projectId).toBe(activeId)
    expect(WORKSPACE_SERVER_SECTION.read()?.project.name).toBe('Second')
  })
})

describe('Open', () => {
  it('saves pending writes first (PUT, then GET)', async () => {
    const { fake, urlCalls, ctl } = setup({ url: A, openA: true })
    expect(SEISMIC_SERVER_SECTION.write(SEISMIC)).toBe(true)
    await act(async () => { await ctl().openProject(B) })
    expect(methods(fake)).toEqual(['PUT', 'GET'])
    expect(fake.requests[0].path).toBe(`/api/projects/${A}/loads/seismic`)
    expect(activeProjectSession.getSnapshot().projectId).toBe(B)
    expect(urlCalls).toEqual([B])
    expect(ctl().phase).toEqual({ kind: 'ready', projectId: B })
  })

  it('keeps the previous session when the document is invalid', async () => {
    const { fake, ctl } = setup({ openA: true })
    fake.seed({ ...CANONICAL_PROJECT_DOCUMENT_JSON, projectId: 'bad', unexpectedKey: 1 })
    const before = activeProjectSession.getSnapshot()
    const section = JSON.stringify(WORKSPACE_SERVER_SECTION.read())
    await act(async () => { await ctl().openProject('bad') })
    expect(ctl().actionError?.startsWith('Invalid project data:')).toBe(true)
    expect(activeProjectSession.getSnapshot()).toBe(before)
    expect(JSON.stringify(WORKSPACE_SERVER_SECTION.read())).toBe(section)
  })

  it('reports a missing project as a load error without a project and as an action error with one', async () => {
    const empty = setup()
    await act(async () => { await empty.ctl().openProject('missing') })
    const expected = `Proje bulunamadı: ${formatApiError(new ApiError({ status: 404, message: 'Project missing not found' }))}`
    expect(empty.ctl().phase).toEqual({ kind: 'load-error', projectId: 'missing', message: expected })
    empty.view.unmount()
    resetActiveProject()

    const open = setup({ openA: true })
    await act(async () => { await open.ctl().openProject('missing') })
    expect(open.ctl().actionError).toBe(expected)
    expect(open.ctl().phase).toEqual({ kind: 'ready', projectId: A })
  })

  it('does nothing for the id that is already open', async () => {
    const { fake, ctl } = setup({ openA: true })
    await act(async () => { await ctl().openProject(A) })
    expect(fake.requests).toEqual([])
  })

  it('applies only the newest request when an older response arrives late', async () => {
    const { fake, ctl } = setup()
    fake.hold('GET')
    let first!: Promise<void>
    let second!: Promise<void>
    await act(async () => {
      first = ctl().openProject(A)
      await vi.waitFor(() => expect(fake.pending('GET')).toBe(1))
      second = ctl().openProject(B)
      await vi.waitFor(() => expect(fake.pending('GET')).toBe(2))
    })
    const epoch = activeProjectSession.getSnapshot().epoch
    await act(async () => { fake.release('GET', 1); await second })
    expect(activeProjectSession.getSnapshot()).toMatchObject({ projectId: B, epoch: epoch + 1 })
    await act(async () => { fake.release('GET'); await first })
    expect(activeProjectSession.getSnapshot()).toMatchObject({ projectId: B, epoch: epoch + 1 })
    expect(ctl().busy).toBe(false)
  })
})

describe('gate', () => {
  async function stalledOpen(ctx: ReturnType<typeof setup>) {
    ctx.fake.failNext('PUT', new ApiError({ status: 500, message: 'down' }))
    SEISMIC_SERVER_SECTION.write(SEISMIC)
    await act(async () => { await ctx.ctl().openProject(B) })
  }

  it('stops at a failed save and offers retry/discard/cancel', async () => {
    const ctx = setup({ openA: true })
    await stalledOpen(ctx)
    expect(ctx.ctl().pendingSwitch).toMatchObject({ reason: 'open', target: B, canRetry: true })
    expect(methods(ctx.fake)).toEqual(['PUT'])
    expect(activeProjectSession.getSnapshot().projectId).toBe(A)
  })

  it('retry sends the PUT again and then opens', async () => {
    const ctx = setup({ openA: true })
    await stalledOpen(ctx)
    await act(async () => { await ctx.ctl().resolvePendingSwitch('retry') })
    expect(methods(ctx.fake)).toEqual(['PUT', 'PUT', 'GET'])
    expect(ctx.ctl().pendingSwitch).toBeNull()
    expect(activeProjectSession.getSnapshot().projectId).toBe(B)
  })

  it('discard reverts the section and opens without another PUT', async () => {
    const ctx = setup({ openA: true })
    await stalledOpen(ctx)
    expect(SEISMIC_SERVER_SECTION.read()).toEqual(SEISMIC)
    ctx.fake.hold('GET')
    let switching!: Promise<void>
    await act(async () => {
      switching = ctx.ctl().resolvePendingSwitch('discard')
      await vi.waitFor(() => expect(ctx.fake.pending('GET')).toBe(1))
    })
    expect(SEISMIC_SERVER_SECTION.read()).toEqual(CANONICAL_PROJECT_DOCUMENT_JSON.loads.seismic)
    await act(async () => { ctx.fake.release('GET'); await switching })
    expect(methods(ctx.fake)).toEqual(['PUT', 'GET'])
    expect(activeProjectSession.getSnapshot().projectId).toBe(B)
  })

  it('waits for writes restarted outside the gate before retrying a switch', async () => {
    const ctx = setup({ openA: true })
    await stalledOpen(ctx)
    ctx.fake.hold('PUT')
    let saveRetry!: Promise<void>
    let switchRetry!: Promise<void>
    await act(async () => {
      saveRetry = ctx.ctl().retrySaves()
      await vi.waitFor(() => expect(ctx.fake.pending('PUT')).toBe(1))
      SEISMIC_SERVER_SECTION.write({ ...SEISMIC, a: '0.6' })
      switchRetry = ctx.ctl().resolvePendingSwitch('retry')
    })
    expect(methods(ctx.fake)).toEqual(['PUT', 'PUT'])
    await act(async () => {
      ctx.fake.release('PUT')
      await vi.waitFor(() => expect(ctx.fake.pending('PUT')).toBe(1))
    })
    expect(methods(ctx.fake)).toEqual(['PUT', 'PUT', 'PUT'])
    await act(async () => { ctx.fake.release('PUT'); await Promise.all([saveRetry, switchRetry]) })
    expect(methods(ctx.fake)).toEqual(['PUT', 'PUT', 'PUT', 'GET'])
    expect(activeProjectSession.getSnapshot().projectId).toBe(B)
  })

  it('keeps the switch pending if an in-flight retry fails', async () => {
    const ctx = setup({ openA: true })
    await stalledOpen(ctx)
    ctx.fake.hold('PUT')
    ctx.fake.failNext('PUT', new ApiError({ status: 500, message: 'retry failed' }))
    let saveRetry!: Promise<void>
    let switchRetry!: Promise<void>
    await act(async () => {
      saveRetry = ctx.ctl().retrySaves()
      await vi.waitFor(() => expect(ctx.fake.pending('PUT')).toBe(1))
      switchRetry = ctx.ctl().resolvePendingSwitch('retry')
    })
    await act(async () => { ctx.fake.release('PUT'); await Promise.all([saveRetry, switchRetry]) })
    expect(ctx.ctl().pendingSwitch).toMatchObject({ reason: 'open', target: B })
    expect(ctx.ctl().busy).toBe(false)
    expect(activeProjectSession.getSnapshot().projectId).toBe(A)
    expect(methods(ctx.fake)).toEqual(['PUT', 'PUT'])
  })

  it.each(['retry', 'discard'] as const)('resumes a pending New after %s', async (choice) => {
    const ctx = setup({ openA: true })
    ctx.fake.failNext('PUT', new ApiError({ status: 500, message: 'down' }))
    SEISMIC_SERVER_SECTION.write(SEISMIC)
    await act(async () => { await ctx.ctl().newProject('X') })
    expect(ctx.ctl().pendingSwitch?.reason).toBe('new')
    await act(async () => { await ctx.ctl().resolvePendingSwitch(choice) })
    expect(methods(ctx.fake)).toEqual(choice === 'retry' ? ['PUT', 'PUT', 'POST'] : ['PUT', 'POST'])
    expect(ctx.ctl().phase.kind).toBe('ready')
  })

  it.each(['retry', 'discard'] as const)('resumes a pending Exit after %s', async (choice) => {
    const ctx = setup({ openA: true })
    ctx.fake.failNext('PUT', new ApiError({ status: 500, message: 'down' }))
    SEISMIC_SERVER_SECTION.write(SEISMIC)
    await act(async () => { await ctx.ctl().exitProject() })
    expect(ctx.ctl().pendingSwitch?.reason).toBe('exit')
    await act(async () => { await ctx.ctl().resolvePendingSwitch(choice) })
    expect(methods(ctx.fake)).toEqual(choice === 'retry' ? ['PUT', 'PUT'] : ['PUT'])
    expect(ctx.ctl().phase).toEqual({ kind: 'welcome' })
  })

  it('cancel clears the choice and keeps the error state', async () => {
    const ctx = setup({ openA: true })
    await stalledOpen(ctx)
    await act(async () => { await ctx.ctl().resolvePendingSwitch('cancel') })
    expect(ctx.ctl().pendingSwitch).toBeNull()
    expect(methods(ctx.fake)).toEqual(['PUT'])
    expect(activeProjectSession.getSnapshot().status).toBe('error')
  })

  it.each([{ outcome: 'succeeds', fails: false }, { outcome: 'fails', fails: true }])('cancel stops a gate retry when the held PUT $outcome', async ({ fails }) => {
    const ctx = setup({ openA: true })
    await stalledOpen(ctx)
    ctx.fake.hold('PUT')
    if (fails) ctx.fake.failNext('PUT', new ApiError({ status: 500, message: 'retry failed' }))
    let retry!: Promise<void>
    await act(async () => {
      retry = ctx.ctl().resolvePendingSwitch('retry')
      await vi.waitFor(() => expect(ctx.fake.pending('PUT')).toBe(1))
      await ctx.ctl().resolvePendingSwitch('cancel')
    })
    expect(ctx.ctl().pendingSwitch).toBeNull()
    expect(ctx.ctl().busy).toBe(false)
    await act(async () => { ctx.fake.release('PUT'); await retry })
    expect(ctx.ctl().pendingSwitch).toBeNull()
    expect(activeProjectSession.getSnapshot().projectId).toBe(A)
    expect(methods(ctx.fake)).toEqual(['PUT', 'PUT'])
  })

  it('cannot retry a conflict', async () => {
    const ctx = setup({ openA: true })
    ctx.fake.document(A)!.revision = 99
    SEISMIC_SERVER_SECTION.write(SEISMIC)
    await act(async () => { await ctx.ctl().openProject(B) })
    expect(ctx.ctl().pendingSwitch).toMatchObject({ reason: 'open', target: B, canRetry: false })
    const count = ctx.fake.requests.length
    await act(async () => { await ctx.ctl().resolvePendingSwitch('retry') })
    expect(ctx.fake.requests).toHaveLength(count)
    expect(ctx.ctl().pendingSwitch).not.toBeNull()
  })

  it('ignores new/open/exit while a choice is pending', async () => {
    const ctx = setup({ openA: true })
    await stalledOpen(ctx)
    const count = ctx.fake.requests.length
    await act(async () => { await ctx.ctl().newProject('Y'); await ctx.ctl().openProject(A); await ctx.ctl().exitProject() })
    expect(ctx.fake.requests).toHaveLength(count)
  })
})

describe('Reload', () => {
  it('does not discard pending writes outside a conflict', async () => {
    const { fake, ctl } = setup({ openA: true })
    SEISMIC_SERVER_SECTION.write(SEISMIC)
    await act(async () => { await ctl().reloadProject() })
    expect(fake.requests).toEqual([])
    expect(activeWriteQueue.pendingKeys()).toEqual(['loads/seismic'])
    expect(SEISMIC_SERVER_SECTION.read()).toEqual(SEISMIC)
  })

  it('replaces a conflicting state with the server document', async () => {
    const { fake, ctl } = setup({ openA: true })
    const doc = fake.document(A)!
    doc.revision = 99
    ;(doc.loads as Record<string, unknown>).seismic = SEISMIC_SERVER
    SEISMIC_SERVER_SECTION.write(SEISMIC)
    await act(async () => { await activeWriteQueue.flush().catch(() => undefined) })
    expect(activeProjectSession.getSnapshot().status).toBe('conflict')
    await act(async () => { await ctl().reloadProject() })
    expect(activeWriteQueue.pendingKeys()).toEqual([])
    expect(activeProjectSession.getSnapshot()).toMatchObject({ status: 'idle', revision: 99 })
    expect(SEISMIC_SERVER_SECTION.read()).toEqual(SEISMIC_SERVER)
  })

  it('stays in conflict and reports an error when the GET fails', async () => {
    const { fake, ctl } = setup({ openA: true })
    fake.document(A)!.revision = 99
    SEISMIC_SERVER_SECTION.write(SEISMIC)
    await act(async () => { await activeWriteQueue.flush().catch(() => undefined) })
    expect(activeProjectSession.getSnapshot().status).toBe('conflict')
    fake.failNext('GET', new ApiError({ status: 500, message: 'down' }))
    await act(async () => { await ctl().reloadProject() })
    expect(activeProjectSession.getSnapshot().status).toBe('conflict')
    expect(ctl().actionError).toBe('down')
  })
})

describe('Exit', () => {
  it('closes the project and clears the URL', async () => {
    const { urlCalls, ctl } = setup({ url: A, openA: true })
    await act(async () => { await ctl().exitProject() })
    expect(activeProjectSession.getSnapshot().projectId).toBeNull()
    expect(WORKSPACE_SERVER_SECTION.read()).toBeUndefined()
    expect(urlCalls).toEqual([null])
    expect(ctl().phase).toEqual({ kind: 'welcome' })
  })

  it('changes nothing when the gate fails', async () => {
    const { fake, urlCalls, ctl } = setup({ url: A, openA: true })
    fake.failNext('PUT', new ApiError({ status: 500, message: 'down' }))
    SEISMIC_SERVER_SECTION.write(SEISMIC)
    await act(async () => { await ctl().exitProject() })
    expect(ctl().pendingSwitch).toMatchObject({ reason: 'exit', canRetry: true })
    expect(activeProjectSession.getSnapshot().projectId).toBe(A)
    expect(urlCalls).toEqual([])
  })
})

describe('URL and first phase', () => {
  it('derives welcome, loading, ready and URL restore on the first render', async () => {
    const welcome = setup()
    expect(welcome.phases[0]).toEqual({ kind: 'welcome' })
    welcome.view.unmount(); resetActiveProject()

    const loading = setup({ url: A })
    expect(loading.phases[0]).toEqual({ kind: 'loading', projectId: A })
    await waitFor(() => expect(loading.ctl().phase).toEqual({ kind: 'ready', projectId: A }))
    loading.view.unmount(); resetActiveProject()

    const ready = setup({ url: A, openA: true })
    expect(ready.phases[0]).toEqual({ kind: 'ready', projectId: A })
    expect(ready.fake.requests).toEqual([])
    ready.view.unmount(); resetActiveProject()

    const restore = setup({ openA: true })
    expect(restore.phases[0]).toEqual({ kind: 'ready', projectId: A })
    expect(restore.urlCalls).toEqual([A])
  })

  it('opens a project when the URL changes to another id (through the gate)', async () => {
    const { fake, view } = setup({ url: A, openA: true })
    fake.failNext('PUT', new ApiError({ status: 500, message: 'down' }))
    SEISMIC_SERVER_SECTION.write(SEISMIC)
    await act(async () => { view.result.current.setUrl(B) })
    await waitFor(() => expect(view.result.current.controller.pendingSwitch).not.toBeNull())
    expect(methods(fake)).toEqual(['PUT'])
    await act(async () => { await view.result.current.controller.resolvePendingSwitch('retry') })
    expect(activeProjectSession.getSnapshot().projectId).toBe(B)
  })

  it('restores the URL when an open project loses it', async () => {
    const { urlCalls, view } = setup({ url: A, openA: true })
    await act(async () => { view.result.current.setUrl(null) })
    expect(urlCalls).toEqual([A])
  })

  it('cancels a pending list Open when the URL is cleared', async () => {
    const { fake, ctl, view } = setup({ url: A, openA: true, holdGet: true })
    let opening!: Promise<void>
    await act(async () => {
      opening = ctl().openProject(B)
      await vi.waitFor(() => expect(fake.pending('GET')).toBe(1))
    })
    await act(async () => { view.result.current.setUrl(null) })
    expect(view.result.current.url).toBe(A)
    expect(ctl().busy).toBe(false)
    await act(async () => { fake.release('GET'); await opening })
    expect(activeProjectSession.getSnapshot().projectId).toBe(A)
    expect(view.result.current.url).toBe(A)
  })

  it('puts the URL back to the open project when a URL-driven open fails', async () => {
    const { urlCalls, view } = setup({ url: A, openA: true })
    await act(async () => { view.result.current.setUrl('missing') })
    await waitFor(() => expect(view.result.current.controller.actionError).not.toBeNull())
    expect(urlCalls).toEqual([A])
    expect(view.result.current.url).toBe(A)
  })

  it('restores the session URL when a list Open supersedes a URL Open and returns 404', async () => {
    const { fake, ctl, view } = setup({ url: A, openA: true, holdGet: true })
    await act(async () => { view.result.current.setUrl(B) })
    await vi.waitFor(() => expect(fake.pending('GET')).toBe(1))
    let opening!: Promise<void>
    await act(async () => {
      opening = ctl().openProject('missing')
      await vi.waitFor(() => expect(fake.pending('GET')).toBe(2))
      fake.release('GET', 1)
      await opening
    })
    expect(ctl().actionError).toContain('Proje bulunamadı')
    expect(view.result.current.url).toBe(A)
    await act(async () => { fake.release('GET') })
    expect(activeProjectSession.getSnapshot().projectId).toBe(A)
  })

  it('restores the session URL when the list selects the active project over a URL Open', async () => {
    const { fake, ctl, view } = setup({ url: A, openA: true, holdGet: true })
    await act(async () => { view.result.current.setUrl(B) })
    await vi.waitFor(() => expect(fake.pending('GET')).toBe(1))
    await act(async () => { await ctl().openProject(A) })
    expect(view.result.current.url).toBe(A)
    await act(async () => { fake.release('GET') })
    expect(activeProjectSession.getSnapshot().projectId).toBe(A)
  })

  it('restores the session URL when a list Open supersedes a URL Open and its gate fails', async () => {
    const { fake, ctl, view } = setup({ url: A, openA: true, holdGet: true })
    await act(async () => { view.result.current.setUrl(B) })
    await vi.waitFor(() => expect(fake.pending('GET')).toBe(1))
    fake.failNext('PUT', new ApiError({ status: 500, message: 'save failed' }))
    SEISMIC_SERVER_SECTION.write(SEISMIC)
    await act(async () => { await ctl().openProject('proj-c') })
    expect(ctl().pendingSwitch?.reason).toBe('open')
    expect(view.result.current.url).toBe(A)
    await act(async () => { await ctl().resolvePendingSwitch('cancel'); fake.release('GET') })
    expect(activeProjectSession.getSnapshot().projectId).toBe(A)
    expect(view.result.current.url).toBe(A)
  })

  it('still opens a valid list selection after superseding a URL Open', async () => {
    const { fake, ctl, view } = setup({ url: A, openA: true, holdGet: true })
    const C = 'proj-c'
    fake.seed({ ...CANONICAL_PROJECT_DOCUMENT_JSON, projectId: C })
    await act(async () => { view.result.current.setUrl(B) })
    await vi.waitFor(() => expect(fake.pending('GET')).toBe(1))
    let opening!: Promise<void>
    await act(async () => {
      opening = ctl().openProject(C)
      await vi.waitFor(() => expect(fake.pending('GET')).toBe(2))
    })
    expect(view.result.current.url).toBe(A)
    expect(ctl().busy).toBe(true)
    await act(async () => { fake.release('GET', 1); await opening })
    expect(activeProjectSession.getSnapshot().projectId).toBe(C)
    expect(view.result.current.url).toBe(C)
    await act(async () => { fake.release('GET') })
    expect(activeProjectSession.getSnapshot().projectId).toBe(C)
  })

  it('restores the open project URL when a switch choice is pending', async () => {
    const { fake, ctl, view } = setup({ url: A, openA: true })
    fake.failNext('PUT', new ApiError({ status: 500, message: 'down' }))
    SEISMIC_SERVER_SECTION.write(SEISMIC)
    await act(async () => { await ctl().exitProject() })
    await act(async () => { view.result.current.setUrl(B) })
    expect(view.result.current.url).toBe(A)
    await act(async () => { await ctl().resolvePendingSwitch('cancel') })
    expect(activeProjectSession.getSnapshot().projectId).toBe(A)
  })

  it.each(['new', 'exit'] as const)('restores the URL when %s supersedes a URL Open and its gate fails', async (reason) => {
    const { fake, ctl, view } = setup({ url: A, openA: true, holdGet: true })
    await act(async () => { view.result.current.setUrl(B) })
    await vi.waitFor(() => expect(fake.pending('GET')).toBe(1))
    fake.failNext('PUT', new ApiError({ status: 500, message: 'save failed' }))
    SEISMIC_SERVER_SECTION.write(SEISMIC)
    await act(async () => {
      if (reason === 'new') await ctl().newProject('X')
      else await ctl().exitProject()
    })
    expect(ctl().pendingSwitch?.reason).toBe(reason)
    expect(view.result.current.url).toBe(A)
    await act(async () => { await ctl().resolvePendingSwitch('cancel'); fake.release('GET') })
    expect(activeProjectSession.getSnapshot().projectId).toBe(A)
    expect(view.result.current.url).toBe(A)
  })

  it('restores the URL when Reload supersedes a URL Open and its GET fails', async () => {
    const { fake, ctl, view } = setup({ url: A, openA: true, holdGet: true })
    await act(async () => { view.result.current.setUrl(B) })
    await vi.waitFor(() => expect(fake.pending('GET')).toBe(1))
    fake.document(A)!.revision = 99
    SEISMIC_SERVER_SECTION.write(SEISMIC)
    await act(async () => { await activeWriteQueue.flush().catch(() => undefined) })
    expect(activeProjectSession.getSnapshot().status).toBe('conflict')
    fake.failNext('GET', new ApiError({ status: 500, message: 'reload failed' }))
    let reloading!: Promise<void>
    await act(async () => {
      reloading = ctl().reloadProject()
      await vi.waitFor(() => expect(fake.pending('GET')).toBe(2))
      fake.release('GET', 1)
      await reloading
    })
    expect(ctl().actionError).toBe('reload failed')
    expect(view.result.current.url).toBe(A)
    await act(async () => { fake.release('GET') })
    expect(activeProjectSession.getSnapshot().projectId).toBe(A)
    expect(view.result.current.url).toBe(A)
  })

  it('returns to welcome when a failed URL is cleared', async () => {
    const { ctl, view } = setup({ url: 'missing' })
    await waitFor(() => expect(ctl().phase.kind).toBe('load-error'))
    await act(async () => { view.result.current.setUrl(null) })
    expect(ctl().phase).toEqual({ kind: 'welcome' })
  })

  it('ignores a pending Open after the URL returns to the active project', async () => {
    const { fake, ctl, view } = setup({ url: A, openA: true, holdGet: true })
    await act(async () => { view.result.current.setUrl(B) })
    expect(fake.pending('GET')).toBe(1)
    await act(async () => { view.result.current.setUrl(A) })
    expect(ctl().busy).toBe(false)
    await act(async () => { fake.release('GET') })
    expect(activeProjectSession.getSnapshot().projectId).toBe(A)
    expect(view.result.current.url).toBe(A)
  })

  it('ignores a pending Open when the list selects the active project', async () => {
    const { fake, ctl } = setup({ openA: true, holdGet: true })
    let opening!: Promise<void>
    await act(async () => {
      opening = ctl().openProject(B)
      await vi.waitFor(() => expect(fake.pending('GET')).toBe(1))
      await ctl().openProject(A)
    })
    expect(ctl().busy).toBe(false)
    await act(async () => { fake.release('GET'); await opening })
    expect(activeProjectSession.getSnapshot().projectId).toBe(A)
  })

  it('ignores a late response after unmount', async () => {
    const { fake, ctl, view } = setup({ holdGet: true })
    let opening!: Promise<void>
    await act(async () => {
      opening = ctl().openProject(A)
      await vi.waitFor(() => expect(fake.pending('GET')).toBe(1))
    })
    view.unmount()
    await act(async () => { fake.release('GET'); await opening })
    expect(activeProjectSession.getSnapshot().projectId).toBeNull()
    expect(WORKSPACE_SERVER_SECTION.read()).toBeUndefined()
  })

  it('opens exactly once under StrictMode', async () => {
    const switches = vi.fn()
    const off = onProjectSwitch(switches)
    const { ctl, fake } = setup({ url: A, strict: true })
    const epoch = activeProjectSession.getSnapshot().epoch
    await waitFor(() => expect(ctl().phase).toEqual({ kind: 'ready', projectId: A }))
    off()
    expect(activeProjectSession.getSnapshot().epoch).toBe(epoch + 1)
    expect(switches).toHaveBeenCalledTimes(1)
    expect(methods(fake)).toEqual(['GET'])
  })
})
