import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import WindLoadsPanel from './WindLoadsPanel'
import type { WindCalculationSnapshot } from '../../model/windTypes'
import { resetProjectData } from '../../../../test/projectStoreTestUtils'
import { NEW_PROJECT_DOCUMENT_JSON } from '../../../../app/project-session/projectDocumentFixtures'
import { ApiError } from '../../../../shared/api/http'
import { activeProjectSession, activeWriteQueue } from '../../../../shared/project-store/activeProject'
import { useProjectModuleValue } from '../../../../shared/project-file/useProjectModule'
import { createFakeProjectApi, type FakeProjectApi } from '../../../../test/fakeProjectApi'
import { flushProjectWrites, installFakeProjectApi, openTestProject, putRequests } from '../../../../test/projectSessionTestUtils'
import { WIND_INPUTS_MODULE, WIND_SNAPSHOT_MODULE } from '../../model/loadsProjectModules'

const VALID = { status: 'VALID', z0M: 0.05, zminM: 2, kr: 0.19, cr: 1.1, vmMs: 28, turbulenceIntensity: 0.2, qpKNm2: 1.1, bOverD: 4.6, cfx: 1.3, transverseKNm: 12.3, missing: null }
const INVALID = { status: 'INVALID', z0M: 0, zminM: 0, kr: 0, cr: 0, vmMs: 0, turbulenceIntensity: 0, qpKNm2: 0, bOverD: 0, cfx: 0, transverseKNm: null, missing: 'Reference height ze is required' }

function respond(body: unknown, status = 200) { vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))) }
function Harness({ deckWidthM = 13.8, onSnapshot }: { deckWidthM?: number; onSnapshot?: (s: WindCalculationSnapshot | null) => void }) {
  const [snapshot, setSnapshot] = useState<WindCalculationSnapshot | null>(null)
  return <WindLoadsPanel deckWidthM={deckWidthM} snapshot={snapshot} onSnapshot={(next) => { onSnapshot?.(next); setSnapshot(next) }} />
}
const fill = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } })
async function calculate(vb = '27', ze = '10') {
  fill('Basic Wind Velocity, vb', vb); fill('Reference Height, ze', ze)
  await userEvent.setup().click(screen.getByRole('button', { name: /Calculate Wind/ }))
}
beforeEach(() => resetProjectData())
afterEach(() => vi.unstubAllGlobals())

