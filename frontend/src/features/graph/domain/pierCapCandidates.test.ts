import { describe, expect, it } from 'vitest'
import { generatePierCapCandidatesWithStats } from './pierCapCandidates'
import { localLength } from './pierCandidates'
import { getNodeDefinition } from '../registry/nodeRegistry'
import type { MaterialValue } from './types'

const concrete:MaterialValue={domainType:'ConcreteMaterial',id:'C40/50',name:'C40/50',properties:{}}
const rectNode=getNodeDefinition('substructure.pier-cap.rectangular')!
const tNode=getNodeDefinition('substructure.pier-cap.t')!

describe('Pier Cap family candidates',()=>{
 it('defines project-unit-aware Rectangular Cap defaults and one deterministic canonical candidate',async()=>{
  const params=rectNode.createDefaultParameters({length:'mm'})
  expect(params).toMatchObject({lengthValue:12000,lengthUnit:'mm',widthValue:3000,heightValue:2000,materialId:'C40/50'})
  expect(rectNode.validateParameters(params)).toEqual([])
  const generated=await rectNode.executor({node:{id:'rect',type:rectNode.type,name:'Cap',position:{x:0,y:0},parameters:params},inputs:{}})
  expect(generated.candidates).toMatchObject([{capType:'RECTANGULAR',geometry:{length:12,width:3,height:2},material:{id:'C40/50'}}])
 })

 it('generates rectangular Cartesian products in stable order and stable IDs',()=>{
  const input={capType:'RECTANGULAR' as const,geometry:{length:[10,12,14],width:[2.5,3],height:[1.5,2]},material:concrete}
  const first=generatePierCapCandidatesWithStats(input),second=generatePierCapCandidatesWithStats(input)
  expect(first.generatedCombinations).toBe(12)
  expect(first.invalidCombinations).toBe(0)
  expect(first.candidates).toHaveLength(12)
  expect(first.candidates.map(item=>item.id)).toEqual(second.candidates.map(item=>item.id))
  expect(first.candidates[0].geometry).toEqual({length:10,width:2.5,height:1.5})
  expect(first.candidates[1].geometry.height).toBe(2)
  expect(first.candidates[2].geometry.width).toBe(3)
 })

 it('defines valid T-Cap defaults and filters invalid combinations without clamping',()=>{
  const params=tNode.createDefaultParameters({length:'m'})
  expect(params).toMatchObject({lengthValue:12,topWidthValue:3,stemWidthValue:1.5,totalHeightValue:2.5,flangeThicknessValue:.8,materialId:'C40/50'})
  expect(tNode.validateParameters(params)).toEqual([])
  const result=generatePierCapCandidatesWithStats({capType:'T',geometry:{length:12,topWidth:[2.5,3],stemWidth:[1.5,2.8],totalHeight:2.5,flangeThickness:.8},material:concrete})
  expect(result).toMatchObject({generatedCombinations:4,invalidCombinations:1})
  expect(result.candidates).toHaveLength(3)
  expect(result.candidates.map(candidate=>[candidate.geometry.topWidth,candidate.geometry.stemWidth])).toEqual([[2.5,1.5],[3,1.5],[3,2.8]])
  expect(generatePierCapCandidatesWithStats({capType:'T',geometry:{length:12,topWidth:3,stemWidth:3.5,totalHeight:2.5,flangeThickness:.8},material:concrete}).candidates).toHaveLength(0)
 })

 it('accepts canonical Length quantities and rejects non-positive dimensions and unsafe products',()=>{
  const result=generatePierCapCandidatesWithStats({capType:'RECTANGULAR',geometry:{length:localLength(12000,'mm'),width:[localLength(2500,'mm'),localLength(3000,'mm')],height:2},material:concrete})
  expect(result.candidates.map(item=>item.geometry)).toEqual([{length:12,width:2.5,height:2},{length:12,width:3,height:2}])
  expect(()=>generatePierCapCandidatesWithStats({capType:'RECTANGULAR',geometry:{length:Array(101).fill(12),width:Array(100).fill(3),height:2},material:concrete})).toThrow(/10,000/)
  expect(generatePierCapCandidatesWithStats({capType:'RECTANGULAR',geometry:{length:12,width:3,height:0},material:concrete})).toMatchObject({generatedCombinations:1,invalidCombinations:1,candidates:[]})
  expect(generatePierCapCandidatesWithStats({capType:'RECTANGULAR',geometry:{length:12,width:3,height:2},material:concrete}).candidates).toHaveLength(1)
 })
})
