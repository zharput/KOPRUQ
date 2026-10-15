import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import SelfWeightPermanent from './SelfWeightPermanent'
import LoadsPanel from './LoadsPanel'
import CarriagewayNotionalLanes from './traffic/CarriagewayNotionalLanes'
import Lm1Panel from './traffic/Lm1Panel'
import TrafficPreviewValidation from './traffic/TrafficPreviewValidation'
import WindLoadsPanel from './wind/WindLoadsPanel'
import UniformTemperaturePanel from './temperature/UniformTemperaturePanel'
import SeismicPanel from './seismic/SeismicPanel'
import { INITIAL_CROSS_SECTION_VALUES } from '../../superstructure-families'
import type { ProjectUnits } from '../../graph/domain/quantities'
import type { LaneFactor, Lm1Parameters } from '../api/trafficLoadsService'
import type { WindCalculationSnapshot } from '../model/windTypes'
import { MemoryRouter } from 'react-router-dom'
import AppRoutes from '../../../app/router'
import WorkspacePage from '../../../app/workspaces/WorkspacePage'
import { WORKSPACES } from '../../../app/workspaces/registry'
import type { ProjectWorkspaceData } from '../../project/model/projectWorkspace'
import { readProjectData, resetProjectData, seedProjectData } from '../../../test/projectStoreTestUtils'
import { createFakeProjectApi } from '../../../test/fakeProjectApi'
import { NEW_PROJECT_DOCUMENT_JSON } from '../../../app/project-session/projectDocumentFixtures'
import { flushProjectWrites, installFakeProjectApi, openTestProject, putRequests } from '../../../test/projectSessionTestUtils'

vi.mock('recharts', () => ({ ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>, LineChart: () => <div />, Line: () => null, XAxis: () => null, YAxis: () => null, Tooltip: () => null, ReferenceLine: () => null, CartesianGrid: () => null, Legend: () => null }))

const CS = INITIAL_CROSS_SECTION_VALUES
const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } })
const qc = () => new QueryClient({ defaultOptions: { queries: { retry: false } } })
beforeEach(() => resetProjectData())
afterEach(() => vi.unstubAllGlobals())

const row = (label: string) => screen.getByText(label, { selector: '.spn-formula-label' }).parentElement as HTMLElement
const inputs = (label: string) => Array.from(row(label).querySelectorAll('input')).map((i) => (i as HTMLInputElement).value)
const decimalInput = (label: string, index: number) => row(label).querySelectorAll('input')[index] as HTMLInputElement
const result = (label: string) => row(label).querySelector('.spn-formula-result')!.textContent

