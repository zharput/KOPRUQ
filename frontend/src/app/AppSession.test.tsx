import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { CANONICAL_PROJECT_DOCUMENT_JSON, NEW_PROJECT_DOCUMENT_JSON } from './project-session/projectDocumentFixtures'
import { ApiError } from '../shared/api/http'
import { activeProjectSession, activeWriteQueue } from '../shared/project-store/activeProject'
import { SAVE_ERROR_TOAST_MS } from './project-session/saveToastTracker'
import { saveFamilyRecords } from '../features/family-registry/model/familyRepository'
import { SEISMIC_INPUTS_MODULE } from '../features/loads/model/loadsProjectModules'
import { readProjectState, writeProjectState } from '../features/project/model/projectWorkspace'
import { createFakeProjectApi, type FakeProjectApi } from '../test/fakeProjectApi'
import { flushProjectWrites, installFakeProjectApi, openTestProject, putRequests, resetActiveProject } from '../test/projectSessionTestUtils'

/**
 * The application shell over the project session (BACKEND-DB-PERSISTENCE M5c): the real router adapter, the real session controller and
 * the real screens, with the in-memory fake backend. Each test starts from a closed project and an address bar at `/`.
 */
const A = CANONICAL_PROJECT_DOCUMENT_JSON.projectId
const B = '0b0b0b0b-0000-4000-8000-00000000000b'
const C = '0c0c0c0c-0000-4000-8000-00000000000c'
const projectDoc = (projectId: string, name: string, updatedAt: string) => ({
  ...CANONICAL_PROJECT_DOCUMENT_JSON, projectId, updatedAt,
  workspace: { ...CANONICAL_PROJECT_DOCUMENT_JSON.workspace, project: { ...CANONICAL_PROJECT_DOCUMENT_JSON.workspace.project, name } },
})

let fake: FakeProjectApi
beforeEach(() => {
  resetActiveProject()
  fake = installFakeProjectApi(createFakeProjectApi())
  window.history.replaceState({}, '', '/')
})
afterEach(() => { cleanup(); vi.restoreAllMocks(); resetActiveProject() })

const topNav = () => within(document.querySelector('.spn-workspace-nav') as HTMLElement)
const saveToast = () => document.querySelector('.spn-save-toast[data-kind="saved"]')
// The failure toast is a role=alert named 'Kayıt bildirimi'; the action-error band is a role=alert as well, so the name tells them apart.
const failedToastNode = () => screen.queryByRole('alert', { name: 'Kayıt bildirimi' })
const failedToast = async () => within(await screen.findByRole('alert', { name: 'Kayıt bildirimi' }, { timeout: 3000 }))
// The 8 s of the failure toast are covered with fake timers in useSaveToast.test; here the expiry is shortened so that "the toast is gone" can be reached.
const shortenErrorToast = () => {
  const real = globalThis.setTimeout
  vi.spyOn(globalThis, 'setTimeout').mockImplementation(((handler: TimerHandler, ms?: number, ...args: unknown[]) => real(handler, ms === SAVE_ERROR_TOAST_MS ? 50 : ms, ...args)) as typeof setTimeout)
}
const fileButton = () => topNav().getByRole('button', { name: /^File/ })
const search = () => new URLSearchParams(window.location.search).get('project')
const names = (requests: { method: string; path: string }[]) => requests.map((request) => `${request.method} ${request.path.replace(/^(\/api\/projects)\/[^/]+/, '$1/{id}')}`)
async function startAt(url: string) {
  window.history.replaceState({}, '', url)
  const view = render(<App />)
  return view
}
async function renameProject(user: ReturnType<typeof userEvent.setup>, suffix: string) {
  const properties = within(await screen.findByRole('complementary', { name: 'Project Properties' }))
  await user.click(properties.getByRole('button', { name: 'Edit Project' }))
  await user.type(properties.getByLabelText('Project Name'), suffix)
  await user.click(properties.getByRole('button', { name: 'Save' }))
}
const navigateTo = (url: string) => act(() => { window.history.pushState({}, '', url); window.dispatchEvent(new PopStateEvent('popstate')) })

