import { describe, expect, it } from 'vitest'
import { NODE_REGISTRY } from '../registry/nodeRegistry'
import { DATA_TYPE_THEME_REGISTRY, NODE_THEME_REGISTRY, getDataTypeColor, getNodeCategoryLabel, getNodeTheme } from './nodeVisualThemes'

describe('graph visual theme registries', () => {
  it('defines visual tokens for current and planned node categories', () => {
    expect(Object.keys(NODE_THEME_REGISTRY)).toEqual(['INPUT', 'MATH', 'MATERIALS', 'PIER', 'ABUTMENT', 'CAP', 'FOUNDATION', 'BEARING', 'GIRDER', 'GEOMETRY', 'SUPERSTRUCTURE', 'BRIDGE', 'SUBSTRUCTURE', 'STRUCTURAL_FAMILY', 'LOADS', 'ANALYSIS', 'DESIGN', 'OPTIMIZATION', 'OUTPUT'])
    const currentCategories = new Set(NODE_REGISTRY.map(node => node.category))
    expect([...currentCategories]).toEqual(expect.arrayContaining(['INPUT', 'MATH', 'MATERIALS', 'STRUCTURAL_FAMILY', 'OUTPUT']))
    expect(NODE_REGISTRY.filter(node => node.type.startsWith('input.') && !['input.length', 'input.notes'].includes(node.type)).every(node => node.category === 'INPUT')).toBe(true)
    expect(NODE_REGISTRY.filter(node => node.type.startsWith('math.')).every(node => node.category === 'MATH')).toBe(true)
    expect(NODE_REGISTRY.find(node => node.type === 'material.concrete')?.category).toBe('MATERIALS')
    expect(NODE_REGISTRY.filter(node => node.type.startsWith('substructure.pier.')).every(node => node.category === 'STRUCTURAL_FAMILY')).toBe(true)
    expect(NODE_REGISTRY.filter(node => node.type.startsWith('output.')).every(node => node.category === 'OUTPUT')).toBe(true)
  })

  it('maps current graph port types independently from node categories', () => {
    const portTypes = new Set(NODE_REGISTRY.flatMap(node => [...node.inputs, ...node.outputs].map(port => port.type)))
    expect(Object.keys(DATA_TYPE_THEME_REGISTRY)).toEqual(expect.arrayContaining([...portTypes]))
    expect(getDataTypeColor('concreteMaterial')).not.toBe(NODE_THEME_REGISTRY.MATERIALS.accentToken)
    expect(getDataTypeColor('pierCandidate[]')).toBe('#e4b65c')
  })

  it('uses one structural family theme and presentation label for structural family nodes', () => {
    expect(getNodeTheme('STRUCTURAL_FAMILY')).toMatchObject({ className: 'category-structural-family', accentToken: '--node-structural-family-accent' })
    expect(getNodeCategoryLabel('STRUCTURAL_FAMILY')).toBe('STRUCTURAL / FAMILY')
    expect(getDataTypeColor('pierCandidate[]')).toBe('#e4b65c')
  })
})