describe('Self Weight & Permanent units (AC1-4, 12-14)', () => {
  it('shows canonical labels and 4-decimal values with default units', () => {
    render(<SelfWeightPermanent crossSectionValues={CS} projectUnits={{ length: 'm', force: 'kN', mass: 't' }} />)
    expect(inputs('Concrete Self Weight')).toEqual(['25.0000'])
    expect(screen.getAllByText('kN/m³').length).toBeGreaterThan(0)
    expect(inputs('Guardrail')).toEqual(['2', '2.0000'])
    expect(result('Guardrail')).toBe('4.0000 kN/m')
    expect(result('TOTAL')).toBe('55.5450 kN/m')
    expect(screen.getByText(/Permanent-load breakdown, kN\/m\./)).toBeInTheDocument()
  })

  it('converts to tonf with Length=m (AC2, AC3) and ignores the Mass preference', () => {
    const { rerender } = render(<SelfWeightPermanent crossSectionValues={CS} projectUnits={{ force: 'tonf' }} />)
    expect(inputs('Guardrail')[1]).toBe('0.2039')
    expect(result('Guardrail')).toBe('0.4079 tonf/m')
    expect(inputs('Concrete Self Weight')).toEqual(['2.5493'])
    expect(inputs('Asphalt')[2]).toBe('2.4473')
    expect(screen.getAllByText('tonf/m³').length).toBeGreaterThan(0)
    expect(result('TOTAL')).toBe(`${(55.545 / 9.80665).toFixed(4)} tonf/m`)
    const before = document.body.textContent
    rerender(<SelfWeightPermanent crossSectionValues={CS} projectUnits={{ force: 'tonf', mass: 'kg' }} />)
    expect(document.body.textContent).toBe(before)
  })

  it('follows Length=mm and cm (AC4): length 1/3 decimals, derived values 4 significant digits / 3 decimals', () => {
    const { rerender } = render(<SelfWeightPermanent crossSectionValues={CS} projectUnits={{ length: 'mm' }} />)
    expect(inputs('Asphalt')).toEqual(['100.0', '11300.0', '2.400e-8'])
    expect(result('Guardrail')).toBe('0.004000 kN/mm')
    expect(inputs('Concrete Self Weight')).toEqual(['2.500e-8'])
    expect(result('TOTAL')).toMatch(/^0\.0555[45] kN\/mm$/)
    expect(screen.getAllByText('kN/mm³').length).toBeGreaterThan(0)
    rerender(<SelfWeightPermanent crossSectionValues={CS} projectUnits={{ length: 'mm', force: 'tonf' }} />)
    expect(result('Guardrail')).toBe('0.0004079 tonf/mm')
    rerender(<SelfWeightPermanent crossSectionValues={CS} projectUnits={{ length: 'cm' }} />)
    expect(inputs('Asphalt')[0]).toBe('10.000')
    expect(result('Guardrail')).toBe('0.040 kN/cm')
  })

  it('stores the typed value canonically and round-trips (AC13)', () => {
    const { rerender } = render(<SelfWeightPermanent crossSectionValues={CS} projectUnits={{ force: 'tonf' }} />)
    fireEvent.change(decimalInput('Guardrail', 1), { target: { value: '0.5' } })
    expect(readProjectData<{ guardrailUnitLoadKNm: number }>('loads.selfWeight')!.guardrailUnitLoadKNm).toBeCloseTo(4.903325, 9)
    rerender(<SelfWeightPermanent crossSectionValues={CS} projectUnits={{ force: 'kN' }} />)
    expect(inputs('Guardrail')[1]).toBe('4.9033')
  })

  it('normalizes the stored canonical value: 0.3 kN/cm stores 30 kN/m, not 29.999999999999996 (finding 2)', () => {
    render(<SelfWeightPermanent crossSectionValues={CS} projectUnits={{ length: 'cm' }} />)
    fireEvent.change(decimalInput('Guardrail', 1), { target: { value: '0.3' } })
    expect(readProjectData<{ guardrailUnitLoadKNm: number }>('loads.selfWeight')!.guardrailUnitLoadKNm).toBe(30)
  })

  it('does not change a stored value by focusing and leaving the box', async () => {
    render(<SelfWeightPermanent crossSectionValues={CS} projectUnits={{ force: 'tonf' }} />)
    await userEvent.click(decimalInput('Guardrail', 1))
    fireEvent.blur(decimalInput('Guardrail', 1))
    expect(readProjectData('loads.selfWeight')).toBeNull()
  })

  it('shows the passive sidewalk width term in the Length unit', () => {
    render(<SelfWeightPermanent crossSectionValues={CS} projectUnits={{ length: 'mm' }} />)
    expect(inputs('Sidewalk')[1]).toBe('1000.0 + 1500.0')
  })

  it('falls back to canonical units for unknown ids (AC15)', () => {
    render(<SelfWeightPermanent crossSectionValues={CS} projectUnits={{ force: 'zz', length: '', temperature: 'q' }} />)
    expect(result('Guardrail')).toBe('4.0000 kN/m')
  })
})