describe('Welcome and New', () => {
  it('sends no request on the Welcome screen; New asks for a name, creates the project with one POST and shows it without a save toast', async () => {
    const user = userEvent.setup()
    await startAt('/')
    expect(await screen.findByRole('main', { name: 'KOPRUQ Welcome' })).toBeInTheDocument()
    expect(fake.requests).toEqual([])
    expect(screen.queryByRole('complementary', { name: 'Project sections' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'New Project' }))
    const create = screen.getByRole('button', { name: 'Oluştur' })
    expect(create).toBeDisabled()
    await user.type(screen.getByLabelText('Proje adı'), '   ')
    expect(create).toBeDisabled()
    await user.type(screen.getByLabelText('Proje adı'), '  Test Köprüsü  ')
    await user.click(create)
    await waitFor(() => expect(search()).not.toBeNull())
    expect(names(fake.requests)).toEqual(['POST /api/projects'])
    expect((fake.requests[0].body as { workspace: { project: { name: string } } }).workspace.project.name).toBe('Test Köprüsü')
    expect(search()).toBe(activeProjectSession.getSnapshot().projectId)
    expect(window.location.pathname).toBe('/project')
    expect(await screen.findByRole('heading', { name: 'Project Overview' })).toBeInTheDocument()
    const nav = topNav()
    expect(nav.getAllByText('Test Köprüsü').length).toBeGreaterThan(0)
    expect(nav.queryByRole('status')).not.toBeInTheDocument()
    expect(saveToast()).toBeNull()
    await new Promise((resolve) => setTimeout(resolve, 1000))
    expect(fake.requests).toHaveLength(1)
    expect(saveToast()).toBeNull()
  })

  it('requests the project list only when the File menu opens', async () => {
    const user = userEvent.setup()
    await startAt('/')
    await screen.findByRole('main', { name: 'KOPRUQ Welcome' })
    expect(fake.requests).toEqual([])
    await user.click(fileButton())
    await waitFor(() => expect(fake.requests.filter((request) => request.method === 'LIST')).toHaveLength(1))
  })

  it('keeps the Welcome screen (not the loading screen) while a New request supersedes the first URL load', async () => {
    const user = userEvent.setup()
    fake.seed(CANONICAL_PROJECT_DOCUMENT_JSON)
    fake.hold('GET'); fake.hold('POST')
    await startAt(`/project?project=${A}`)
    expect(await screen.findByText('Proje yükleniyor…')).toBeInTheDocument()
    await user.click(fileButton())
    await user.click(screen.getByRole('button', { name: /New Project/ }))
    await user.type(screen.getByLabelText('Proje adı'), 'Yeni')
    await user.click(screen.getByRole('button', { name: 'Oluştur' }))
    await waitFor(() => expect(fake.pending('POST')).toBe(1))
    expect(screen.queryByText('Proje yükleniyor…')).not.toBeInTheDocument()
    expect(screen.getByRole('main', { name: 'KOPRUQ Welcome' })).toBeInTheDocument()
    await act(async () => { fake.unhold('GET'); fake.unhold('POST') })
    await waitFor(() => expect(activeProjectSession.getSnapshot().projectId).toBe('00000000-0000-4000-8000-000000000001'))
    expect(search()).toBe('00000000-0000-4000-8000-000000000001')
  })
})

describe('Open, loading and load errors', () => {
  it('shows loading and then the project for a ?project URL, with the saved indicator and no PUT', async () => {
    fake.seed(CANONICAL_PROJECT_DOCUMENT_JSON)
    fake.hold('GET')
    await startAt(`/project?project=${A}`)
    expect(await screen.findByRole('status')).toHaveTextContent('Proje yükleniyor…')
    await act(async () => { fake.unhold('GET') })
    expect(await screen.findByRole('heading', { name: 'Project Overview' })).toBeInTheDocument()
    expect(topNav().getAllByText('Corridor 7').length).toBeGreaterThan(0)
    await new Promise((resolve) => setTimeout(resolve, 400))
    expect(names(fake.requests)).toEqual(['GET /api/projects/{id}'])
  })

  it('shows the three actions for a missing project and "Tekrar dene" requests it again; nothing is hydrated', async () => {
    const user = userEvent.setup()
    await startAt(`/project?project=${A}`)
    const alert = await screen.findByRole('alert')
    expect(within(alert).getByText('Proje açılamadı')).toBeInTheDocument()
    expect(within(alert).getByText(/Proje bulunamadı/)).toBeInTheDocument()
    expect(within(alert).getAllByRole('button').map((button) => button.textContent)).toEqual(['Tekrar dene', 'Proje listesi', 'Yeni proje'])
    expect(activeProjectSession.getSnapshot().projectId).toBeNull()
    expect(readProjectState().bridges).toEqual([])
    fake.seed(CANONICAL_PROJECT_DOCUMENT_JSON)
    await user.click(within(alert).getByRole('button', { name: 'Tekrar dene' }))
    expect(await screen.findByRole('heading', { name: 'Project Overview' })).toBeInTheDocument()
    expect(fake.requests.filter((request) => request.method === 'GET')).toHaveLength(2)
  })

  it('a document that fails validation changes nothing and is reported', async () => {
    const user = userEvent.setup()
    fake.seed(CANONICAL_PROJECT_DOCUMENT_JSON)
    fake.seed({ ...projectDoc(B, 'Broken', '2026-10-01T00:00:00Z'), unexpectedKey: 1 })
    await startAt(`/project?project=${A}`)
    await screen.findByRole('heading', { name: 'Project Overview' })
    await user.click(fileButton())
    await user.click(screen.getByRole('button', { name: 'Open...' }))
    await user.click(await screen.findByRole('button', { name: /Broken/ }))
    expect(await screen.findByText(/Invalid project data/)).toBeInTheDocument()
    expect(activeProjectSession.getSnapshot().projectId).toBe(A)
    expect(search()).toBe(A)
  })

  it('lists projects newest first in Open and in Recent (first five), and opens the chosen one through the gate', async () => {
    const user = userEvent.setup()
    fake.seed(CANONICAL_PROJECT_DOCUMENT_JSON)
    for (let index = 1; index <= 6; index++) fake.seed(projectDoc(`0000000${index}-0000-4000-8000-000000000000`, `Old ${index}`, `2026-09-0${index}T10:00:00Z`))
    await startAt(`/project?project=${A}`)
    await screen.findByRole('heading', { name: 'Project Overview' })
    await user.click(fileButton())
    const recent = await screen.findAllByRole('button', { name: 'Recent project' })
    expect(recent).toHaveLength(5)
    expect(recent[0]).toHaveTextContent('Corridor 7')
    expect(recent[1]).toHaveTextContent('Old 6')
    await user.click(screen.getByRole('button', { name: 'Open...' }))
    const rows = await screen.findAllByRole('button', { name: /Son güncelleme/ })
    expect(rows).toHaveLength(7)
    expect(rows[0]).toHaveTextContent('Corridor 7 (açık)')
    await user.click(rows[1])
    await waitFor(() => expect(activeProjectSession.getSnapshot().projectId).toBe('00000006-0000-4000-8000-000000000000'))
    expect(search()).toBe('00000006-0000-4000-8000-000000000000')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(saveToast()).toBeNull()
  })
})

