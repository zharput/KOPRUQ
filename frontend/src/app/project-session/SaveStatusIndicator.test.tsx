import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../shared/api/http'
import type { ProjectSessionSnapshot } from '../../shared/project-store/projectSession'
import SaveStatusIndicator from './SaveStatusIndicator'

const snapshot = (patch: Partial<ProjectSessionSnapshot>): ProjectSessionSnapshot => ({
  epoch: 1, projectId: 'p1', revision: 1, status: 'idle', pendingCount: 0, failedKey: null, lastError: null, ...patch,
})

function setup(patch: Partial<ProjectSessionSnapshot>) {
  const handlers = { onRetry: vi.fn(), onDiscard: vi.fn(), onReload: vi.fn() }
  render(<SaveStatusIndicator status={snapshot(patch)} {...handlers} />)
  return handlers
}

describe('SaveStatusIndicator', () => {
  it('renders nothing without a project', () => {
    const { container } = render(<SaveStatusIndicator status={snapshot({ projectId: null })} onRetry={vi.fn()} onDiscard={vi.fn()} onReload={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing while idle', () => {
    const { container } = render(<SaveStatusIndicator status={snapshot({ status: 'idle' })} onRetry={vi.fn()} onDiscard={vi.fn()} onReload={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('renders nothing while saving', () => {
    const { container } = render(<SaveStatusIndicator status={snapshot({ status: 'saving', pendingCount: 1 })} onRetry={vi.fn()} onDiscard={vi.fn()} onReload={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows an error with retry and discard', async () => {
    const handlers = setup({ status: 'error', failedKey: 'loads/wind', lastError: new ApiError({ status: 500, message: 'down' }) })
    expect(screen.getByRole('alert')).toHaveTextContent('Kayıt hatası: down')
    expect(screen.getByText('Bölüm: loads/wind')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Tekrar dene' }))
    await userEvent.click(screen.getByRole('button', { name: 'Değişiklikleri at' }))
    expect(handlers.onRetry).toHaveBeenCalledTimes(1)
    expect(handlers.onDiscard).toHaveBeenCalledTimes(1)
  })

  it('lists the first three field errors of a rejection and the remainder count', () => {
    const fieldErrors = [1, 2, 3, 4, 5].map((n) => ({ field: `f${n}`, message: `m${n}` }))
    setup({ status: 'rejected', lastError: new ApiError({ status: 422, message: 'Invalid', fieldErrors }) })
    expect(screen.getByText('f1: m1')).toBeInTheDocument()
    expect(screen.getByText('f3: m3')).toBeInTheDocument()
    expect(screen.queryByText('f4: m4')).toBeNull()
    expect(screen.getByText('+2 hata daha')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Değişiklikleri at' })).toBeInTheDocument()
  })

  it('offers only reload for a conflict', async () => {
    const handlers = setup({ status: 'conflict', lastError: new ApiError({ status: 409, message: 'conflict' }) })
    expect(screen.queryByRole('button', { name: 'Tekrar dene' })).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Yeniden yükle' }))
    expect(handlers.onReload).toHaveBeenCalledTimes(1)
  })
})