describe('Traffic units (AC5, AC6)', () => {
  const lanes = { lanes: [{ number: 1, widthM: 3 }, { number: 2, widthM: 3 }], remainingAreaWidthM: 5.3 }
  it('shows carriageway widths in Length with dynamic headers', () => {
    const { rerender } = render(<CarriagewayNotionalLanes crossSectionValues={CS} carriagewayM={11.3} notionalLanes={lanes} isLoading={false} />)
    expect(screen.getByText('Width (m)')).toBeInTheDocument()
    expect(screen.getByText('Lane 1: 3.0000 m')).toBeInTheDocument()
    expect(screen.getByText('Deck (platform) width (m)').nextElementSibling).toHaveValue('13.8000')
    rerender(<CarriagewayNotionalLanes crossSectionValues={CS} carriagewayM={11.3} notionalLanes={lanes} isLoading={false} projectUnits={{ length: 'mm' }} />)
    expect(screen.getByText('Width (mm)')).toBeInTheDocument()
    expect(screen.getByText('Lane 1: 3000.0 mm')).toBeInTheDocument()
    expect(screen.getByText('Carriageway: 11300.0 mm')).toBeInTheDocument()
    expect(screen.getByText('Deck (platform) width (mm)').nextElementSibling).toHaveValue('13800.0')
  })

  const pv = (value: number) => ({ value, provenance: 'CODE_DEFAULT' as const, codeDefaultValue: value })
  const lane = (label: string, c: number): LaneFactor => ({ label, characteristicValue: pv(c), adjustmentFactor: pv(1) })
  const lm1: Lm1Parameters = { tandemSystem: [lane('Lane 1 tandem', 300)], udl: [lane('Lane 1 UDL', 9)], remainingAreaUdl: lane('Remaining area', 2.5) }
  it('shows LM1 force and pressure in project units, leaving alpha alone', () => {
    const { rerender } = render(<Lm1Panel lm1={lm1} onChange={() => {}} resolved={lm1} />)
    const cells = () => Array.from(document.querySelectorAll('tbody tr')).map((tr) => Array.from(tr.querySelectorAll('td')).map((td) => td.textContent))
    expect(cells()[0]).toEqual(['Lane 1 tandem', '300.00', ' EN default', '300.00', 'kN'])
    expect(cells()[1]).toEqual(['Lane 1 UDL', '9.0000', ' EN default', '9.0000', 'kN/m²'])
    rerender(<Lm1Panel lm1={lm1} onChange={() => {}} resolved={lm1} projectUnits={{ force: 'tonf', stress: 'kPa' }} />)
    expect(cells()[0]).toEqual(['Lane 1 tandem', '30.59', ' EN default', '30.59', 'tonf'])
    expect(cells()[1]).toEqual(['Lane 1 UDL', '0.9177', ' EN default', '0.9177', 'tonf/m²'])
    expect(screen.getByLabelText('Lane 1 tandem α')).toHaveValue('1')
    rerender(<Lm1Panel lm1={lm1} onChange={() => {}} resolved={lm1} projectUnits={{ length: 'mm' }} />)
    expect(cells()[1][4]).toBe('kN/mm²')
    expect(cells()[1][1]).toBe('0.000009000')
  })

  it('shows Preview lengths in Length', () => {
    render(<TrafficPreviewValidation carriagewayM={11.3} notionalLanes={lanes} lm1={lm1} validation={undefined} projectUnits={{ length: 'cm' }} />)
    expect(screen.getByText('1130.000 cm')).toBeInTheDocument()
    expect(screen.getByText('2 lane(s), remaining area 530.000 cm')).toBeInTheDocument()
  })
})

describe('Wind units (AC7, AC12)', () => {
  const VALID = { status: 'VALID', z0M: 0.05, zminM: 2, kr: 0.19, cr: 1.1, vmMs: 28, turbulenceIntensity: 0.2, qpKNm2: 1.1, bOverD: 4.6, cfx: 1.3, transverseKNm: 12.3, missing: null }
  function Harness({ units }: { units?: ProjectUnits }) {
    const [snapshot, setSnapshot] = useState<WindCalculationSnapshot | null>(null)
    return <WindLoadsPanel deckWidthM={13.8} snapshot={snapshot} onSnapshot={setSnapshot} projectUnits={units} />
  }
  it('edits ze in Length, sends zeM in metres, and a unit change alone never makes the result STALE', async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => ok(VALID)); vi.stubGlobal('fetch', fetchMock)
    const view = render(<Harness units={{ length: 'mm' }} />)
    fireEvent.change(screen.getByLabelText('Basic Wind Velocity, vb'), { target: { value: '27' } })
    fireEvent.change(screen.getByLabelText('Reference Height, ze'), { target: { value: '10000' } })
    await userEvent.setup().click(screen.getByRole('button', { name: /Calculate Wind/ }))
    await screen.findByText('0.01230 kN/mm')
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]!.body))).toMatchObject({ zeM: 10, vbMs: 27 })
    expect(readProjectData<{ ze: string }>('loads.wind')!.ze).toBe('10')
    expect(screen.getByLabelText('Reference Height, ze')).toHaveValue(10000)
    view.rerender(<Harness units={{ length: 'm', force: 'tonf' }} />)
    expect(screen.queryByText('STALE')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Reference Height, ze')).toHaveValue(10)
    expect(screen.getByText('1.2543 tonf/m')).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: /Details/ }))
    expect(screen.getByText('z0').nextElementSibling).toHaveTextContent('0.0500 m')
    expect(screen.getByText('qp(z)').nextElementSibling).toHaveTextContent('0.1122 tonf/m²')
    expect(screen.getByText('vm(z)').nextElementSibling).toHaveTextContent('28.000 m/s')
    expect(screen.getByText('cfx').nextElementSibling).toHaveTextContent('1.300')
    expect(screen.getByText('Reference Height, ze', { selector: 'span' }).nextElementSibling).toHaveTextContent('10.0000 m')
    expect(screen.getAllByText(/independent of the project units/).length).toBeGreaterThan(0)
  })
})

