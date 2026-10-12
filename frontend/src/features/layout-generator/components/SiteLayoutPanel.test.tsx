import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import SiteLayoutPanel from './SiteLayoutPanel'

afterEach(() => vi.unstubAllGlobals())

describe('SiteLayoutPanel backend errors', () => {
  it('shows INVALID_REQUEST field errors on the matching field and the correlation id in the message', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ status: 400, code: 'INVALID_REQUEST', message: 'Request validation failed', correlationId: 'corr-77', errors: [{ field: 'c1StepM', message: 'c1StepM must be positive' }, { field: 'noPierZones[0].id', message: 'id must not be blank' }] }), { status: 400, headers: { 'Content-Type': 'application/json' } })))
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}><SiteLayoutPanel onUseLayout={vi.fn()} /></QueryClientProvider>)
    await userEvent.setup().click(screen.getByRole('button', { name: /GENERATE LAYOUTS/ }))
    const fieldError = await screen.findByText('c1StepM must be positive')
    expect(fieldError.closest('label')).toHaveTextContent('C1 search step')
    expect(screen.getByText(/Request validation failed \(Ref: corr-77\)/)).toBeInTheDocument()
    expect(screen.getByText(/noPierZones\[0\]\.id: id must not be blank/)).toBeInTheDocument()
  })
})
