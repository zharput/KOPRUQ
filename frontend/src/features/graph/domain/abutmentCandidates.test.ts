import { describe, expect, it } from 'vitest'
import { generateAbutmentCandidates } from './abutmentCandidates'

const girder = { id: 'g', familyId: 'PG', girderType: 'PRECAST' as const, sectionType: 'I_GIRDER', geometry: { H: 1.9, tf: 1.5, bf: .8 }, material: { domainType: 'ConcreteMaterial' as const, id: 'C40/50', name: 'C40/50', properties: {} }, preferredSpan: 40, applicableSpanRange: { min: 30, max: 90 }, validationStatus: 'VALID' as const }
const superstructure = { id: 's', girderType: 'PRECAST' as const, girderCandidateId: 'g', girderGeometry: girder.geometry, girderMaterial: girder.material, deckWidth: 14, girderCount: 6, girderSpacing: 2.5, girderAxisPositions: [1.25, 3.75, 6.25, 8.75, 11.25, 13.75], girderTopFlangeWidth: 1.5, girderHeight: 1.9, clearEdgeCantileverLeft: 0, clearEdgeCantileverRight: 0, deckSlabThickness: .25, deckConcrete: girder.material, totalStructuralDepth: 2.15, validationStatus: 'VALID' as const, validationMessages: [] }
const bearing = { id: 'b', bearingType: 'ELASTOMERIC' as const, geometry: { lengthX: .6, widthY: .7, totalHeight: .15 }, stiffness: { kx: 1, ky: 1, kz: 1, krx: 1, kry: 1, krz: 1 } }
const geometry = { Back_wall_w: .5, Bearing_sup_w: 1, Front_w: 1, Back_w: 3, Front_fh: 5, Foun_fh: 1, Onp_Amp: 2, found_d: 18 }

describe('abutment candidate generation', () => {
  it('calculates foundation, total height and seismic block geometry', () => {
    const result = generateAbutmentCandidates({ geometry, seiU: .03, girder, superstructure, bearing })
    expect(result.candidates).toHaveLength(1)
    expect(result.candidates[0].geometry).toMatchObject({ foundW: 6, totalH: 8.3, abutmentBodyD: 14, foundationLeftOffset: 2, foundationArea: 108, foundationVolume: 108 })
    expect(result.candidates[0].seismic.seiW).toBeCloseTo(.72)
    expect(result.candidates[0].seismic.seiWClear).toBeCloseTo(-.18)
    expect(result.candidates[0].seismic.status).toBe('VALID')
  })

  it('fans out independent geometry and sei_u ranges without sharing validation state', () => {
    const result = generateAbutmentCandidates({ geometry: { ...geometry, found_d: [14, 18] }, seiU: [.03, .05], girder, superstructure, bearing })
    expect(result.generatedCombinations).toBe(4)
    expect(result.candidates).toHaveLength(4)
    expect(new Set(result.candidates.map(candidate => candidate.id)).size).toBe(4)
  })

  it('reports missing upstream data as invalid instead of inventing values', () => {
    const result = generateAbutmentCandidates({ geometry, seiU: .03 })
    expect(result.candidates).toHaveLength(0)
    expect(result.invalidCombinations).toBe(1)
  })
})