describe('Writes, status and failures', () => {
  it('Add bridge sends the workspace PUT and then the bridge-definitions PUT, with chained revisions, and both come back after a reopen', async () => {
    const user = userEvent.setup()
    fake.seed(CANONICAL_PROJECT_DOCUMENT_JSON)
    await startAt(`/project/bridge-information?project=${A}`)
    await user.click(await screen.findByRole('button', { name: '+ Add bridge' }))
    await user.type(screen.getByPlaceholderText('e.g. VIA-13'), 'VIA-13')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await flushProjectWrites()
    const puts = putRequests(fake)
    expect(puts.map((request) => request.path.split('/').slice(-1)[0])).toEqual(['workspace', 'bridge-definitions'])
    expect(puts.map((request) => (request.body as { expectedRevision: number }).expectedRevision)).toEqual([17, 18])
    expect(topNav().queryByRole('status')).not.toBeInTheDocument()
    await waitFor(() => expect(saveToast()).toHaveTextContent('Kaydedildi'))
    expect(saveToast()).toHaveAttribute('data-kind', 'saved')
    await waitFor(() => expect(saveToast()).toBeNull(), { timeout: 3000 })
    openTestProject(fake.document(A))
    expect(readProjectState().bridges.map((bridge) => bridge.no)).toContain('VIA-13')
  })

  it('shows the conflict band and sends nothing more; "Yeniden yükle" loads the server document and returns to saved', async () => {
    const user = userEvent.setup()
    fake.seed(CANONICAL_PROJECT_DOCUMENT_JSON)
    await startAt(`/project?project=${A}`)
    await screen.findByRole('heading', { name: 'Project Overview' })
    fake.document(A)!.revision = 99
    const workspace = fake.document(A)!.workspace as { project: { name: string } }
    workspace.project.name = 'Changed elsewhere'
    await renameProject(user, ' local')
    const banner = await failedToast()
    expect(banner.getByText(/Çakışma/)).toBeInTheDocument()
    expect(topNav().queryByRole('alert')).not.toBeInTheDocument()
    const puts = putRequests(fake).length
    await renameProject(user, ' again')
    await new Promise((resolve) => setTimeout(resolve, 500))
    expect(putRequests(fake)).toHaveLength(puts)
    const gets = fake.requests.filter((request) => request.method === 'GET').length
    await user.click(banner.getByRole('button', { name: 'Yeniden yükle' }))
    await waitFor(() => expect(fake.requests.filter((request) => request.method === 'GET')).toHaveLength(gets + 1))
    await waitFor(() => expect(failedToastNode()).not.toBeInTheDocument())
    expect(screen.queryByText('Kaydedildi')).not.toBeInTheDocument()
    expect(readProjectState().project.name).toBe('Changed elsewhere')
    expect(activeProjectSession.getSnapshot().revision).toBe(99)
  })

  it('reports a server error, keeps the writes, warns before unload only while something is unsaved, and Retry recovers', async () => {
    const user = userEvent.setup()
    fake.seed(CANONICAL_PROJECT_DOCUMENT_JSON)
    await startAt(`/project?project=${A}`)
    await screen.findByRole('heading', { name: 'Project Overview' })
    const unload = () => { const event = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(event); return event.defaultPrevented }
    expect(unload()).toBe(false)
    fake.failNext('PUT', new ApiError({ status: 500, message: 'down', correlationId: 'corr-1' }))
    await renameProject(user, ' x')
    expect(unload()).toBe(true) // pending, not yet sent
    const banner = await failedToast()
    expect(banner.getByText(/Kayıt hatası: down \(Ref: corr-1\)/)).toBeInTheDocument()
    expect(topNav().queryByRole('alert')).not.toBeInTheDocument()
    expect(unload()).toBe(true)
    expect(failedToastNode()).toHaveAttribute('data-kind', 'failed')
    expect(activeWriteQueue.pendingKeys()).toEqual(['workspace'])
    await user.click(banner.getByRole('button', { name: 'Tekrar dene' }))
    await waitFor(() => expect(saveToast()).toHaveTextContent('Kaydedildi'))
    expect(failedToastNode()).not.toBeInTheDocument()
    expect(unload()).toBe(false)
    expect(putRequests(fake, 'workspace')).toHaveLength(2)
  })

  it('shows the first three field errors of a rejected write and Discard reverts the value', async () => {
    const user = userEvent.setup()
    fake.seed(CANONICAL_PROJECT_DOCUMENT_JSON)
    await startAt(`/project?project=${A}`)
    await screen.findByRole('heading', { name: 'Project Overview' })
    fake.failNext('PUT', new ApiError({ status: 400, message: 'invalid', fieldErrors: [1, 2, 3, 4].map((n) => ({ field: `f${n}`, message: `bad ${n}` })) }))
    await renameProject(user, ' x')
    const banner = await failedToast()
    expect(banner.getByText('Kayıt reddedildi')).toBeInTheDocument()
    for (const n of [1, 2, 3]) expect(banner.getByText(`f${n}: bad ${n}`)).toBeInTheDocument()
    expect(banner.queryByText('f4: bad 4')).not.toBeInTheDocument()
    expect(readProjectState().project.name).toBe('Corridor 7 x')
    await user.click(banner.getByRole('button', { name: 'Değişiklikleri at' }))
    await waitFor(() => expect(readProjectState().project.name).toBe('Corridor 7'))
    expect(failedToastNode()).not.toBeInTheDocument()
    expect(screen.queryByText('Kaydedildi')).not.toBeInTheDocument()
  })

  it('shows the green toast for a Units & Preferences change and removes it again', async () => {
    const user = userEvent.setup()
    fake.seed(CANONICAL_PROJECT_DOCUMENT_JSON)
    await startAt(`/project/units?project=${A}`)
    await user.selectOptions(await screen.findByLabelText('Length'), 'mm')
    await waitFor(() => expect(putRequests(fake, 'workspace')).toHaveLength(1))
    await waitFor(() => expect(saveToast()).toHaveTextContent('Kaydedildi'))
    expect(saveToast()).toHaveAttribute('data-kind', 'saved')
    expect(topNav().queryByRole('status')).not.toBeInTheDocument()
    await waitFor(() => expect(saveToast()).toBeNull(), { timeout: 3000 })
  })

  it('brings the failure toast back on a new edit of the same key after it went away, without sending the edit', async () => {
    const user = userEvent.setup()
    shortenErrorToast()
    fake.seed(CANONICAL_PROJECT_DOCUMENT_JSON)
    await startAt(`/project?project=${A}`)
    await screen.findByRole('heading', { name: 'Project Overview' })
    fake.failNext('PUT', new ApiError({ status: 500, message: 'down' }))
    await renameProject(user, ' x')
    await failedToast()
    await waitFor(() => expect(failedToastNode()).not.toBeInTheDocument())
    expect(activeProjectSession.getSnapshot().status).toBe('error')
    const puts = putRequests(fake).length
    await renameProject(user, 'y')
    expect(await failedToast()).toBeTruthy()
    await new Promise((resolve) => setTimeout(resolve, 500))
    expect(putRequests(fake)).toHaveLength(puts)
    expect(activeProjectSession.getSnapshot().status).toBe('error')
    expect(readProjectState().project.name).toBe('Corridor 7 xy')
  })

  it('Ctrl+S on a failed save retries it (one more PUT) and ends in the saved toast', async () => {
    const user = userEvent.setup()
    shortenErrorToast()
    fake.seed(CANONICAL_PROJECT_DOCUMENT_JSON)
    await startAt(`/project?project=${A}`)
    await screen.findByRole('heading', { name: 'Project Overview' })
    fake.failNext('PUT', new ApiError({ status: 500, message: 'down' }))
    await renameProject(user, ' x')
    await failedToast()
    await waitFor(() => expect(failedToastNode()).not.toBeInTheDocument())
    expect(putRequests(fake, 'workspace')).toHaveLength(1)
    fireEvent.keyDown(window, { key: 's', ctrlKey: true })
    await waitFor(() => expect(putRequests(fake, 'workspace')).toHaveLength(2))
    await waitFor(() => expect(saveToast()).toHaveTextContent('Kaydedildi'))
    expect(failedToastNode()).not.toBeInTheDocument()
  })

  it('Ctrl+S on a conflict sends no request and shows the notification again', async () => {
    const user = userEvent.setup()
    shortenErrorToast()
    fake.seed(CANONICAL_PROJECT_DOCUMENT_JSON)
    await startAt(`/project?project=${A}`)
    await screen.findByRole('heading', { name: 'Project Overview' })
    fake.document(A)!.revision = 99
    await renameProject(user, ' x')
    await failedToast()
    await waitFor(() => expect(failedToastNode()).not.toBeInTheDocument())
    const requests = fake.requests.length
    fireEvent.keyDown(window, { key: 's', ctrlKey: true })
    expect(await failedToast()).toBeTruthy()
    expect(failedToastNode()).toHaveTextContent('Çakışma')
    expect(fake.requests).toHaveLength(requests)
  })

  it('Ctrl+S sends pending writes at once and Ctrl+O / Ctrl+N open the list and the name dialog', async () => {
    fake.seed(CANONICAL_PROJECT_DOCUMENT_JSON)
    await startAt(`/project?project=${A}`)
    await screen.findByRole('heading', { name: 'Project Overview' })
    SEISMIC_INPUTS_MODULE.write({ a: '0.9', g: '1', t: '1', i: '1' })
    expect(putRequests(fake)).toHaveLength(0)
    fireEvent.keyDown(window, { key: 's', ctrlKey: true })
    await waitFor(() => expect(putRequests(fake, 'loads/seismic')).toHaveLength(1))
    fireEvent.keyDown(window, { key: 'o', ctrlKey: true })
    expect(await screen.findByRole('dialog', { name: 'Proje aç' })).toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'n', ctrlKey: true })
    expect(await screen.findByRole('dialog', { name: 'Yeni proje' })).toBeInTheDocument()
  })

  it('Ctrl+S without pending writes sends nothing and shows no toast', async () => {
    fake.seed(CANONICAL_PROJECT_DOCUMENT_JSON)
    await startAt(`/project?project=${A}`)
    await screen.findByRole('heading', { name: 'Project Overview' })
    fireEvent.keyDown(window, { key: 's', ctrlKey: true })
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(putRequests(fake)).toHaveLength(0)
    expect(saveToast()).toBeNull()
  })

  it('has no Save, Save As, file picker or recent-file access prompt', async () => {
    const user = userEvent.setup()
    fake.seed(CANONICAL_PROJECT_DOCUMENT_JSON)
    await startAt(`/project?project=${A}`)
    await screen.findByRole('heading', { name: 'Project Overview' })
    await user.click(fileButton())
    expect(screen.queryByRole('button', { name: /^Save/ })).not.toBeInTheDocument()
    expect(document.querySelector('input[type="file"]')).not.toBeInTheDocument()
    expect(screen.queryByText(/Erişim yok/)).not.toBeInTheDocument()
  })
})

