import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import SystemAssemblyPanel from './SystemAssemblyPanel'
import { resetProjectData, seedProjectData } from '../../../test/projectStoreTestUtils'

beforeEach(() => resetProjectData())

const rule = (variant: string, min: number, max: number, delta: number, primary: number) => ({ id: `girder-span-${variant}`, superstructureType: 'PRECAST_GIRDER', girderVariantId: variant, minSpan: min, maxSpan: max, spanDelta: delta, primarySpan: primary, enabled: true, source: 'PROJECT_DESIGN_SYSTEM' })

describe('System Assembly preferred spans', () => {
  it('shows stored preferred span rules in the girder inspector', () => {
    seedProjectData('preferredSpanRules', [rule('PG-H160', 20, 30, 5, 25)])
    const { container } = render(<MemoryRouter><SystemAssemblyPanel /></MemoryRouter>)
    fireEvent.click(container.querySelector('.spn-svg-girder')!)
    const row = screen.getAllByText('PG-H160').map((cell) => cell.closest('tr')!).find((tr) => tr.textContent?.includes('20, 25, 30'))!
    expect(within(row).getByText('20, 25, 30')).toBeInTheDocument()
    expect(within(row).getByText('25 m')).toBeInTheDocument()
  })
})