describe('WindLoadsPanel', () => {
  it('stores the real calculation inputs in the snapshot', async () => {
    respond(VALID); const onSnapshot = vi.fn(); render(<Harness onSnapshot={onSnapshot} />)
    await calculate()
    await waitFor(() => expect(onSnapshot).toHaveBeenCalled())
    expect(onSnapshot.mock.calls[0][0]).toMatchObject({ schemaVersion: 1, status: 'VALID', inputs: { vb: '27', terrain: 'II', ze: '10', deckWidthM: 13.8, drefM: 3 }, result: VALID })
    expect(screen.queryByText('STALE')).not.toBeInTheDocument()
  })
  it('marks the result STALE when an input changes after the calculation', async () => {
    respond(VALID); render(<Harness />); await calculate()
    await screen.findByText('Wind Actions')
    fill('Basic Wind Velocity, vb', '30')
    expect(screen.getByText('STALE')).toBeInTheDocument()
  })
  it('marks the result STALE when the deck width changes', async () => {
    respond(VALID); const view = render(<Harness deckWidthM={13.8} />); await calculate()
    await screen.findByText('Wind Actions'); expect(screen.queryByText('STALE')).not.toBeInTheDocument()
    view.rerender(<Harness deckWidthM={12} />)
    expect(screen.getByText('STALE')).toBeInTheDocument()
  })
  it('shows the current inputs and hides the previous results in Details when STALE', async () => {
    respond(VALID); render(<Harness />); await calculate('27', '10')
    await screen.findByText('Wind Actions'); fill('Basic Wind Velocity, vb', '99')
    await userEvent.setup().click(screen.getByRole('button', { name: /Details/ }))
    expect(screen.getByText('99 m/s')).toBeInTheDocument(); expect(screen.queryByText('27 m/s')).not.toBeInTheDocument()
    for (const label of ['qp(z)', 'kr', 'cfx', 'Transverse wind action']) expect(screen.getByText(label).nextElementSibling).toHaveTextContent('—')
    expect(screen.getByText('Status').nextElementSibling).toHaveTextContent('STALE')
  })
  it('hides the previous Summary value while STALE and restores it when the inputs return to the snapshot', async () => {
    respond(VALID); const onSnapshot = vi.fn(); render(<Harness onSnapshot={onSnapshot} />); await calculate('27', '10')
    await screen.findByText('12.3000 kN/m'); expect(onSnapshot).toHaveBeenCalledTimes(1)
    fill('Basic Wind Velocity, vb', '30')
    expect(screen.getByText('STALE')).toBeInTheDocument(); expect(screen.queryByText('12.3000 kN/m')).not.toBeInTheDocument()
    fill('Basic Wind Velocity, vb', '27')
    expect(screen.getByText('12.3000 kN/m')).toBeInTheDocument(); expect(screen.queryByText('STALE')).not.toBeInTheDocument()
    expect(onSnapshot).toHaveBeenCalledTimes(1)
  })
  it('does not show the previous INVALID warning once the inputs changed', async () => {
    respond(INVALID); render(<Harness />); await calculate('27', '')
    expect(await screen.findByText(/Wind result is INVALID/)).toBeInTheDocument()
    fill('Reference Height, ze', '10')
    expect(screen.getByText('STALE')).toBeInTheDocument(); expect(screen.queryByText(/Wind result is INVALID/)).not.toBeInTheDocument()
  })
  it('does not claim the values are from the previous calculation when STALE after an HTTP error', async () => {
    respond(VALID); render(<Harness />); await calculate('27', '10')
    await screen.findByText('Wind Actions')
    respond({ status: 400, code: 'INVALID_REQUEST', message: 'vbMs must be positive' }, 400)
    await calculate('-1', '10')
    expect(await screen.findByText(/vbMs must be positive/)).toBeInTheDocument()
    expect(screen.queryByText(/previous calculation/)).not.toBeInTheDocument()
  })
  it('shows the missing reason and no zero values for an INVALID result', async () => {
    respond(INVALID); render(<Harness />); await calculate('27', '')
    expect(await screen.findByText(/Reference height ze is required/)).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: /Details/ }))
    for (const label of ['z0', 'kr', 'cr(z)']) expect(screen.getByText(label).nextElementSibling).toHaveTextContent('—')
    expect(screen.queryByText(/0\.000/)).not.toBeInTheDocument()
  })
  it('shows the backend message for an HTTP 400 response', async () => {
    respond({ status: 400, code: 'INVALID_REQUEST', message: 'vbMs must be positive' }, 400); render(<Harness />); await calculate('-1', '10')
    expect(await screen.findByText(/vbMs must be positive/)).toBeInTheDocument()
  })
})

// The panel connected to the project like the application shell does it: the snapshot (result included) is the `loads/wind-snapshot` section.
function ConnectedHarness({ deckWidthM = 13.8 }: { deckWidthM?: number }) {
  const snapshot = useProjectModuleValue(WIND_SNAPSHOT_MODULE) ?? null
  return <WindLoadsPanel deckWidthM={deckWidthM} snapshot={snapshot} onSnapshot={(next) => { WIND_SNAPSHOT_MODULE.write(next) }} />
}
const serverResult = { ...VALID, cr: 1.1234567890123, transverseKNm: 12.345678901234 }
const pathsOf = (requests: { path: string }[]) => requests.map((request) => request.path.split('/').slice(-2).join('/'))

