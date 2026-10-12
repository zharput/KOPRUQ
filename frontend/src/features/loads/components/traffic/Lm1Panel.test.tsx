import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Dispatch, SetStateAction } from 'react'
import Lm1Panel from './Lm1Panel'
import type { LaneFactor, Lm1Parameters } from '../../api/trafficLoadsService'

const pv = (value: number, provenance: 'CODE_DEFAULT' | 'PROJECT_OVERRIDE' = 'CODE_DEFAULT', codeDefaultValue = value) => ({ value, provenance, codeDefaultValue })
const lane = (label: string, characteristic: number, alpha = pv(1)): LaneFactor => ({ label, characteristicValue: pv(characteristic), adjustmentFactor: alpha })
const defaults: Lm1Parameters = { tandemSystem: [lane('Lane 1 tandem', 300)], udl: [lane('Lane 1 UDL', 9)], remainingAreaUdl: lane('Remaining area', 2.5) }

function setup(lm1: Lm1Parameters = defaults) {
  const onChange = vi.fn<Dispatch<SetStateAction<Lm1Parameters | null>>>()
  render(<Lm1Panel lm1={lm1} defaults={defaults} onChange={onChange} resolved={undefined} />)
  const apply = (base: Lm1Parameters) => { const update = onChange.mock.calls.at(-1)![0] as (previous: Lm1Parameters | null) => Lm1Parameters | null; return update(base) as Lm1Parameters }
  return { onChange, apply, alpha: () => screen.getByLabelText('Lane 1 tandem α') }
}

describe('Lm1Panel alpha editing', () => {
  it('commits 0.8 as a PROJECT_OVERRIDE when typed and confirmed with Enter', async () => {
    const user = userEvent.setup(); const { alpha, onChange, apply } = setup()
    await user.clear(alpha()); await user.type(alpha(), '0.8')
    expect(onChange).not.toHaveBeenCalled()
    await user.keyboard('{Enter}')
    expect(apply(defaults).tandemSystem[0].adjustmentFactor).toMatchObject({ value: 0.8, provenance: 'PROJECT_OVERRIDE' })
  })
  it('commits on blur', async () => {
    const user = userEvent.setup(); const { alpha, apply } = setup()
    await user.clear(alpha()); await user.type(alpha(), '0.9'); await user.tab()
    expect(apply(defaults).tandemSystem[0].adjustmentFactor.value).toBe(0.9)
  })
  it('does not commit an empty or invalid value and marks the input invalid', async () => {
    const user = userEvent.setup(); const { alpha, onChange } = setup()
    await user.clear(alpha()); await user.tab()
    expect(onChange).not.toHaveBeenCalled(); expect(alpha()).toHaveAttribute('aria-invalid', 'true')
    await user.clear(alpha()); await user.type(alpha(), 'abc'); await user.tab()
    expect(onChange).not.toHaveBeenCalled(); expect(alpha()).toHaveAttribute('aria-invalid', 'true')
  })
  it('restores the EN default value and provenance with the reset button', async () => {
    const user = userEvent.setup()
    const overridden: Lm1Parameters = { ...defaults, tandemSystem: [lane('Lane 1 tandem', 300, pv(0.8, 'PROJECT_OVERRIDE', 1))] }
    const { apply, onChange } = setup(overridden)
    await user.click(screen.getByRole('button', { name: 'Reset Lane 1 tandem α to EN default' }))
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(apply(overridden).tandemSystem[0].adjustmentFactor).toEqual({ value: 1, provenance: 'CODE_DEFAULT', codeDefaultValue: 1 })
  })
  it('disables reset when the value is already the EN default', () => {
    setup()
    expect(screen.getByRole('button', { name: 'Reset Lane 1 tandem α to EN default' })).toBeDisabled()
  })
})
