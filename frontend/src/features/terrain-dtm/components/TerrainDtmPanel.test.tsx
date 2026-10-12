import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import TerrainDtmPanel from './TerrainDtmPanel'

const landXmlProps = vi.hoisted(() => ({ last: null as null | { projectId?: string; coordinateSystemLabel?: string; onImported: (v: { terrainId: string; landXmlImportId: string; hasAlignment: boolean }) => void } }))
vi.mock('../../landxml-import/components/LandXmlImportPanel', () => ({ default: (props: NonNullable<typeof landXmlProps.last>) => { landXmlProps.last = props; return <div data-testid="landxml" /> } }))
vi.mock('../../terrain-viewer', () => ({ TerrainPreview: () => <div data-testid="preview" /> }))
afterEach(() => vi.unstubAllGlobals())

const response = (status: string, warnings: string[], triangleCount: number) => ({ id: 'terrain-1', pointCount: 3, triangleCount, minXM: 0, maxXM: 1, minYM: 0, maxYM: 1, minElevationM: 0, maxElevationM: 1, previewPoints: [{ x: 0, y: 0, z: 0 }], status, warnings })
function renderPanel(onImported = vi.fn(), extra: { projectId?: string; coordinateSystemLabel?: string } = {}) {
  render(<MemoryRouter><QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}><TerrainDtmPanel onImported={onImported} {...extra} /></QueryClientProvider></MemoryRouter>)
  return onImported
}
const upload = async () => { const input = document.querySelector('input[type="file"]') as HTMLInputElement; await userEvent.setup().upload(input, new File(['1 2 3\n'], 'points.xyz', { type: 'text/plain' })) }

describe('TerrainDtmPanel import status', () => {
  it('shows REVIEW_REQUIRED prominently with its warnings, and still links the terrain to the project', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(response('REVIEW_REQUIRED', ['Fewer than 3 usable points: no triangles were created.'], 0)), { status: 200, headers: { 'Content-Type': 'application/json' } })))
    const onImported = renderPanel(); await upload()
    expect(await screen.findByText('REVIEW_REQUIRED')).toBeInTheDocument()
    expect(screen.getByText(/Fewer than 3 usable points/)).toBeInTheDocument()
    expect(onImported).toHaveBeenCalledWith({ terrainId: 'terrain-1', landXmlImportId: null })
  })
  it('shows the IMPORTED status without a review banner', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(response('IMPORTED', [], 1)), { status: 200, headers: { 'Content-Type': 'application/json' } })))
    renderPanel(); await upload()
    expect(await screen.findByText('IMPORTED')).toBeInTheDocument()
    expect(screen.queryByText(/Review required/i)).not.toBeInTheDocument()
  })
  it('shows the backend error message with the reference', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ status: 400, code: 'INVALID_INPUT', message: 'No points found in file', correlationId: 'c-5' }), { status: 400, headers: { 'Content-Type': 'application/json' } })))
    renderPanel(); await upload()
    expect(await screen.findByText(/No points found in file \(Ref: c-5\)/)).toBeInTheDocument()
  })
  it('passes the project id and CRS label to the LandXML panel and forwards the import id only when an alignment exists', async () => {
    const onImported = renderPanel(vi.fn(), { projectId: 'P-1', coordinateSystemLabel: 'EPSG:5253' })
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await userEvent.setup().upload(input, new File(['<LandXML/>'], 'surface.xml', { type: 'text/xml' }))
    expect(await screen.findByTestId('landxml')).toBeInTheDocument()
    expect(landXmlProps.last?.projectId).toBe('P-1'); expect(landXmlProps.last?.coordinateSystemLabel).toBe('EPSG:5253')
    landXmlProps.last!.onImported({ terrainId: 't1', landXmlImportId: 'lx1', hasAlignment: true })
    expect(onImported).toHaveBeenLastCalledWith({ terrainId: 't1', landXmlImportId: 'lx1' })
    landXmlProps.last!.onImported({ terrainId: 't2', landXmlImportId: 'lx2', hasAlignment: false })
    expect(onImported).toHaveBeenLastCalledWith({ terrainId: 't2', landXmlImportId: null })
  })
})
