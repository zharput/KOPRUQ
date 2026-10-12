import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import WindLoadsPanel from './WindLoadsPanel'
import type { WindCalculationSnapshot } from '../../../../shared/project-file/projectFileTypes'

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
beforeEach(() => localStorage.clear())
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
  it('shows the snapshot inputs, not the current inputs, in Details', async () => {
    respond(VALID); render(<Harness />); await calculate('27', '10')
    await screen.findByText('Wind Actions'); fill('Basic Wind Velocity, vb', '99')
    await userEvent.setup().click(screen.getByRole('button', { name: /Details/ }))
    expect(screen.getByText('27 m/s')).toBeInTheDocument(); expect(screen.queryByText('99 m/s')).not.toBeInTheDocument()
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