describe('Unsaved-changes gate', () => {
  async function openWithStalledWrite(user: ReturnType<typeof userEvent.setup>) {
    fake.seed(CANONICAL_PROJECT_DOCUMENT_JSON)
    fake.seed(projectDoc(B, 'Project B', '2026-10-02T00:00:00Z'))
    await startAt(`/project?project=${A}`)
    await screen.findByRole('heading', { name: 'Project Overview' })
    fake.failNext('PUT', new ApiError({ status: 500, message: 'down' }))
    SEISMIC_INPUTS_MODULE.write({ a: '0.9', g: '1', t: '1', i: '1' })
    await user.click(fileButton())
    await user.click(screen.getByRole('button', { name: 'Open...' }))
    await user.click(await screen.findByRole('button', { name: /Project B/ }))
    return screen.findByRole('dialog', { name: 'Kaydedilmemiş değişiklikler' })
  }

  it('asks TEKRAR DENE / DEĞİŞİKLİKLERİ AT / İPTAL when a save fails before switching; İPTAL keeps the project', async () => {
    const user = userEvent.setup()
    const modal = within(await openWithStalledWrite(user))
    expect(modal.getByText('down')).toBeInTheDocument()
    expect(modal.getByRole('button', { name: 'TEKRAR DENE' })).toBeEnabled()
    await user.click(modal.getByRole('button', { name: 'İPTAL' }))
    expect(screen.queryByRole('dialog', { name: 'Kaydedilmemiş değişiklikler' })).not.toBeInTheDocument()
    expect(activeProjectSession.getSnapshot().projectId).toBe(A)
    expect(fake.requests.filter((request) => request.method === 'GET')).toHaveLength(1)
  })

  it('Ctrl+S does not retry the failed save while the unsaved-changes decision is open', async () => {
    const user = userEvent.setup()
    await openWithStalledWrite(user)
    const puts = putRequests(fake).length
    fireEvent.keyDown(window, { key: 's', ctrlKey: true })
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(putRequests(fake)).toHaveLength(puts)
    expect(activeProjectSession.getSnapshot().status).toBe('error')
    expect(screen.getByRole('dialog', { name: 'Kaydedilmemiş değişiklikler' })).toBeInTheDocument()
  })

  it('TEKRAR DENE saves and then opens; DEĞİŞİKLİKLERİ AT opens without saving', async () => {
    const user = userEvent.setup()
    const retry = within(await openWithStalledWrite(user))
    await user.click(retry.getByRole('button', { name: 'TEKRAR DENE' }))
    await waitFor(() => expect(activeProjectSession.getSnapshot().projectId).toBe(B))
    expect(putRequests(fake, 'loads/seismic')).toHaveLength(2)
    expect(search()).toBe(B)
  })

  it('DEĞİŞİKLİKLERİ AT opens the other project without another PUT', async () => {
    const user = userEvent.setup()
    const modal = within(await openWithStalledWrite(user))
    await user.click(modal.getByRole('button', { name: 'DEĞİŞİKLİKLERİ AT' }))
    await waitFor(() => expect(activeProjectSession.getSnapshot().projectId).toBe(B))
    expect(putRequests(fake, 'loads/seismic')).toHaveLength(1)
  })

  it('cannot retry a conflict, and "Yeniden yükle" is disabled while the decision is open', async () => {
    const user = userEvent.setup()
    fake.seed(CANONICAL_PROJECT_DOCUMENT_JSON)
    fake.seed(projectDoc(B, 'Project B', '2026-10-02T00:00:00Z'))
    await startAt(`/project?project=${A}`)
    await screen.findByRole('heading', { name: 'Project Overview' })
    fake.document(A)!.revision = 99
    SEISMIC_INPUTS_MODULE.write({ a: '0.9', g: '1', t: '1', i: '1' })
    await user.click(fileButton())
    await user.click(screen.getByRole('button', { name: 'Open...' }))
    await user.click(await screen.findByRole('button', { name: /Project B/ }))
    const modal = within(await screen.findByRole('dialog', { name: 'Kaydedilmemiş değişiklikler' }))
    expect(modal.getByRole('button', { name: 'TEKRAR DENE' })).toBeDisabled()
    expect((await failedToast()).getByRole('button', { name: 'Yeniden yükle' })).toBeDisabled()
    const gets = fake.requests.filter((request) => request.method === 'GET').length
    await user.click(modal.getByRole('button', { name: 'İPTAL' }))
    expect(fake.requests.filter((request) => request.method === 'GET')).toHaveLength(gets)
    expect((await failedToast()).getByRole('button', { name: 'Yeniden yükle' })).toBeEnabled()
  })

  it('Exit still asks about the stalled write after the failure toast is gone', async () => {
    const user = userEvent.setup()
    shortenErrorToast()
    fake.seed(CANONICAL_PROJECT_DOCUMENT_JSON)
    await startAt(`/project?project=${A}`)
    await screen.findByRole('heading', { name: 'Project Overview' })
    fake.failNext('PUT', new ApiError({ status: 500, message: 'down' }))
    SEISMIC_INPUTS_MODULE.write({ a: '0.9', g: '1', t: '1', i: '1' })
    await failedToast()
    await waitFor(() => expect(failedToastNode()).not.toBeInTheDocument())
    await user.click(fileButton())
    await user.click(screen.getByRole('button', { name: '× Exit' }))
    const modal = within(await screen.findByRole('dialog', { name: 'Kaydedilmemiş değişiklikler' }))
    expect(modal.getByRole('button', { name: 'TEKRAR DENE' })).toBeEnabled()
    await user.click(modal.getByRole('button', { name: 'İPTAL' }))
    expect(activeProjectSession.getSnapshot().projectId).toBe(A)
  })

  it('Exit goes through the gate and removes the project parameter', async () => {
    const user = userEvent.setup()
    fake.seed(CANONICAL_PROJECT_DOCUMENT_JSON)
    await startAt(`/project?project=${A}`)
    await screen.findByRole('heading', { name: 'Project Overview' })
    SEISMIC_INPUTS_MODULE.write({ a: '0.9', g: '1', t: '1', i: '1' })
    await user.click(fileButton())
    await user.click(screen.getByRole('button', { name: '× Exit' }))
    expect(await screen.findByRole('main', { name: 'KOPRUQ Welcome' })).toBeInTheDocument()
    expect(putRequests(fake, 'loads/seismic')).toHaveLength(1)
    expect(search()).toBeNull()
    expect(activeProjectSession.getSnapshot().projectId).toBeNull()
    expect(saveToast()).toBeNull()
  })
})

