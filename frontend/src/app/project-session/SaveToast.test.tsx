import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../shared/api/http'
import type { ProjectSessionSnapshot } from '../../shared/project-store/projectSession'
import SaveToast from './SaveToast'
import type { SaveToastState } from './useSaveToast'

const snapshot = (patch: Partial<ProjectSessionSnapshot>): ProjectSessionSnapshot => ({
  epoch: 1, projectId: 'p1', revision: 1, status: 'idle', pendingCount: 0, failedKey: null, lastError: null, ...patch,
})
const FAILED: SaveToastState = { kind: 'failed', id: 1 }

function setup(patch: Partial<ProjectSessionSnapshot>, toast: SaveToastState = FAILED, busy = false) {
  const handlers = { onRetry: vi.fn(), onDiscard: vi.fn(), onReload: vi.fn(), onPause: vi.fn(), onResume: vi.fn() }
  render(<SaveToast toast={toast} snapshot={snapshot(patch)} busy={busy} {...handlers} />)
  return handlers
}
const failedToast = () => screen.getByRole('alert', { name: 'Kayıt bildirimi' })

describe('SaveToast', () => {
  it('keeps the polite status region mounted without a toast', () => {
    setup({}, null)
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('shows the saved toast inside the status region', () => {
    setup({}, { kind: 'saved', id: 2 })
    expect(screen.getByRole('status')).toHaveTextContent('Kaydedildi')
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('shows an error as a separate alert (not inside the status region) with retry and discard', async () => {
    const handlers = setup({ status: 'error', failedKey: 'loads/wind', lastError: new ApiError({ status: 500, message: 'down' }) })
    expect(failedToast()).toHaveTextContent('Kayıt hatası: down')
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
    expect(screen.getByText('Bölüm: loads/wind')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Tekrar dene' }))
    await userEvent.click(screen.getByRole('button', { name: 'Değişiklikleri at' }))
    expect(handlers.onRetry).toHaveBeenCalledTimes(1)
    expect(handlers.onDiscard).toHaveBeenCalledTimes(1)
  })

  it('lists the first three field errors of a rejection and the remainder count', () => {
    const fieldErrors = [1, 2, 3, 4, 5].map((n) => ({ field: `f${n}`, message: `m${n}` }))
    setup({ status: 'rejected', lastError: new ApiError({ status: 422, message: 'Invalid', fieldErrors }) })
    expect(failedToast()).toHaveTextContent('Kayıt reddedildi')
    expect(screen.getByText('f1: m1')).toBeInTheDocument()
    expect(screen.getByText('f3: m3')).toBeInTheDocument()
    expect(screen.queryByText('f4: m4')).toBeNull()
    expect(screen.getByText('+2 hata daha')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Değişiklikleri at' })).toBeInTheDocument()
  })

  it('offers only reload for a conflict', async () => {
    const handlers = setup({ status: 'conflict', lastError: new ApiError({ status: 409, message: 'conflict' }) })
    expect(failedToast()).toHaveTextContent('Çakışma')
    expect(screen.queryByRole('button', { name: 'Tekrar dene' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Değişiklikleri at' })).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Yeniden yükle' }))
    expect(handlers.onReload).toHaveBeenCalledTimes(1)
  })

  it('disables the buttons while busy', () => {
    setup({ status: 'error', lastError: new ApiError({ status: 500, message: 'down' }) }, FAILED, true)
    expect(screen.getByRole('button', { name: 'Tekrar dene' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Değişiklikleri at' })).toBeDisabled()
  })

  it('renders no failure toast when the session has no problem any more', () => {
    setup({ status: 'idle' })
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('pauses on hover and focus and resumes on leave and blur', async () => {
    const handlers = setup({ status: 'error', lastError: new ApiError({ status: 500, message: 'down' }) })
    await userEvent.hover(failedToast())
    expect(handlers.onPause).toHaveBeenCalledTimes(1)
    await userEvent.unhover(failedToast())
    expect(handlers.onResume).toHaveBeenCalledTimes(1)
    handlers.onPause.mockClear(); handlers.onResume.mockClear()
    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'Tekrar dene' })).toHaveFocus()
    expect(handlers.onPause).toHaveBeenCalled()
    handlers.onResume.mockClear()
    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'Değişiklikleri at' })).toHaveFocus()
    expect(handlers.onResume).not.toHaveBeenCalled()
    await userEvent.tab()
    expect(handlers.onResume).toHaveBeenCalledWith('focus')
  })
})
