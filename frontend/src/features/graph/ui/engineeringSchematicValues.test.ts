import { describe, expect, it } from 'vitest'
import { geometryValues } from './engineeringSchematicValues'
import { generatePrecastGirderCandidates } from '../domain/girderCandidates'

describe('precast schematic geometry', () => {
  it('reads canonical and saved legacy candidates through the same dimension key', () => {
    const material = { domainType: 'ConcreteMaterial' as const, id: 'C40/50', name: 'C40/50', properties: {} }
    const current = generatePrecastGirderCandidates({ geometry: { H: 1.9, Btf: 1.5, Bbf: .8, tw: .2, th1: .12, bh1: .28, bh2: .15, th2: .1 }, material }).candidates[0]
    const candidates = [current, { ...current, geometry: { H: 1.9, tf: 1.4, bf: .7, w: .18 } }]
    expect(geometryValues(candidates, 'Btf')).toEqual([1.5, 1.4])
    expect(geometryValues(candidates, 'Bbf')).toEqual([.8, .7])
    expect(geometryValues(candidates, 'tw')).toEqual([.2, .18])
  })
})