describe('URL and navigation', () => {
  it('keeps ?project when navigating inside the application and puts it back when a navigation drops it', async () => {
    const user = userEvent.setup()
    fake.seed(CANONICAL_PROJECT_DOCUMENT_JSON)
    await startAt(`/project?project=${A}`)
    await screen.findByRole('heading', { name: 'Project Overview' })
    await user.click(within(screen.getByRole('navigation', { name: 'Workspaces' })).getByRole('link', { name: 'Family' }))
    expect(window.location.pathname).toBe('/family-tables')
    expect(search()).toBe(A)
    navigateTo('/loads')
    await waitFor(() => expect(search()).toBe(A))
    expect(window.location.pathname).toBe('/loads')
  })

  it('opens a different ?project through the gate (browser navigation) and removes the parameter on Exit', async () => {
    fake.seed(CANONICAL_PROJECT_DOCUMENT_JSON)
    fake.seed(projectDoc(B, 'Project B', '2026-10-02T00:00:00Z'))
    await startAt(`/project?project=${A}`)
    await screen.findByRole('heading', { name: 'Project Overview' })
    navigateTo(`/project?project=${B}`)
    await waitFor(() => expect(activeProjectSession.getSnapshot().projectId).toBe(B))
    expect(search()).toBe(B)
  })

  it('a list Open while a URL Open is still loading ends on the chosen project and does not add history entries', async () => {
    const user = userEvent.setup()
    fake.seed(CANONICAL_PROJECT_DOCUMENT_JSON)
    fake.seed(projectDoc(B, 'Project B', '2026-10-02T00:00:00Z'))
    fake.seed(projectDoc(C, 'Project C', '2026-10-03T00:00:00Z'))
    await startAt(`/project?project=${A}`)
    await screen.findByRole('heading', { name: 'Project Overview' })
    fake.hold('GET')
    navigateTo(`/project?project=${B}`)
    await waitFor(() => expect(fake.pending('GET')).toBe(1))
    const historyLength = window.history.length
    await user.click(fileButton())
    await user.click(screen.getByRole('button', { name: 'Open...' }))
    await user.click(await screen.findByRole('button', { name: /Project C/ }))
    await waitFor(() => expect(fake.pending('GET')).toBe(2))
    await act(async () => { fake.unhold('GET') })
    await waitFor(() => expect(activeProjectSession.getSnapshot().projectId).toBe(C))
    expect(search()).toBe(C)
    expect(window.history.length).toBe(historyLength)
    await new Promise((resolve) => setTimeout(resolve, 100))
    expect(activeProjectSession.getSnapshot().projectId).toBe(C)
  })
})

