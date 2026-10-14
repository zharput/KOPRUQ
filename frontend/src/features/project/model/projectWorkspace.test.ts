import { beforeEach, describe, expect, it } from 'vitest'
import { INITIAL_PROJECT, normalizeProjectUnits, normalizeUnitId, readProjectState, readProjectUnits } from './projectWorkspace'
import { resetProjectData, seedProjectData } from '../../../test/projectStoreTestUtils'

beforeEach(() => resetProjectData())

describe('project unit identifiers', () => {
  it('normalizes display labels, including mojibake labels, to unit ids', () => {
    expect(normalizeUnitId('kN·m')).toBe('kNm'); expect(normalizeUnitId('kNÂ·m')).toBe('kNm'); expect(normalizeUnitId('°C')).toBe('C')
    expect(normalizeUnitId('Â°C')).toBe('C'); expect(normalizeUnitId('kN·mm')).toBe('kNmm'); expect(normalizeUnitId('mm')).toBe('mm')
  })
  it('stores default project units as ids', () => {
    expect(INITIAL_PROJECT.units.moment).toBe('kNm'); expect(INITIAL_PROJECT.units.temperature).toBe('C')
  })
  it('normalizes units read from storage', () => {
    seedProjectData('workspace', ({ project: { units: { moment: 'kN·m', temperature: '°C', length: 'mm' } }, bridges: [] }))
    expect(readProjectState([]).project.units).toMatchObject({ moment: 'kNm', temperature: 'C', length: 'mm' })
    expect(normalizeProjectUnits({ ...INITIAL_PROJECT.units, moment: 'MN·m' }).moment).toBe('MNm')
  })
  it('reads normalized units for the graph, and the defaults when the store is empty', () => {
    expect(readProjectUnits()).toEqual(INITIAL_PROJECT.units)
    seedProjectData('workspace', { project: { units: { moment: 'MN·m', length: 'mm' } }, bridges: [] })
    expect(readProjectUnits()).toEqual({ ...INITIAL_PROJECT.units, moment: 'MNm', length: 'mm' })
  })
})