describe('Temperature units (AC8)', () => {
  const body = { initialTemperatureC: 10, effectiveMinimumC: 1, effectiveMaximumC: 40, contractionC: -20, expansionC: 30, thermalExpansionSource: 'x', standard: 'EN 1991-1-5', parameterSource: 'PROJECT_INPUT', status: 'VALID', missingParameters: [], concreteAlphaTPerC: 1e-5, steelAlphaTPerC: 1.2e-5, temperatureActionStatus: 'VALID', concreteAlphaStatus: 'VALID', steelAlphaStatus: 'VALID' }
  const panel = (units?: ProjectUnits) => <QueryClientProvider client={qc()}><UniformTemperaturePanel projectUnits={units} /></QueryClientProvider>
  it('shows results in the Temperature unit, sends deg C, and keeps default labels', async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => ok(body)); vi.stubGlobal('fetch', fetchMock)
    const view = render(panel({ temperature: 'F' }))
    fireEvent.change(screen.getByLabelText('Effective Minimum Temperature, Te,min'), { target: { value: '-4' } })
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    expect(JSON.parse(String(fetchMock.mock.calls.at(-1)![1]!.body)).effectiveMinimumTemperatureC).toBe(-20)
    expect(await screen.findAllByText('-36.00 °F')).toHaveLength(2)
    expect(screen.getAllByText(/αT = 5\.56 × 10⁻⁶ \/°F/).length).toBeGreaterThan(0)
    await userEvent.setup().click(screen.getByRole('button', { name: /Details/ }))
    expect(screen.getByText('Reference Temperature, T0').nextElementSibling).toHaveTextContent('+50.00 °F')
    const calls = fetchMock.mock.calls.length
    view.rerender(panel({ temperature: 'K' }))
    expect(fetchMock.mock.calls.length).toBe(calls)
    expect(screen.getByText('Reference Temperature, T0').nextElementSibling).toHaveTextContent('+283.15 K')
    expect(screen.getAllByText('-20.00 K')).toHaveLength(2)
    view.rerender(panel())
    expect(screen.getAllByText('-20.00 °C')).toHaveLength(2)
    expect(screen.getByText('Reference Temperature, T0').nextElementSibling).toHaveTextContent('+10.00 °C')
  })
})

describe('Seismic (AC9)', () => {
  it('shows the note that g and s are independent of the project units', () => {
    vi.stubGlobal('fetch', vi.fn(async () => ok({ status: 'INVALID', points: [] })))
    render(<QueryClientProvider client={qc()}><SeismicPanel /></QueryClientProvider>)
    expect(screen.getByText(/in g, periods in s - independent of the project units/)).toBeInTheDocument()
  })
})