describe('No open project', () => {
  it('owner write APIs refuse and send nothing; no workspace is mounted', async () => {
    await startAt('/project')
    expect(await screen.findByRole('main', { name: 'KOPRUQ Welcome' })).toBeInTheDocument()
    expect(writeProjectState({ project: readProjectState().project, bridges: [] })).toBe(false)
    expect(saveFamilyRecords('PIER', [])).toBe(false)
    expect(SEISMIC_INPUTS_MODULE.write({ a: '1', g: '1', t: '1', i: '1' })).toBe(false)
    await new Promise((resolve) => setTimeout(resolve, 400))
    expect(fake.requests).toEqual([])
    expect(screen.queryByRole('complementary', { name: 'Project sections' })).not.toBeInTheDocument()
  })

  it('a fresh New project starts without bridges and from the initial project data', async () => {
    resetActiveProject()
    installFakeProjectApi(fake)
    openTestProject(NEW_PROJECT_DOCUMENT_JSON, fake)
    expect(readProjectState().bridges).toEqual([])
  })
})

describe('Unsaved Pier starter draft', () => {
  async function openPierWithEditedDraft(user: ReturnType<typeof userEvent.setup>) {
    fake.seed(NEW_PROJECT_DOCUMENT_JSON)
    await startAt(`/pier-families?project=${NEW_PROJECT_DOCUMENT_JSON.projectId}`)
    fireEvent.change(await screen.findByLabelText('Family Name'), { target: { value: 'My Pier' } })
    return user
  }

  it('asks before leaving by a workspace link, Exit or opening a project, and stays when declined', async () => {
    const user = await openPierWithEditedDraft(userEvent.setup())
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    await user.click(screen.getByRole('link', { name: 'Project' }))
    expect(confirm).toHaveBeenCalledTimes(1)
    expect(window.location.pathname).toBe('/pier-families')
    await user.click(fileButton())
    await user.click(screen.getByRole('button', { name: '× Exit' }))
    expect(confirm).toHaveBeenCalledTimes(2)
    expect(activeProjectSession.getSnapshot().projectId).toBe(NEW_PROJECT_DOCUMENT_JSON.projectId)
    expect(screen.getByDisplayValue('My Pier')).toBeInTheDocument()
  })

  it('leaves when the user agrees, and does not ask when the draft is untouched', async () => {
    const user = await openPierWithEditedDraft(userEvent.setup())
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    await user.click(screen.getByRole('link', { name: 'Project' }))
    expect(confirm).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(window.location.pathname).toBe('/project'))
    await user.click(screen.getByRole('link', { name: 'Loads' }))
    expect(confirm).toHaveBeenCalledTimes(1)
  })

  it('keeps the list and name dialogs open when the user declines, and opens or creates when they agree', async () => {
    const user = await openPierWithEditedDraft(userEvent.setup())
    fake.seed({ ...NEW_PROJECT_DOCUMENT_JSON, projectId: B, updatedAt: '2026-10-14T00:00:00Z', workspace: { ...NEW_PROJECT_DOCUMENT_JSON.workspace, project: { ...NEW_PROJECT_DOCUMENT_JSON.workspace.project, name: 'Project B' } } })
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    await user.click(fileButton())
    await user.click(screen.getByRole('button', { name: 'Open...' }))
    await user.click(await screen.findByRole('button', { name: /Project B/ }))
    expect(confirm).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('dialog', { name: 'Proje aç' })).toBeInTheDocument()
    expect(activeProjectSession.getSnapshot().projectId).toBe(NEW_PROJECT_DOCUMENT_JSON.projectId)

    confirm.mockReturnValue(true)
    await user.click(screen.getByRole('button', { name: /Project B/ }))
    expect(confirm).toHaveBeenCalledTimes(2)
    await waitFor(() => expect(activeProjectSession.getSnapshot().projectId).toBe(B))
  })

  it('keeps the name dialog and its text when creating a project is declined', async () => {
    const user = await openPierWithEditedDraft(userEvent.setup())
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    fireEvent.keyDown(window, { key: 'n', ctrlKey: true })
    const dialog = within(await screen.findByRole('dialog', { name: 'Yeni proje' }))
    await user.type(dialog.getByLabelText('Proje adı'), 'Yeni Köprü')
    await user.click(dialog.getByRole('button', { name: 'Oluştur' }))
    expect(confirm).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('dialog', { name: 'Yeni proje' })).toBeInTheDocument()
    expect(dialog.getByLabelText('Proje adı')).toHaveValue('Yeni Köprü')
    expect(fake.requests.filter((request) => request.method === 'POST')).toHaveLength(0)
  })

  it('does not ask when the target is the project that is already open', async () => {
    const user = await openPierWithEditedDraft(userEvent.setup())
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    await user.click(fileButton())
    await user.click((await screen.findAllByRole('button', { name: 'Recent project' }))[0])
    expect(confirm).not.toHaveBeenCalled()
  })

  it('asks before "Yeniden yükle" after a conflict would remount the workspace', async () => {
    const user = await openPierWithEditedDraft(userEvent.setup())
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    fake.document(NEW_PROJECT_DOCUMENT_JSON.projectId)!.revision = 99
    SEISMIC_INPUTS_MODULE.write({ a: '0.9', g: '1', t: '1', i: '1' })
    const reload = (await failedToast()).getByRole('button', { name: 'Yeniden yükle' })
    const gets = fake.requests.filter((request) => request.method === 'GET').length
    await user.click(reload)
    expect(confirm).toHaveBeenCalledTimes(1)
    expect(fake.requests.filter((request) => request.method === 'GET')).toHaveLength(gets)
    expect(screen.getByDisplayValue('My Pier')).toBeInTheDocument()
  })
})


