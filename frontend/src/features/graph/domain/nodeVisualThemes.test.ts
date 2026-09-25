import { describe, expect, it } from 'vitest'
import { NODE_REGISTRY } from '../registry/nodeRegistry'
import { DATA_TYPE_THEME_REGISTRY, NODE_GROUP_THEME, NODE_THEME_REGISTRY, getDataTypeColor, getNodeCategoryLabel, getNodeGroupTheme, getNodeTheme } from './nodeVisualThemes'

describe('graph visual theme registries', () => {
  it.each([
    ['input', 'INPUT'], ['output', 'OUTPUT'], ['math', 'MATH'], ['materials', 'MATERIALS'],
    ['structural', 'STRUCTURAL'], ['superstructure-family', 'SUPERSTRUCTURE'], ['bridge-family', 'BRIDGE'],
  ])('resolves library group %s to %s', (groupId, themeKey) => {
    expect(getNodeGroupTheme(groupId).dark).toBe(NODE_GROUP_THEME[themeKey].dark)
  })

  it.each(['input', 'output', 'math', 'materials'])('does not structurally fall back for %s', (groupId) => {
    expect(getNodeGroupTheme(groupId).dark).not.toBe(NODE_GROUP_THEME.STRUCTURAL.dark)
  })

  it('uses the approved semantic node group header colors', () => {
    expect(NODE_GROUP_THEME.INPUT.dark).toBe('#46515E')
    expect(NODE_GROUP_THEME.OUTPUT.dark).toBe('#6B5C50')
    expect(NODE_GROUP_THEME.MATH.dark).toBe('#B26A3A')
    expect(NODE_GROUP_THEME.MATERIALS.dark).toBe('#36594A')
    expect(NODE_GROUP_THEME.STRUCTURAL.dark).toBe('#2D4059')
    expect(NODE_GROUP_THEME.SUPERSTRUCTURE.dark).toBe('#66577A')
    expect(NODE_GROUP_THEME.BRIDGE.dark).toBe('#794A55')
    expect(getNodeGroupTheme('STRUCTURAL_FAMILY', 'substructure.pier.circular')).toBe(NODE_GROUP_THEME.STRUCTURAL)
  })
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
