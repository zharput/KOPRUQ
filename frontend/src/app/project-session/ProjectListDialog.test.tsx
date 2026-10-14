import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ComponentProps } from 'react'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../shared/api/http'
import { createFakeProjectApi, type FakeProjectApi } from '../../test/fakeProjectApi'
import { installFakeProjectApi, resetActiveProject } from '../../test/projectSessionTestUtils'
import ProjectListDialog from './ProjectListDialog'
import { formatUpdatedAt } from './projectDisplay'
import { NEW_PROJECT_DOCUMENT_JSON } from './projectDocumentFixtures'

afterEach(() => { cleanup(); resetActiveProject() })

const doc = (projectId: string, name: string, updatedAt: string) => ({
  ...NEW_PROJECT_DOCUMENT_JSON, projectId, updatedAt, workspace: { ...NEW_PROJECT_DOCUMENT_JSON.workspace, project: { ...NEW_PROJECT_DOCUMENT_JSON.workspace.project, name } },
})

function renderDialog(props: Partial<ComponentProps<typeof ProjectListDialog>> = {}, prepare?: (fake: FakeProjectApi) => void) {
  const fake = installFakeProjectApi(createFakeProjectApi())
  prepare?.(fake)
  const client = new QueryClient({ defaultOptions: { queries: { retry: true } } })
  const handlers = { onOpen: vi.fn(), onClose: vi.fn() }
  const view = render(
    <QueryClientProvider client={client}><ProjectListDialog open currentProjectId={null} {...handlers} {...props} /></QueryClientProvider>,
  )
  return { fake, view, ...handlers }
}

describe('ProjectListDialog', () => {
  it('shows the loading state, then the projects newest first with Untitled, short id and the open marker', async () => {
    const { fake, onOpen } = renderDialog({ currentProjectId: 'aaaaaaaa-1111' }, (created) => {
      created.seed(doc('aaaaaaaa-1111', 'Old bridge', '2026-01-01T00:00:00Z'))
      created.seed(doc('bbbbbbbb-2222', '', '2026-06-01T00:00:00Z'))
    })
    expect(screen.getByText('Projeler yükleniyor…')).toBeInTheDocument()
    const rows = await screen.findAllByRole('button', { name: /Son güncelleme/ })
    expect(rows).toHaveLength(2)
    expect(within(rows[0]).getByText('Untitled')).toBeInTheDocument()
    expect(within(rows[0]).getByText('bbbbbbbb')).toBeInTheDocument()
    expect(within(rows[1]).getByText(/Old bridge \(açık\)/)).toBeInTheDocument()
    expect(within(rows[1]).getByText(`Son güncelleme: ${formatUpdatedAt('2026-01-01T00:00:00Z')}`)).toBeInTheDocument()
    expect(rows[1]).toHaveAttribute('aria-current', 'true')
    expect(rows[0]).not.toHaveAttribute('aria-current')
    await userEvent.click(rows[0])
    expect(onOpen).toHaveBeenCalledWith('bbbbbbbb-2222')
    expect(fake.requests.filter((request) => request.method === 'LIST')).toHaveLength(1)
  })

  it('shows the empty state', async () => {
    renderDialog()
    expect(await screen.findByText('Kayıtlı proje yok.')).toBeInTheDocument()
  })

  it('shows one error without retrying and recovers with Tekrar dene', async () => {
    const { fake } = renderDialog({}, (created) => created.failNext('LIST', new ApiError({ status: 500, message: 'down' })))
    expect(await screen.findByText('Proje listesi alınamadı: down')).toBeInTheDocument()
    await new Promise((resolve) => setTimeout(resolve, 30))
    expect(fake.requests.filter((request) => request.method === 'LIST')).toHaveLength(1)
    await userEvent.click(screen.getByRole('button', { name: 'Tekrar dene' }))
    expect(await screen.findByText('Kayıtlı proje yok.')).toBeInTheDocument()
    expect(fake.requests.filter((request) => request.method === 'LIST')).toHaveLength(2)
  })

  it('does not call the api while closed', async () => {
    const { fake } = renderDialog({ open: false })
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(fake.requests).toEqual([])
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('closes with the button and with Escape, and labels the dialog', async () => {
    const { onClose } = renderDialog()
    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveAccessibleName('Proje aç')
    await userEvent.click(screen.getByRole('button', { name: 'Kapat' }))
    expect(onClose).toHaveBeenCalledTimes(1)
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('does not close while a project switch is busy', async () => {
    const { onClose } = renderDialog({ busy: true })
    const close = screen.getByRole('button', { name: 'Kapat' })
    expect(close).toBeDisabled()
    await userEvent.click(close)
    await userEvent.keyboard('{Escape}')
    expect(onClose).not.toHaveBeenCalled()
  })
})
