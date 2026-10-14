import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import ProjectLoadScreen from './ProjectLoadScreen'

describe('ProjectLoadScreen', () => {
  it('shows the loading text and the short id', () => {
    render(<ProjectLoadScreen phase={{ kind: 'loading', projectId: '2c0e8b1a-6a53-4a3e' }} onRetry={vi.fn()} onOpenList={vi.fn()} onNew={vi.fn()} />)
    expect(screen.getByRole('status')).toHaveTextContent('Proje yükleniyor…')
    expect(screen.getByText('2c0e8b1a')).toBeInTheDocument()
  })

  it('shows the error with its three actions', async () => {
    const handlers = { onRetry: vi.fn(), onOpenList: vi.fn(), onNew: vi.fn() }
    render(<ProjectLoadScreen phase={{ kind: 'load-error', projectId: 'x', message: 'Proje bulunamadı: yok' }} {...handlers} />)
    expect(screen.getByRole('alert')).toHaveTextContent('Proje bulunamadı: yok')
    expect(screen.getByRole('heading', { name: 'Proje açılamadı' })).toBeInTheDocument()
    expect(screen.getByText('Proje bulunamadı: yok')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Tekrar dene' }))
    await userEvent.click(screen.getByRole('button', { name: 'Proje listesi' }))
    await userEvent.click(screen.getByRole('button', { name: 'Yeni proje' }))
    expect(handlers.onRetry).toHaveBeenCalledTimes(1)
    expect(handlers.onOpenList).toHaveBeenCalledTimes(1)
    expect(handlers.onNew).toHaveBeenCalledTimes(1)
  })
})
