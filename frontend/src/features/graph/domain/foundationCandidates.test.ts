import { describe, expect, it } from 'vitest'
import { generatePiledFoundationCandidates, generateShallowFoundationCandidates } from './foundationCandidates'
import { localLength } from './pierCandidates'
import type { MaterialValue } from './types'

const concrete:MaterialValue={domainType:'ConcreteMaterial',id:'C35/45',name:'C35/45',properties:{}}

describe('foundation geometric candidates',()=>{
  it('generates shallow defaults as a deterministic Cartesian product and filters invalid dimensions',()=>{
    const result=generateShallowFoundationCandidates({Lx:[7,8,0],Ly:[5,6],height:[1.5,2],material:concrete})
    expect(result).toMatchObject({generatedCombinations:12,invalidCombinations:4})
    expect(result.candidates).toHaveLength(8)
    expect(result.candidates[0]).toMatchObject({foundationType:'SHALLOW',geometry:{Lx:7,Ly:5,height:1.5}})
    expect(result.candidates[0].id).toBe(result.candidates[0] && generateShallowFoundationCandidates({Lx:7,Ly:5,height:1.5,material:concrete}).candidates[0].id)
  })
  it('uses the X and Y spacing independently for piled derived dimensions',()=>{
    const [candidate]=generatePiledFoundationCandidates({pileDiameter:1.2,pileCountX:4,pileSpacingX:3.6,pileCountY:3,pileSpacingY:3.6,capHeight:2.5,material:concrete}).candidates
    expect(candidate).toMatchObject({foundationType:'PILED',geometry:{pileDiameter:1.2,pileCountX:4,pileSpacingX:3.6,pileCountY:3,pileSpacingY:3.6,capHeight:2.5,derived:{Lx:13.2,Ly:9.6}}})
  })
  it('forms Cartesian alternatives, rejects non-integer counts without rounding, and keeps stable ordering and IDs',()=>{
    const input={pileDiameter:[1,1.2],pileCountX:[3,4,2.5,0],pileSpacingX:[3,3.5],pileCountY:3,pileSpacingY:3.5,capHeight:[2,2.5],material:concrete}
    const result=generatePiledFoundationCandidates(input)
    expect(result.generatedCombinations).toBe(32)
    expect(result.invalidCombinations).toBe(16)
    expect(result.candidates).toHaveLength(16)
    expect(result.candidates[0].geometry.derived).toEqual({Lx:8,Ly:9})
    expect(generatePiledFoundationCandidates(input).candidates.map(item=>item.id)).toEqual(result.candidates.map(item=>item.id))
    expect(result.candidates.some(item=>item.geometry.pileCountX===2.5)).toBe(false)
  })
  it('converts explicit Lengths to canonical metres and rejects non-positive geometry',()=>{
    const result=generateShallowFoundationCandidates({Lx:localLength(8000,'mm'),Ly:[6,-1],height:2,material:concrete})
    expect(result.generatedCombinations).toBe(2)
    expect(result.invalidCombinations).toBe(1)
    expect(result.candidates[0].geometry.Lx).toBe(8)
  })
  it('does not reinterpret Length quantities as pile counts',()=>{
    expect(()=>generatePiledFoundationCandidates({pileDiameter:1.2,pileCountX:localLength(4,'m') as unknown as number,pileSpacingX:3.6,pileCountY:3,pileSpacingY:3.6,capHeight:2.5,material:concrete})).toThrow(/dimensionless Integer/)
  })
  it('enforces the shared candidate ceiling before materializing candidates and recovers when reduced',()=>{
    expect(()=>generateShallowFoundationCandidates({Lx:Array(101).fill(8),Ly:Array(100).fill(6),height:2,material:concrete})).toThrow(/10,000/)
    expect(generateShallowFoundationCandidates({Lx:[8],Ly:[6],height:2,material:concrete}).candidates).toHaveLength(1)
  })
})
