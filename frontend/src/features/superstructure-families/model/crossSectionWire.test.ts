import { describe, expect, it } from 'vitest'
import { parseProjectData } from '../../../shared/project-store/projectDataValidation'
import { CROSS_SECTION_SECTION, crossSectionFromWire, crossSectionToWire, crossSectionWireSchema } from './crossSectionWire'
import { INITIAL_CROSS_SECTION_VALUES } from './types'

describe('cross section wire mapping', () => {
  it('round-trips INITIAL_CROSS_SECTION_VALUES with the backend key order and no changed number', () => {
    const wire = crossSectionToWire({ ...INITIAL_CROSS_SECTION_VALUES, extra: 1 } as typeof INITIAL_CROSS_SECTION_VALUES)
    expect(Object.keys(wire)).toEqual(['platformWidthM', 'leftWalkwayM', 'rightWalkwayM', 'spaceOfGirderM', 'numberOfGirders'])
    expect(wire).toEqual({ platformWidthM: 13.8, leftWalkwayM: 1.0, rightWalkwayM: 1.5, spaceOfGirderM: 2.0, numberOfGirders: 5 })
    expect(parseProjectData(crossSectionWireSchema, JSON.parse(JSON.stringify(wire)), 'value')).toEqual(wire)
    expect(crossSectionFromWire(wire)).toEqual(INITIAL_CROSS_SECTION_VALUES)
  })
  it('null reads as undefined and the section is clearable', () => {
    expect(CROSS_SECTION_SECTION.codec.fromWire(null)).toBeUndefined()
    expect(CROSS_SECTION_SECTION).toMatchObject({ path: 'cross-section', codec: { clearable: true } })
  })
  it('rejects unknown keys and wrong types with the full path', () => {
    expect(() => parseProjectData(crossSectionWireSchema, { ...crossSectionToWire(INITIAL_CROSS_SECTION_VALUES), extra: 1 }, 'crossSection')).toThrow('crossSection')
    expect(() => parseProjectData(crossSectionWireSchema, { ...crossSectionToWire(INITIAL_CROSS_SECTION_VALUES), leftWalkwayM: '1' }, 'crossSection')).toThrow('crossSection.leftWalkwayM')
  })
})
