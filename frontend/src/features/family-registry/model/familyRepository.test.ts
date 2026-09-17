import { beforeEach, describe, expect, it } from 'vitest'
import { getFamilyRecord, graphFamilyAdapter, saveFamilyRecords } from './familyRepository'

beforeEach(() => localStorage.clear())

describe('Family Repository', () => {
  it('preserves existing catalog keys and resolves the current family by stable ID', () => {
    const original = { id: 'P-01', name: 'Pier A', dimensions: [{ key: 'B', label: 'B (m)', min: 2 }] }
    expect(saveFamilyRecords('PIER', [original])).toBe(true)
    const ref = graphFamilyAdapter.getFamilyReference('PIER', 'P-01')
    expect(graphFamilyAdapter.resolve(ref)).toEqual(original)

    const updated = { ...original, name: 'Pier A revised' }
    saveFamilyRecords('PIER', [updated])
    expect(getFamilyRecord('PIER', 'P-01')).toEqual(updated)
    expect(graphFamilyAdapter.resolve(ref)).toEqual(updated)
    expect(localStorage.getItem('spanova.project-design-system.pier-families')).toContain('P-01')
  })

  it('exposes editable and derived piled foundation parameters without duplicating values', () => {
    saveFamilyRecords('FOUNDATION', [{ id: 'F-PILE-1', name: 'Pile F1', foundationType: 'PILED' }])
    const schema = graphFamilyAdapter.getParameterSchema({ category: 'FOUNDATION', familyId: 'F-PILE-1' })
    expect(schema.find((item) => item.key === 'pileSpacingY')).toMatchObject({ unit: 'm', editable: true, derived: false })
    expect(schema.find((item) => item.key === 'lengthY')).toMatchObject({ unit: 'm', editable: false, derived: true })
  })
})
