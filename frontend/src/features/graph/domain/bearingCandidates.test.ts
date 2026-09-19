import { describe, expect, it } from 'vitest'
import { makeQuantity } from './quantities'
import { generateElastomericBearingCandidates } from './bearingCandidates'

const base={lengthX:.6,widthY:.7,totalHeight:.15,kx:3000,ky:30000,kz:100000,krx:100000,kry:100000,krz:100000}

describe('Elastomeric Bearing family candidates',()=>{
  it('stores canonical geometry and local-axis stiffness with deterministic identities',()=>{
    const first=generateElastomericBearingCandidates(base).candidates[0]
    const next=generateElastomericBearingCandidates(base).candidates[0]
    expect(first).toEqual({id:'elastomeric-0.6_0.7_0.15_3000_30000_100000_100000_100000_100000',bearingType:'ELASTOMERIC',geometry:{lengthX:.6,widthY:.7,totalHeight:.15},stiffness:{kx:3000,ky:30000,kz:100000,krx:100000,kry:100000,krz:100000}})
    expect(next.id).toBe(first.id)
    expect(first).not.toHaveProperty('location')
  })
  it('converts explicit units, validates dimensions and stiffness while allowing zero stiffness',()=>{
    const generated=generateElastomericBearingCandidates({...base,lengthX:makeQuantity(600,'length','mm'),kx:[0,-1]})
    expect(generated).toMatchObject({generatedCombinations:2,invalidCombinations:1})
    expect(generated.candidates[0].geometry.lengthX).toBe(.6)
    expect(generated.candidates[0].stiffness.kx).toBe(0)
    expect(()=>generateElastomericBearingCandidates({...base,widthY:makeQuantity(700,'translationalStiffness','kN/m')})).toThrow(/finite length quantities/)
    expect(()=>generateElastomericBearingCandidates({...base,krz:Number.NaN})).toThrow(/finite/)
  })
  it('forms deterministic Cartesian products and enforces the shared 10,000 candidate ceiling',()=>{
    const input={...base,lengthX:[.5,.6,.7],widthY:[.6,.7],kx:[2000,3000]}
    const result=generateElastomericBearingCandidates(input)
    expect(result).toMatchObject({generatedCombinations:12,invalidCombinations:0})
    expect(result.candidates).toHaveLength(12)
    expect(result.candidates.slice(0,4).map(item=>[item.geometry.lengthX,item.geometry.widthY,item.stiffness.kx])).toEqual([[.5,.6,2000],[.5,.6,3000],[.5,.7,2000],[.5,.7,3000]])
    expect(generateElastomericBearingCandidates(input).candidates.map(item=>item.id)).toEqual(result.candidates.map(item=>item.id))
    expect(()=>generateElastomericBearingCandidates({...base,lengthX:Array(101).fill(.6),widthY:Array(100).fill(.7)})).toThrow(/Maximum is 10,000/)
    expect(generateElastomericBearingCandidates(base).candidates).toHaveLength(1)
  })
})