describe('Shortcuts under the unsaved-changes gate', () => {
  it('Ctrl+O and Ctrl+N do not open a dialog on top of the pending decision', async () => {
    const user = userEvent.setup()
    await (async () => {
      fake.seed(CANONICAL_PROJECT_DOCUMENT_JSON)
      fake.seed(projectDoc(B, 'Project B', '2026-10-02T00:00:00Z'))
      await startAt(`/project?project=${A}`)
      await screen.findByRole('heading', { name: 'Project Overview' })
      fake.failNext('PUT', new ApiError({ status: 500, message: 'down' }))
      SEISMIC_INPUTS_MODULE.write({ a: '0.9', g: '1', t: '1', i: '1' })
      await user.click(fileButton())
      await user.click(screen.getByRole('button', { name: 'Open...' }))
      await user.click(await screen.findByRole('button', { name: /Project B/ }))
      await screen.findByRole('dialog', { name: 'Kaydedilmemiş değişiklikler' })
    })()
    fireEvent.keyDown(window, { key: 'o', ctrlKey: true })
    fireEvent.keyDown(window, { key: 'n', ctrlKey: true })
    expect(screen.queryByRole('dialog', { name: 'Proje aç' })).not.toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: 'Yeni proje' })).not.toBeInTheDocument()
  })
})
