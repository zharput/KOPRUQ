import { beforeEach, describe, expect, it } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import PreferredSpanPanel from './PreferredSpanPanel'
import { readProjectData, resetProjectData, seedProjectData } from '../../../test/projectStoreTestUtils'

const dims = (max: number) => ({ dimensions: [{ key: 'H', label: 'H (cm)', min: 160, max, delta: 10 }] })
const rule = (variant: string, min: number, max: number, delta: number, primary: number) => ({ id: `girder-span-${variant}`, superstructureType: 'PRECAST_GIRDER', girderVariantId: variant, minSpan: min, maxSpan: max, spanDelta: delta, primarySpan: primary, enabled: true, source: 'PROJECT_DESIGN_SYSTEM' })
const storedRules = () => (readProjectData('preferredSpanRules') ?? []) as ReturnType<typeof rule>[]

beforeEach(() => resetProjectData())

describe('Preferred Span rules', () => {
  it('keeps a rule when its variant disappears and restores it unchanged when the variant returns', () => {
    seedProjectData('girderLibrary', (dims(180)))
    seedProjectData('preferredSpanRules', ([rule('PG-H160', 20, 30, 5, 25), rule('PG-H170', 25, 35, 5, 30), rule('PG-H180', 30, 40, 5, 35)]))
    render(<PreferredSpanPanel />)
    expect(screen.getByText('PG-H180')).toBeInTheDocument()

    seedProjectData('girderLibrary', (dims(170)))
    act(() => { window.dispatchEvent(new Event('storage')) })
    expect(screen.queryByText('PG-H180')).not.toBeInTheDocument()
    expect(screen.getByText(/1 rule\(s\) belong to variants that are not currently available/)).toBeInTheDocument()
    expect(storedRules().find((item) => item.girderVariantId === 'PG-H180')).toEqual(rule('PG-H180', 30, 40, 5, 35))

    seedProjectData('girderLibrary', (dims(180)))
    act(() => { window.dispatchEvent(new Event('storage')) })
    const row = screen.getByText('PG-H180').closest('tr')!
    expect(Array.from(row.querySelectorAll('input')).map((input) => input.value)).toEqual(['30', '40', '5'])
    expect((row.querySelector('select') as HTMLSelectElement).value).toBe('35')
  })
})
