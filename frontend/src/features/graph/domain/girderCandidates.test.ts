import { describe, expect, it } from 'vitest'
import { generateSteelGirderCandidates, steelSectionProperties } from './girderCandidates'
const material={domainType:'StructuralSteelMaterial' as const,id:'S355',name:'S355',properties:{}}
describe('girder candidates',()=>{
 it('calculates the welded steel section independently of material properties',()=>{const p=steelSectionProperties({H:2.5,Btf:.8,ttf:.04,Bbf:.9,tbf:.05,tw:.02});expect(p.hw).toBeCloseTo(2.41);expect(p.area).toBeCloseTo(.1252);expect(p.massStatus).toBe('INCOMPLETE')})
 it('generates deterministic Cartesian steel candidates and rejects invalid hw',()=>{const r=generateSteelGirderCandidates({H:[2,2.5,3],Btf:[.6,.8],ttf:.04,Bbf:[.7,.9],tbf:.05,tw:.02,material});expect(r.candidates).toHaveLength(12);expect(r.candidates.map(x=>x.id)).toEqual(generateSteelGirderCandidates({H:[2,2.5,3],Btf:[.6,.8],ttf:.04,Bbf:[.7,.9],tbf:.05,tw:.02,material}).candidates.map(x=>x.id));const invalid=generateSteelGirderCandidates({H:.05,Btf:.8,ttf:.04,Bbf:.9,tbf:.04,tw:.02,material});expect(invalid.candidates).toHaveLength(0);expect(invalid.invalidCombinations).toBe(1)})
})
