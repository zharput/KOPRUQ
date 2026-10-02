import { describe, expect, it } from 'vitest'
import { structuralFamilyItems } from './FamilyWorkspaceShell'

describe('Family workspace structural library', () => {
  it('derives a flat structural-only list from the Graph registry', () => {
    const items = structuralFamilyItems()
    expect(items.length).toBeGreaterThan(0)
    expect(items.some(item => item.type === 'structural.girder.precast')).toBe(true)
    expect(items.every(item => item.category === 'STRUCTURAL_FAMILY')).toBe(true)
    expect(items.some(item => item.type === 'structural.span_arrangement' || item.type === 'structural.assembly')).toBe(false)
  })
})
