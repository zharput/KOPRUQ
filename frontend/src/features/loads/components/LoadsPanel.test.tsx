import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import LoadsPanel from './LoadsPanel'
import { INITIAL_CROSS_SECTION_VALUES } from '../../superstructure-families'
import { readProjectData, resetProjectData } from '../../../test/projectStoreTestUtils'

const pv = (value: number, provenance = 'CODE_DEFAULT') => ({ value, provenance, codeDefaultValue: value })
const lane = (label: string, characteristic: number) => ({ label, characteristicValue: pv(characteristic), adjustmentFactor: pv(1) })
const DEFAULTS = { tandemSystem: [lane('Lane 1 tandem', 300)], udl: [lane('Lane 1 UDL', 9)], remainingAreaUdl: lane('Remaining area', 2.5) }
const RESOLVED = { notionalLanes: { lanes: [], remainingAreaWidthM: 0 }, lm1: DEFAULTS, validation: { carriagewayDefined: true, notionalLanesGenerated: true, lm1Resolved: true, warnings: [] } }

function stubFetch() {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    const body = String(url).includes('lm1-defaults') ? DEFAULTS : String(url).includes('/resolve') ? RESOLVED : {}
    return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } })
  }))
}
function renderLoads() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}><LoadsPanel crossSectionValues={INITIAL_CROSS_SECTION_VALUES} /></QueryClientProvider>)
}
beforeEach(() => { resetProjectData(); stubFetch() })
afterEach(() => vi.unstubAllGlobals())

describe('Loads project-scoped state', () => {
  it('keeps a Self Weight edit when switching to Traffic and back', async () => {
    const user = userEvent.setup(); renderLoads()
    const asphaltThickness = () => document.querySelector('.spn-formula-input:not(.spn-input-passive)') as HTMLInputElement
    expect(asphaltThickness().value).toBe('0.10')
    fireEvent.change(asphaltThickness(), { target: { value: '0.2' } })
    await user.click(screen.getByRole('tab', { name: /Traffic/ }))
    await user.click(screen.getByRole('tab', { name: /Self Weight/ }))
    expect(asphaltThickness().value).toBe('0.20')
  })
  it('keeps an LM1 alpha override when switching Loads tabs', async () => {
    const user = userEvent.setup(); renderLoads()
    const openLm1 = async () => { await user.click(screen.getByRole('tab', { name: /^Traffic/ })); await user.click(screen.getByRole('tab', { name: 'LM1' })) }
    await openLm1()
    const alpha = async () => (await waitFor(() => { const input = document.querySelector('table input.spn-input-number') as HTMLInputElement | null; expect(input).not.toBeNull(); return input! }))
    fireEvent.change(await alpha(), { target: { value: '0.8' } }); fireEvent.blur(await alpha())
    expect((await alpha()).value).toBe('0.8')
    await user.click(screen.getByRole('tab', { name: /Temperature/ }))
    await openLm1()
    expect((await alpha()).value).toBe('0.8')
    expect(readProjectData<{ tandemSystem: { adjustmentFactor: { characteristicValue?: unknown; provenance: string } }[] }>('loads.trafficLm1')!.tandemSystem[0].adjustmentFactor.provenance).toBe('PROJECT_OVERRIDE')
  })
})
