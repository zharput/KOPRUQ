import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import UniformTemperaturePanel from './UniformTemperaturePanel'
import { resetProjectData } from '../../../../test/projectStoreTestUtils'

const result = (contractionC: number | null, status = 'VALID', missingParameters: string[] = []) => ({ initialTemperatureC: 10, effectiveMinimumC: 1, effectiveMaximumC: 40, contractionC, expansionC: 30, thermalExpansionSource: 'x', standard: 'EN 1991-1-5', parameterSource: 'PROJECT_INPUT', status, missingParameters, concreteAlphaTPerC: 1e-5, steelAlphaTPerC: 1.2e-5, temperatureActionStatus: status, concreteAlphaStatus: 'VALID', steelAlphaStatus: 'VALID' })
const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } })
function renderPanel() { return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><UniformTemperaturePanel /></QueryClientProvider>) }
const set = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } })
beforeEach(() => resetProjectData())
afterEach(() => vi.unstubAllGlobals())

describe('UniformTemperaturePanel', () => {
  it('shows the result of the latest input even when responses arrive out of order', async () => {
    const calls: { min: number | null; resolve: (response: Response) => void }[] = []
    vi.stubGlobal('fetch', vi.fn((_url: string, init: RequestInit) => new Promise<Response>((resolve) => { calls.push({ min: JSON.parse(String(init.body)).effectiveMinimumTemperatureC, resolve }) })))
    renderPanel()
    set('Effective Minimum Temperature, Te,min', '1'); await waitFor(() => expect(calls).toHaveLength(1))
    set('Effective Minimum Temperature, Te,min', '2'); await waitFor(() => expect(calls).toHaveLength(2))
    calls[1].resolve(ok(result(-8))); await waitFor(() => expect(screen.getAllByText('-8 °C').length).toBeGreaterThan(0))
    calls[0].resolve(ok(result(-9)))
    await new Promise((resolve) => setTimeout(resolve, 30))
    expect(screen.getAllByText('-8 °C').length).toBeGreaterThan(0); expect(screen.queryByText('-9 °C')).not.toBeInTheDocument()
  })
  it('lists the missing parameters and shows no action values for an INVALID result', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ok(result(-9, 'INVALID', ['initialTemperatureC (T0)']))))
    renderPanel(); set('Effective Minimum Temperature, Te,min', '1')
    expect(await screen.findByText(/initialTemperatureC \(T0\)/)).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('INVALID'); expect(screen.queryByText('-9 °C')).not.toBeInTheDocument()
  })
  it('shows the backend message when the request fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ status: 500, code: 'INTERNAL_ERROR', message: 'Temperature failed', correlationId: 't-1' }), { status: 500, headers: { 'Content-Type': 'application/json' } })))
    renderPanel(); set('Effective Minimum Temperature, Te,min', '1')
    expect(await screen.findByRole('alert')).toHaveTextContent('Temperature failed (Ref: t-1)')
  })
})