describe('WindLoadsPanel connected to the project (BACKEND-DB-PERSISTENCE m3b/M5c)', () => {
  let fake: FakeProjectApi
  beforeEach(() => { fake = installFakeProjectApi(createFakeProjectApi()); openTestProject(NEW_PROJECT_DOCUMENT_JSON, fake) })

  it('sends exactly one PUT loads/wind-snapshot with the service result unchanged, and shows the same result after the panel is reopened', async () => {
    respond(serverResult)
    const first = render(<ConnectedHarness />)
    await calculate('27', '10')
    await screen.findByText('12.3457 kN/m')
    await flushProjectWrites()
    const snapshotPuts = putRequests(fake, 'loads/wind-snapshot')
    expect(snapshotPuts).toHaveLength(1)
    expect((snapshotPuts[0].body as { value: { result: unknown } }).value.result).toEqual(serverResult)
    expect((snapshotPuts[0].body as { value: { inputs: unknown } }).value.inputs).toEqual({ vb: '27', terrain: 'II', ze: '10', deckWidthM: 13.8, drefM: 3 })
    first.unmount()
    // A new project session over what the backend stored: the inputs and the result come back as they were.
    openTestProject(fake.document(activeProjectSession.getSnapshot().projectId!))
    render(<ConnectedHarness />)
    expect(screen.getByLabelText('Basic Wind Velocity, vb')).toHaveValue(27)
    expect(screen.getByText('12.3457 kN/m')).toBeInTheDocument()
    expect(screen.queryByText('STALE')).not.toBeInTheDocument()
    expect(WIND_SNAPSHOT_MODULE.read()?.result).toEqual(serverResult)
  })

  it('keeps the stored snapshot and shows it STALE after an input change, sending only PUT loads/wind', async () => {
    respond(serverResult)
    render(<ConnectedHarness />)
    await calculate('27', '10')
    await screen.findByText('12.3457 kN/m')
    await flushProjectWrites()
    const before = putRequests(fake).length
    fill('Basic Wind Velocity, vb', '30')
    await flushProjectWrites()
    expect(pathsOf(putRequests(fake).slice(before))).toEqual(['loads/wind'])
    expect(screen.getByText('STALE')).toBeInTheDocument()
    expect(WIND_SNAPSHOT_MODULE.read()?.result).toEqual(serverResult)
    expect(WIND_INPUTS_MODULE.read()?.vb).toBe('30')
  })

  it('stores an INVALID result as calculated and shows it as before', async () => {
    respond(INVALID)
    render(<ConnectedHarness />)
    await calculate('27', '')
    expect(await screen.findByText(/Reference height ze is required/)).toBeInTheDocument()
    await flushProjectWrites()
    expect((putRequests(fake, 'loads/wind-snapshot')[0].body as { value: { result: unknown } }).value.result).toEqual(INVALID)
  })

  it('sends no snapshot PUT when the calculation fails', async () => {
    respond({ status: 400, code: 'INVALID_REQUEST', message: 'vbMs must be positive' }, 400)
    render(<ConnectedHarness />)
    await calculate('-1', '10')
    expect(await screen.findByText(/vbMs must be positive/)).toBeInTheDocument()
    await flushProjectWrites()
    expect(putRequests(fake, 'loads/wind-snapshot')).toHaveLength(0)
    expect(WIND_SNAPSHOT_MODULE.read()).toBeUndefined()
  })

  it('refuses a non-finite result locally: no PUT, status rejected with the field path, previous snapshot kept, Retry returns to idle', async () => {
    respond(serverResult)
    render(<ConnectedHarness />)
    await calculate('27', '10')
    await screen.findByText('12.3457 kN/m')
    await flushProjectWrites()
    const previous = WIND_SNAPSHOT_MODULE.read()
    const before = putRequests(fake).length
    // JSON allows 1e999, which parses to Infinity: the service result reaches the panel with a non-finite number.
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(serverResult).replace(/"cfx":[^,]+/, '"cfx":1e999'), { status: 200, headers: { 'Content-Type': 'application/json' } })))
    await calculate('28', '10')
    await waitFor(() => expect(activeProjectSession.getSnapshot().status).toBe('rejected'))
    expect(activeProjectSession.getSnapshot().lastError).toMatchObject({ path: 'result.cfx' })
    expect(pathsOf(putRequests(fake).slice(before)).filter((path) => path === 'loads/wind-snapshot')).toHaveLength(0)
    expect(WIND_SNAPSHOT_MODULE.read()).toEqual(previous)
    await activeWriteQueue.retry()
    expect(activeProjectSession.getSnapshot().status).toBe('idle')
  })

  it('does not send the snapshot while loads/wind fails; Retry sends both in order', async () => {
    respond(serverResult)
    render(<ConnectedHarness />)
    fake.failNext('PUT', new ApiError({ status: 500, message: 'boom' }))
    await calculate('27', '10')
    await screen.findByText('12.3457 kN/m')
    await expect(flushProjectWrites()).rejects.toBeDefined()
    expect(pathsOf(putRequests(fake))).toEqual(['loads/wind'])
    expect(activeProjectSession.getSnapshot().status).toBe('error')
    await activeWriteQueue.retry()
    expect(pathsOf(putRequests(fake))).toEqual(['loads/wind', 'loads/wind', 'loads/wind-snapshot'])
    expect(activeProjectSession.getSnapshot().status).toBe('idle')
  })

  it('Discard after the failed loads/wind write reverts the inputs and the snapshot together', async () => {
    respond(serverResult)
    render(<ConnectedHarness />)
    fake.failNext('PUT', new ApiError({ status: 500, message: 'boom' }))
    await calculate('27', '10')
    await screen.findByText('12.3457 kN/m')
    await expect(flushProjectWrites()).rejects.toBeDefined()
    activeWriteQueue.discard()
    await waitFor(() => expect(WIND_SNAPSHOT_MODULE.read()).toBeUndefined())
    expect(WIND_INPUTS_MODULE.read()).toBeUndefined()
    expect(putRequests(fake, 'loads/wind-snapshot')).toHaveLength(0)
  })
})
