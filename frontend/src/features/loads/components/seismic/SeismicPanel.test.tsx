import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import SeismicPanel from './SeismicPanel'

vi.mock('recharts', () => ({ ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>, LineChart: ({ data }: { data: unknown[] }) => <div data-testid="chart" data-points={data.length} />, Line: () => null, XAxis: () => null, YAxis: () => null, Tooltip: () => null, ReferenceLine: () => null, CartesianGrid: () => null, Legend: () => null }))

const result = (ag: number, status = 'VALID') => ({ status, ag, s: status === 'VALID' ? 1.2 : 0, tb: status === 'VALID' ? 0.15 : 0, tc: status === 'VALID' ? 0.5 : 0, td: status === 'VALID' ? 2 : 0, peakElasticAcceleration: ag * 3, points: status === 'VALID' ? [{ period: 0, acceleration: ag }, { period: 1, acceleration: ag / 2 }] : [] })
const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } })
type Deferred = { agR: number; resolve: (response: Response) => void }
function deferredFetch() {
  const calls: Deferred[] = []
  vi.stubGlobal('fetch', vi.fn((_url: string, init: RequestInit) => new Promise<Response>((resolve) => { calls.push({ agR: JSON.parse(String(init.body)).agR, resolve }) })))
  return calls
}
function renderPanel() {
  return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><SeismicPanel /></QueryClientProvider>)
}
const setPga = (value: string) => fireEvent.change(screen.getByLabelText('Reference PGA, agR'), { target: { value } })
const openDetails = () => userEvent.setup().click(screen.getByRole('button', { name: /Show Calculation Details/ }))
beforeEach(() => localStorage.clear())
afterEach(() => vi.unstubAllGlobals())

describe('SeismicPanel', () => {
  it('does not let a late response for an old input overwrite the result of the current input', async () => {
    const calls = deferredFetch(); renderPanel()
    setPga('0.2'); await waitFor(() => expect(calls).toHaveLength(1))
    setPga('0.3'); await waitFor(() => expect(calls).toHaveLength(2))
    calls[1].resolve(ok(result(0.3))); await openDetails()
    await waitFor(() => expect(screen.getByText('0.300 g')).toBeInTheDocument())
    calls[0].resolve(ok(result(0.2)))
    await new Promise((resolve) => setTimeout(resolve, 30))
    expect(screen.getByText('0.300 g')).toBeInTheDocument(); expect(screen.queryByText('0.200 g')).not.toBeInTheDocument()
  })
  it('shows the backend error message and reference for an HTTP 500', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ status: 500, code: 'INTERNAL_ERROR', message: 'Spectrum failed', correlationId: 'c-1' }), { status: 500, headers: { 'Content-Type': 'application/json' } })))
    renderPanel(); setPga('0.2')
    expect(await screen.findByRole('alert')).toHaveTextContent('Spectrum failed (Ref: c-1)')
  })
  it('clears the chart and the values and sends no request when the input is emptied', async () => {
    const fetchMock = vi.fn(async () => ok(result(0.2))); vi.stubGlobal('fetch', fetchMock)
    renderPanel(); setPga('0.2'); await openDetails()
    await waitFor(() => expect(screen.getByText('0.200 g')).toBeInTheDocument()); expect(screen.getByTestId('chart')).toHaveAttribute('data-points', '2')
    setPga('')
    await waitFor(() => expect(screen.queryByText('0.200 g')).not.toBeInTheDocument()); expect(screen.getByTestId('chart')).toHaveAttribute('data-points', '0')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
  it('presents an INVALID result as INVALID, not as zero values', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ok(result(0, 'INVALID'))))
    renderPanel(); setPga('0.2'); await openDetails()
    expect(await screen.findByRole('alert')).toHaveTextContent('INVALID')
    expect(screen.getByText('Soil Factor, S').nextElementSibling).toHaveTextContent('—'); expect(screen.getByTestId('chart')).toHaveAttribute('data-points', '0')
  })
})
