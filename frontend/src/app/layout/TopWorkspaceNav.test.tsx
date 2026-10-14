import { MemoryRouter } from 'react-router-dom'
import type { ComponentProps } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TopWorkspaceNav from './TopWorkspaceNav'
import { NEW_PROJECT_DOCUMENT_JSON } from '../project-session/projectDocumentFixtures'
import { shortProjectId } from '../project-session/projectDisplay'
import { createFakeProjectApi, type FakeProjectApi } from '../../test/fakeProjectApi'
import { installFakeProjectApi } from '../../test/projectSessionTestUtils'
import type { ProjectSessionSnapshot } from '../../shared/project-store/projectSession'

const IDLE: ProjectSessionSnapshot = { epoch: 1, projectId: 'p-1', revision: 1, status: 'idle', pendingCount: 0, failedKey: null, lastError: null }

function projectDoc(projectId: string, name: string, updatedAt: string) {
  const base = NEW_PROJECT_DOCUMENT_JSON
  return { ...base, projectId, updatedAt, workspace: { ...base.workspace, project: { ...base.workspace.project, name } } }
}

function renderNav(props: Partial<ComponentProps<typeof TopWorkspaceNav>> = {}, fake: FakeProjectApi = createFakeProjectApi(), route = '/project') {
  installFakeProjectApi(fake)
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[route]}><TopWorkspaceNav {...props} /></MemoryRouter></QueryClientProvider>)
}

describe('TopWorkspaceNav file menu', () => {
  it('shows the project name ("Untitled" for an empty name) and the save status of the open project', () => {
    const view = renderNav({ projectId: 'p-1', projectName: 'Test Köprüsü', saveStatus: IDLE })
    expect(screen.getAllByText('Test Köprüsü')).toHaveLength(2)
    expect(screen.getByRole('status')).toHaveTextContent('Kaydedildi')
    view.unmount()
    renderNav({ projectId: 'p-1', projectName: '  ', saveStatus: IDLE })
    expect(screen.getAllByText('Untitled')).toHaveLength(2)
  })

  it('shows neither a project name nor a save status without an open project, and disables Exit', async () => {
    const user = userEvent.setup()
    renderNav({ projectId: null, saveStatus: { ...IDLE, projectId: null } })
    expect(document.querySelector('.spn-active-project')).not.toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /^File/ }))
    expect(screen.getByRole('button', { name: '× Exit' })).toBeDisabled()
  })

  it('has New, Open, Recent and Exit in the File menu, and no Save, Save As or file picker', async () => {
    const user = userEvent.setup()
    renderNav({ projectId: 'p-1' })
    await user.click(screen.getByRole('button', { name: /^File/ }))
    const dropdown = document.querySelector('.spn-file-dropdown') as HTMLElement
    expect(dropdown).toHaveTextContent('New Project...')
    expect(dropdown).toHaveTextContent('Open...')
    expect(dropdown).toHaveTextContent('Recent Projects')
    expect(dropdown).toHaveTextContent('Exit')
    expect(dropdown).not.toHaveTextContent('Save')
    expect(dropdown).not.toHaveTextContent('Erişim yok')
    expect(document.querySelector('input[type="file"]')).not.toBeInTheDocument()
  })

  it('requests the project list only while the File menu is open', async () => {
    const user = userEvent.setup(); const fake = createFakeProjectApi()
    renderNav({ projectId: 'p-1' }, fake)
    expect(fake.requests).toHaveLength(0)
    await user.click(screen.getByRole('button', { name: /^File/ }))
    await waitFor(() => expect(fake.requests.filter((request) => request.method === 'LIST')).toHaveLength(1))
  })

  it('lists the five most recently updated projects with name, date and short id, and opens the chosen one', async () => {
    const user = userEvent.setup(); const fake = createFakeProjectApi(); const onOpenProject = vi.fn()
    for (let index = 1; index <= 6; index++) fake.seed(projectDoc(`0000000${index}-0000-4000-8000-000000000000`, `Project ${index}`, `2026-10-0${index}T10:00:00Z`))
    renderNav({ projectId: 'p-1', onOpenProject }, fake)
    await user.click(screen.getByRole('button', { name: /^File/ }))
    const rows = await screen.findAllByRole('button', { name: 'Recent project' })
    expect(rows).toHaveLength(5)
    expect(rows.map((row) => row.querySelector('span')?.textContent)).toEqual(['Project 6', 'Project 5', 'Project 4', 'Project 3', 'Project 2'])
    expect(rows[0]).toHaveTextContent(shortProjectId('00000006-0000-4000-8000-000000000000'))
    await user.click(rows[1])
    expect(onOpenProject).toHaveBeenCalledWith('00000005-0000-4000-8000-000000000000')
    expect(document.querySelector('.spn-file-dropdown')).not.toBeInTheDocument()
  })

  it('shows "Untitled" for a nameless recent project', async () => {
    const user = userEvent.setup(); const fake = createFakeProjectApi()
    fake.seed(projectDoc('0000000a-0000-4000-8000-000000000000', '', '2026-10-01T10:00:00Z'))
    renderNav({ projectId: 'p-1' }, fake)
    await user.click(screen.getByRole('button', { name: /^File/ }))
    expect(await screen.findByRole('button', { name: 'Recent project' })).toHaveTextContent('Untitled')
  })

  it('keeps Recent Projects and its list in one focusable submenu', async () => {
    const user = userEvent.setup()
    renderNav({ projectId: 'p-1' })
    await user.click(screen.getByRole('button', { name: /^File/ }))
    const recentButton = screen.getByRole('button', { name: /Recent Projects/ })
    expect(recentButton).toHaveClass('spn-file-submenu-label')
    recentButton.focus()
    expect(recentButton).toHaveFocus()
    await waitFor(() => expect(screen.getByText('No recent projects')).toBeInTheDocument())
  })

  it('maps Ctrl+N, Ctrl+O and Ctrl+S to New, the project list and "save now"; there is no Save As', () => {
    const onNew = vi.fn(); const onOpenList = vi.fn(); const onSaveNow = vi.fn()
    renderNav({ projectId: 'p-1', onNew, onOpenList, onSaveNow })
    fireEvent.keyDown(window, { key: 'n', ctrlKey: true })
    fireEvent.keyDown(window, { key: 'o', ctrlKey: true })
    fireEvent.keyDown(window, { key: 's', ctrlKey: true })
    expect(onNew).toHaveBeenCalledTimes(1); expect(onOpenList).toHaveBeenCalledTimes(1); expect(onSaveNow).toHaveBeenCalledTimes(1)
  })

  it('keeps the ?project query in the workspace links', () => {
    renderNav({ projectId: 'p-1' }, createFakeProjectApi(), '/graph?project=abc')
    expect(screen.getByRole('link', { name: 'Family' })).toHaveAttribute('href', '/family-tables?project=abc')
    expect(screen.getByRole('link', { name: 'Graph' })).toHaveAttribute('aria-current', 'page')
  })
})