describe('A unit change writes nothing (AC10)', () => {
  it('sends no PUT and leaves every loads section equal when the project units change', async () => {
    const fake = installFakeProjectApi(createFakeProjectApi()); openTestProject(NEW_PROJECT_DOCUMENT_JSON, fake)
    const temperatureBody = { initialTemperatureC: 10, effectiveMinimumC: -4, effectiveMaximumC: 40, contractionC: -14, expansionC: 30, thermalExpansionSource: 'x', standard: 'EN 1991-1-5', parameterSource: 'PROJECT_INPUT', status: 'VALID', missingParameters: [], concreteAlphaTPerC: 1e-5, steelAlphaTPerC: 1.2e-5, temperatureActionStatus: 'VALID', concreteAlphaStatus: 'VALID', steelAlphaStatus: 'VALID' }
    vi.stubGlobal('fetch', vi.fn(async (url: string) => String(url).includes('/temperature/') ? ok(temperatureBody) : ok(String(url).includes('lm1-defaults') ? { tandemSystem: [], udl: [], remainingAreaUdl: { label: 'r', characteristicValue: { value: 1, provenance: 'CODE_DEFAULT', codeDefaultValue: 1 }, adjustmentFactor: { value: 1, provenance: 'CODE_DEFAULT', codeDefaultValue: 1 } } } : {})))
    const at = (units: ProjectUnits) => <QueryClientProvider client={qc()}><LoadsPanel crossSectionValues={CS} projectUnits={units} /></QueryClientProvider>
    const view = render(at({}))
    fireEvent.change(decimalInput('Asphalt', 0), { target: { value: '0.2' } })
    await flushProjectWrites()
    // Every other loads section is seeded (no request), so "deep equal" is meaningful for all six.
    const pv = (value: number) => ({ value, provenance: 'CODE_DEFAULT' as const, codeDefaultValue: value })
    seedProjectData('loads.wind', { vb: '27', terrain: 'II', ze: '10' })
    seedProjectData('loads.temperature', { min: '-4', max: '40', t0: '10' })
    seedProjectData('loads.seismic', { a: '0.25', g: '9.81', t: '1.5', i: '1' })
    seedProjectData('loads.trafficLm1', { tandemSystem: [{ label: 'Lane 1 tandem', characteristicValue: pv(300), adjustmentFactor: pv(1) }], udl: [{ label: 'Lane 1 UDL', characteristicValue: pv(9), adjustmentFactor: pv(1) }], remainingAreaUdl: { label: 'Remaining area', characteristicValue: pv(2.5), adjustmentFactor: pv(1) } })
    seedProjectData('loads.windSnapshot', { schemaVersion: 1, status: 'VALID', inputs: { vb: '27', terrain: 'II', ze: '10', deckWidthM: 13.8, drefM: 3 }, result: { status: 'VALID', z0M: 0.05, zminM: 2, kr: 0.19, cr: 1.1, vmMs: 28, turbulenceIntensity: 0.2, qpKNm2: 1.1, bOverD: 4.6, cfx: 1.3, transverseKNm: 12.3, missing: null } })
    const keys = ['loads.selfWeight', 'loads.wind', 'loads.temperature', 'loads.trafficLm1', 'loads.seismic', 'loads.windSnapshot'] as const
    keys.forEach((k) => expect(readProjectData(k)).not.toBeNull())
    const visitTabs = async () => { for (const name of [/Wind/, /Temperature/, /Traffic/, /Self Weight/]) { await userEvent.setup().click(screen.getByRole('tab', { name })); await flushProjectWrites() } }
    const snapshot = () => keys.map((k) => JSON.stringify(readProjectData(k)))
    await visitTabs()
    const before = snapshot(); const puts = putRequests(fake).length
    expect(puts).toBeGreaterThan(0)
    view.rerender(at({ force: 'tonf', length: 'mm', temperature: 'F' }))
    await visitTabs()
    expect(putRequests(fake).length).toBe(puts)
    expect(snapshot()).toEqual(before)
    expect(within(document.body).getAllByText(/tonf\/mm/).length).toBeGreaterThan(0)
  })
})

describe('Loads workspace wiring of the project units (finding 3)', () => {
  // The Loads path reads only `project.units`.
  const project = { units: { force: 'tonf', length: 'mm' } } as unknown as ProjectWorkspaceData
  const loadsWorkspace = WORKSPACES.find((w) => w.id === 'loads')!

  it('WorkspacePage passes project.units to the Loads panel', () => {
    render(<QueryClientProvider client={qc()}><WorkspacePage workspace={loadsWorkspace} crossSectionValues={CS} setCrossSectionValues={() => {}} windLoads={null} setWindLoads={() => {}} project={project} setProject={() => {}} bridges={[]} setBridges={() => {}} designCode="EN" setDesignCode={() => {}} bridgeDefinitions={{} as never} setBridgeDefinitions={() => {}} terrainId={null} landXmlImportId={null} setTerrainId={() => {}} setLandXmlImportId={() => {}} /></QueryClientProvider>)
    expect(screen.getAllByText('tonf/mm').length).toBeGreaterThan(0)
  })

  it('the /loads route passes project.units to the Loads panel', () => {
    const props = { summary: null, onGenerated: () => {}, layoutSeed: null, setLayoutSeed: () => {}, bridges: [], setBridges: () => {}, designCode: 'EN', setDesignCode: () => {}, crossSectionValues: CS, setCrossSectionValues: () => {}, terrainId: null, setTerrainId: () => {}, landXmlImportId: null, setLandXmlImportId: () => {}, project }
    render(<QueryClientProvider client={qc()}><MemoryRouter initialEntries={['/loads']}><AppRoutes {...props} /></MemoryRouter></QueryClientProvider>)
    expect(screen.getAllByText('tonf/mm').length).toBeGreaterThan(0)
  })
})
