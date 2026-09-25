import { describe, expect, it, vi } from 'vitest'
import type { SpanovaGraph } from '../domain/types'
import type { GirderCandidate } from '../domain/girderCandidates'
import { toReactFlowEdges, toReactFlowNodes } from './reactFlowAdapter'

const graph:SpanovaGraph={id:'graph',name:'Graph',schemaVersion:1,nodes:[{id:'a',type:'input.number',name:'Number',position:{x:10,y:20},parameters:{value:2}},{id:'b',type:'output.watch',name:'Watch',position:{x:300,y:40},parameters:{}}],connections:[{id:'stable-edge-id',sourceNodeId:'a',sourcePortId:'value',targetNodeId:'b',targetPortId:'value'}]}

describe('React Flow edge style projection',()=>{
 it('uses built-in Bezier and orthogonal edge types without changing graph connections',()=>{
  const before=structuredClone(graph)
  const smooth=toReactFlowEdges(graph,'smooth')
  const orthogonal=toReactFlowEdges(graph,'orthogonal')
  expect(smooth[0]).toMatchObject({id:'stable-edge-id',type:'default'})
  expect(smooth[0].style?.stroke).toBe('var(--sp-link-default)')
  expect(orthogonal[0]).toMatchObject({id:'stable-edge-id',type:'step'})
  expect(graph).toEqual(before)
 })
 it('uses the shared edge color independently of source port and node category',()=>{
  const materialGraph:SpanovaGraph={id:'m',name:'Material edge',schemaVersion:1,nodes:[{id:'c',type:'material.concrete',name:'Concrete',position:{x:0,y:0},parameters:{materialId:'C40/50'}},{id:'p',type:'substructure.pier.rectangular',name:'Pier',position:{x:200,y:0},parameters:{}}],connections:[{id:'material-edge',sourceNodeId:'c',sourcePortId:'material',targetNodeId:'p',targetPortId:'material'}]}
  expect(toReactFlowEdges(materialGraph)[0].style?.stroke).toBe('var(--sp-link-default)')
 })
 it('survives repeated view changes without changing topology or edge IDs',()=>{
  const before=structuredClone(graph)
  let edges=toReactFlowEdges(graph,'smooth')
  for(let i=0;i<20;i++)edges=toReactFlowEdges(graph,i%2?'smooth':'orthogonal')
  expect(edges.map(edge=>edge.id)).toEqual(['stable-edge-id'])
  expect(graph.connections).toEqual(before.connections)
  expect(graph.nodes.map(node=>node.position)).toEqual(before.nodes.map(node=>node.position))
 })
})

describe('live Elastomeric Bearing preview',()=>{
 it('resolves Range and Math lists at target-specific stiffness quantities without Run',()=>{
  const graph:SpanovaGraph={id:'bearing-live',name:'bearing preview',schemaVersion:1,nodes:[
   {id:'range',type:'input.range',name:'Stiffness range',position:{x:0,y:0},parameters:{min:2000,max:3000,step:1000,quantityKind:'dimensionless',unit:'1'}},
   {id:'one',type:'input.number',name:'One',position:{x:0,y:100},parameters:{value:1}},
   {id:'math',type:'math.multiply',name:'Multiply',position:{x:180,y:100},parameters:{}},
   {id:'bearing',type:'substructure.bearing.elastomeric',name:'Elastomeric Bearing',position:{x:420,y:0},parameters:{lengthXValue:.6,lengthXUnit:'m',widthYValue:.7,widthYUnit:'m',totalHeightValue:.15,totalHeightUnit:'m',kxValue:3000,kxUnit:'kN/m',kyValue:30000,kyUnit:'kN/m',kzValue:100000,kzUnit:'kN/m',krxValue:100000,krxUnit:'kNm/rad',kryValue:100000,kryUnit:'kNm/rad',krzValue:100000,krzUnit:'kNm/rad'}},
   {id:'watch',type:'output.watch',name:'Watch',position:{x:700,y:0},parameters:{}},
  ],connections:[
   {id:'range-kx',sourceNodeId:'range',sourcePortId:'values',targetNodeId:'bearing',targetPortId:'kx'},
   {id:'range-math',sourceNodeId:'range',sourcePortId:'values',targetNodeId:'math',targetPortId:'a'},
   {id:'one-math',sourceNodeId:'one',sourcePortId:'value',targetNodeId:'math',targetPortId:'b'},
   {id:'math-ky',sourceNodeId:'math',sourcePortId:'result',targetNodeId:'bearing',targetPortId:'ky'},
   {id:'bearing-watch',sourceNodeId:'bearing',sourcePortId:'candidates',targetNodeId:'watch',targetPortId:'value'},
  ]}
  const nodes=toReactFlowNodes(graph,{projectUnits:{length:'m'},onParameterChange:vi.fn()})
  const bearing=nodes.find(node=>node.id==='bearing')!,watch=nodes.find(node=>node.id==='watch')!
  expect(bearing.data).toMatchObject({previewCandidateCount:4,previewGeneratedCombinations:4,previewInvalidCombinations:0})
  expect(bearing.data.connectedInputs?.kx.value).toEqual([{value:2000,quantityKind:'translationalStiffness',unit:'kN/m'},{value:3000,quantityKind:'translationalStiffness',unit:'kN/m'}])
  expect(bearing.data.connectedInputs?.ky.value).toEqual([{value:2000,quantityKind:'translationalStiffness',unit:'kN/m'},{value:3000,quantityKind:'translationalStiffness',unit:'kN/m'}])
  expect((bearing.data.previewBearingCandidates as import('../domain/types').BearingCandidate[]).map(item=>[item.stiffness.kx,item.stiffness.ky])).toEqual([[2000,2000],[2000,3000],[3000,2000],[3000,3000]])
  expect(watch.data.previewValue).toHaveLength(4)
  expect(bearing.data.outputs?.candidates).toBeUndefined()
 })
})

describe('live output availability projection', () => {
 it('resolves Length Single and Range outputs as canonical length quantities and independently fans out the same range', () => {
  const graph: SpanovaGraph = { id: 'length-girder', name: 'Length to girder', schemaVersion: 1, nodes: [
   { id: 'length', type: 'input.length', name: 'Length', position: { x: 0, y: 0 }, parameters: { mode: 'range', min: 1, max: 2, step: .5 } },
   { id: 'girder', type: 'structural.girder.precast', name: 'Precast Girder', position: { x: 300, y: 0 }, parameters: { HValue: 1.9, HUnit: 'm', tfValue: 1.5, tfUnit: 'm', bfValue: .8, bfUnit: 'm', wValue: .2, wUnit: 'm', th1Value: .12, th1Unit: 'm', th2Value: .1, th2Unit: 'm', bh1Value: .28, bh1Unit: 'm', bh2Value: .15, bh2Unit: 'm', familyId: 'PG-200', preferredSpanValue: 40, preferredSpanUnit: 'm', minSpanValue: 30, minSpanUnit: 'm', maxSpanValue: 90, maxSpanUnit: 'm', materialId: 'C40/50' } },
   { id: 'watch', type: 'output.watch', name: 'Watch', position: { x: 600, y: 0 }, parameters: {} },
  ], connections: [
   { id: 'height', sourceNodeId: 'length', sourcePortId: 'value', targetNodeId: 'girder', targetPortId: 'H' },
   { id: 'width', sourceNodeId: 'length', sourcePortId: 'value', targetNodeId: 'girder', targetPortId: 'tf' },
   { id: 'girder-watch', sourceNodeId: 'girder', sourcePortId: 'candidates', targetNodeId: 'watch', targetPortId: 'value' },
  ] }
  const node = toReactFlowNodes(graph, { projectUnits: { length: 'm' }, onParameterChange: vi.fn() }).find(item => item.id === 'girder')!
  expect(node.data.connectedInputs?.H.value).toEqual([{ value: 1, quantityKind: 'length', unit: 'm' }, { value: 1.5, quantityKind: 'length', unit: 'm' }, { value: 2, quantityKind: 'length', unit: 'm' }])
  expect(node.data.connectedInputs?.tf.value).toEqual(node.data.connectedInputs?.H.value)
  expect(node.data.previewCandidateCount).toBe(9)
  const candidates = toReactFlowNodes(graph, { projectUnits: { length: 'm' }, onParameterChange: vi.fn() }).find(item => item.id === 'watch')!.data.previewValue as unknown as GirderCandidate[]
  expect(candidates.map(item => [item.geometry.H, item.geometry.tf])).toEqual([
   [1, 1], [1, 1.5], [1, 2],
   [1.5, 1], [1.5, 1.5], [1.5, 2],
   [2, 1], [2, 1.5], [2, 2],
  ])
  expect(new Set(candidates.map(item => `${item.geometry.H}:${item.geometry.tf}`)).size).toBe(9)
  expect(node.data.executionState).not.toBe('error')
 })

 it('independently fans out two different Range Nodes across girder parameters', () => {
  const graph: SpanovaGraph = { id: 'two-range-girder', name: 'Two ranges to girder', schemaVersion: 1, nodes: [
   { id: 'height-range', type: 'input.range', name: 'Height range', position: { x: 0, y: 0 }, parameters: { min: 1, max: 2, step: .5, quantityKind: 'length', unit: 'm' } },
   { id: 'flange-range', type: 'input.range', name: 'Flange range', position: { x: 0, y: 100 }, parameters: { min: 1, max: 2, step: .5, quantityKind: 'length', unit: 'm' } },
   { id: 'girder', type: 'structural.girder.precast', name: 'Precast Girder', position: { x: 300, y: 0 }, parameters: { HValue: 1.9, HUnit: 'm', tfValue: 1.5, tfUnit: 'm', bfValue: .8, bfUnit: 'm', wValue: .2, wUnit: 'm', th1Value: .12, th1Unit: 'm', th2Value: .1, th2Unit: 'm', bh1Value: .28, bh1Unit: 'm', bh2Value: .15, bh2Unit: 'm', familyId: 'PG-200', preferredSpanValue: 40, preferredSpanUnit: 'm', minSpanValue: 30, minSpanUnit: 'm', maxSpanValue: 90, maxSpanUnit: 'm', materialId: 'C40/50' } },
   { id: 'watch', type: 'output.watch', name: 'Watch', position: { x: 600, y: 0 }, parameters: {} },
  ], connections: [
   { id: 'height', sourceNodeId: 'height-range', sourcePortId: 'values', targetNodeId: 'girder', targetPortId: 'H' },
   { id: 'flange', sourceNodeId: 'flange-range', sourcePortId: 'values', targetNodeId: 'girder', targetPortId: 'tf' },
   { id: 'girder-watch', sourceNodeId: 'girder', sourcePortId: 'candidates', targetNodeId: 'watch', targetPortId: 'value' },
  ] }
  const node = toReactFlowNodes(graph, { projectUnits: { length: 'm' }, onParameterChange: vi.fn() }).find(item => item.id === 'girder')!
  const candidates = toReactFlowNodes(graph, { projectUnits: { length: 'm' }, onParameterChange: vi.fn() }).find(item => item.id === 'watch')!.data.previewValue as unknown as GirderCandidate[]
  expect(node.data.previewCandidateCount).toBe(9)
  expect(candidates.map(item => [item.geometry.H, item.geometry.tf])).toEqual([
   [1, 1], [1, 1.5], [1, 2],
   [1.5, 1], [1.5, 1.5], [1.5, 2],
   [2, 1], [2, 1.5], [2, 2],
  ])
  expect(new Set(candidates.map(item => `${item.geometry.H}:${item.geometry.tf}`)).size).toBe(9)
  expect(node.data.executionState).not.toBe('error')
 })

 it('previews Pier candidates from Range, scalar, Integer, Math, and chained Range-to-Math inputs without Run', () => {
  const graph:SpanovaGraph={id:'live-pier',name:'live pier preview',schemaVersion:1,nodes:[
   {id:'range',type:'input.range',name:'Range',position:{x:0,y:0},parameters:{min:2,max:4,step:1,quantityKind:'dimensionless',unit:'1'}},
   {id:'integer',type:'input.integer',name:'Integer',position:{x:0,y:100},parameters:{value:3}},
   {id:'number',type:'input.number',name:'Number',position:{x:0,y:200},parameters:{value:6}},
   {id:'math',type:'math.add',name:'Add',position:{x:200,y:100},parameters:{}},
   {id:'pier',type:'substructure.pier.rectangular',name:'Pier',position:{x:500,y:100},parameters:{BValue:3,BUnit:'m',DValue:4,DUnit:'m',heightValue:12,heightUnit:'m',materialId:'C40/50',columns:1}},
   {id:'circular',type:'substructure.pier.circular',name:'Circular',position:{x:500,y:300},parameters:{DValue:2,DUnit:'m',heightValue:12,heightUnit:'m',materialId:'C40/50',columns:1}},
   {id:'scalarPier',type:'substructure.pier.circular',name:'Number Pier',position:{x:500,y:500},parameters:{DValue:2,DUnit:'m',heightValue:12,heightUnit:'m',materialId:'C40/50',columns:1}},
   {id:'integerPier',type:'substructure.pier.circular',name:'Integer Pier',position:{x:500,y:700},parameters:{DValue:2,DUnit:'m',heightValue:12,heightUnit:'m',materialId:'C40/50',columns:1}},
   {id:'mathPier',type:'substructure.pier.circular',name:'Math Pier',position:{x:500,y:900},parameters:{DValue:2,DUnit:'m',heightValue:12,heightUnit:'m',materialId:'C40/50',columns:1}},
  ],connections:[
   {id:'range-math',sourceNodeId:'range',sourcePortId:'values',targetNodeId:'math',targetPortId:'a'},
   {id:'integer-math',sourceNodeId:'integer',sourcePortId:'value',targetNodeId:'math',targetPortId:'b'},
   {id:'range-depth',sourceNodeId:'range',sourcePortId:'values',targetNodeId:'pier',targetPortId:'depth'},
   {id:'range-height',sourceNodeId:'range',sourcePortId:'values',targetNodeId:'pier',targetPortId:'height'},
   {id:'range-circular',sourceNodeId:'range',sourcePortId:'values',targetNodeId:'circular',targetPortId:'diameter'},
   {id:'range-width',sourceNodeId:'range',sourcePortId:'values',targetNodeId:'pier',targetPortId:'width'},
   {id:'number-pier',sourceNodeId:'number',sourcePortId:'value',targetNodeId:'scalarPier',targetPortId:'diameter'},
   {id:'integer-pier',sourceNodeId:'integer',sourcePortId:'value',targetNodeId:'integerPier',targetPortId:'diameter'},
   {id:'math-pier',sourceNodeId:'math',sourcePortId:'result',targetNodeId:'mathPier',targetPortId:'diameter'},
  ]}
  const nodes=toReactFlowNodes(graph,{onParameterChange:vi.fn()})
  expect(nodes.find(node=>node.id==='pier')?.data.previewCandidateCount).toBe(27)
  expect(nodes.find(node=>node.id==='circular')?.data.previewCandidateCount).toBe(3)
  expect(nodes.find(node=>node.id==='scalarPier')?.data.previewCandidateCount).toBe(1)
  expect(nodes.find(node=>node.id==='integerPier')?.data.previewCandidateCount).toBe(1)
  expect(nodes.find(node=>node.id==='mathPier')?.data.previewCandidateCount).toBe(3)
  expect(nodes.find(node=>node.id==='pier')?.data.outputs?.candidates).toBeUndefined()
  expect(nodes.find(node=>node.id==='pier')?.data.connectedInputs?.width.value).toEqual([
   {value:.002,quantityKind:'length',unit:'mm'},
   {value:.003,quantityKind:'length',unit:'mm'},
   {value:.004,quantityKind:'length',unit:'mm'},
  ])
 })

 it('previews live Pier Cap Cartesian candidates, invalid counts and connected Concrete without Run',()=>{
  const graph:SpanovaGraph={id:'caps',name:'caps',schemaVersion:1,nodes:[
   {id:'length',type:'input.range',name:'Length range',position:{x:0,y:0},parameters:{min:10,max:14,step:2,quantityKind:'length',unit:'m'}},
   {id:'width',type:'input.range',name:'Width range',position:{x:0,y:100},parameters:{min:2.5,max:3,step:.5,quantityKind:'length',unit:'m'}},
   {id:'height',type:'input.range',name:'Height range',position:{x:0,y:200},parameters:{min:1.5,max:2,step:.5,quantityKind:'length',unit:'m'}},
   {id:'concrete',type:'material.concrete',name:'Concrete',position:{x:0,y:300},parameters:{materialId:'C35/45'}},
   {id:'rect',type:'substructure.pier-cap.rectangular',name:'Rectangular Cap',position:{x:400,y:0},parameters:{lengthValue:12,lengthUnit:'m',widthValue:3,widthUnit:'m',heightValue:2,heightUnit:'m',materialId:'C40/50'}},
   {id:'top',type:'input.range',name:'Top range',position:{x:0,y:400},parameters:{min:2.5,max:3,step:.5,quantityKind:'length',unit:'m'}},
   {id:'stem',type:'input.range',name:'Stem range',position:{x:0,y:500},parameters:{min:1.5,max:2.8,step:1.3,quantityKind:'length',unit:'m'}},
   {id:'t',type:'substructure.pier-cap.t',name:'T-Cap',position:{x:400,y:400},parameters:{lengthValue:12,lengthUnit:'m',topWidthValue:3,topWidthUnit:'m',stemWidthValue:1.5,stemWidthUnit:'m',totalHeightValue:2.5,totalHeightUnit:'m',flangeThicknessValue:.8,flangeThicknessUnit:'m',materialId:'C40/50'}},
  ],connections:[
   {id:'length-rect',sourceNodeId:'length',sourcePortId:'values',targetNodeId:'rect',targetPortId:'length'},
   {id:'width-rect',sourceNodeId:'width',sourcePortId:'values',targetNodeId:'rect',targetPortId:'width'},
   {id:'height-rect',sourceNodeId:'height',sourcePortId:'values',targetNodeId:'rect',targetPortId:'height'},
   {id:'concrete-rect',sourceNodeId:'concrete',sourcePortId:'material',targetNodeId:'rect',targetPortId:'material'},
   {id:'top-t',sourceNodeId:'top',sourcePortId:'values',targetNodeId:'t',targetPortId:'topWidth'},
   {id:'stem-t',sourceNodeId:'stem',sourcePortId:'values',targetNodeId:'t',targetPortId:'stemWidth'},
  ]}
  const nodes=toReactFlowNodes(graph,{onParameterChange:vi.fn(),projectUnits:{length:'m'}})
  expect(nodes.find(node=>node.id==='rect')?.data).toMatchObject({previewCandidateCount:12,previewGeneratedCombinations:12,previewInvalidCombinations:0})
  expect(nodes.find(node=>node.id==='rect')?.data.outputs?.candidates).toBeUndefined()
  expect(nodes.find(node=>node.id==='rect')?.data.connectedInputs?.material.value).toMatchObject({id:'C35/45'})
  expect(nodes.find(node=>node.id==='t')?.data).toMatchObject({previewCandidateCount:3,previewGeneratedCombinations:4,previewInvalidCombinations:1})
 })

 it('previews Range -> Math -> Pier Cap and target-aware scalar/list lengths without Run',()=>{
  const graph:SpanovaGraph={id:'cap-math',name:'Range Math Cap',schemaVersion:1,nodes:[
   {id:'range',type:'input.range',name:'Range',position:{x:0,y:0},parameters:{min:10,max:14,step:2,quantityKind:'dimensionless',unit:'1'}},
   {id:'increment',type:'input.number',name:'Increment',position:{x:0,y:100},parameters:{value:2}},
   {id:'math',type:'math.add',name:'Add',position:{x:200,y:50},parameters:{}},
   {id:'height',type:'input.integer',name:'Height',position:{x:0,y:200},parameters:{value:2}},
   {id:'cap',type:'substructure.pier-cap.rectangular',name:'Cap',position:{x:500,y:50},parameters:{lengthValue:12,lengthUnit:'m',widthValue:3,widthUnit:'m',heightValue:2,heightUnit:'m',materialId:'C40/50'}},
  ],connections:[
   {id:'range-add',sourceNodeId:'range',sourcePortId:'values',targetNodeId:'math',targetPortId:'a'},
   {id:'increment-add',sourceNodeId:'increment',sourcePortId:'value',targetNodeId:'math',targetPortId:'b'},
   {id:'math-length',sourceNodeId:'math',sourcePortId:'result',targetNodeId:'cap',targetPortId:'length'},
   {id:'integer-height',sourceNodeId:'height',sourcePortId:'value',targetNodeId:'cap',targetPortId:'height'},
  ]}
  const capNode=toReactFlowNodes(graph,{projectUnits:{length:'m'},onParameterChange:vi.fn()}).find(node=>node.id==='cap')!
  expect(capNode.data.previewCandidateCount).toBe(3)
  expect(capNode.data.previewGeneratedCombinations).toBe(3)
  expect(capNode.data.outputs?.candidates).toBeUndefined()
  expect(capNode.data.connectedInputs?.length.value).toEqual([12,14,16].map(value=>({value,quantityKind:'length',unit:'m'})))
  expect(capNode.data.connectedInputs?.height.value).toEqual({value:2,quantityKind:'length',unit:'m'})
 })

 it('previews Piled Foundation count ranges, independent derived geometry and candidate statistics live',()=>{
  const graph:SpanovaGraph={id:'foundation-live',name:'foundation live',schemaVersion:1,nodes:[
   {id:'counts',type:'input.range',name:'Pile count alternatives',position:{x:0,y:0},parameters:{min:3,max:5,step:1,quantityKind:'dimensionless',unit:'1'}},
   {id:'foundation',type:'substructure.foundation.piled',name:'Piled Foundation',position:{x:400,y:0},parameters:{pileDiameterValue:1.2,pileDiameterUnit:'m',pileCountXValue:4,pileSpacingXValue:3.6,pileSpacingXUnit:'m',pileCountYValue:3,pileSpacingYValue:3.6,pileSpacingYUnit:'m',capHeightValue:2.5,capHeightUnit:'m',materialId:'C35/45'}},
  ],connections:[{id:'count-range',sourceNodeId:'counts',sourcePortId:'values',targetNodeId:'foundation',targetPortId:'pileCountX'}]}
  const projected=toReactFlowNodes(graph,{onParameterChange:vi.fn(),projectUnits:{length:'m'}})
  const node=projected.find(item=>item.id==='foundation')!
  expect(node.data).toMatchObject({previewCandidateCount:3,previewGeneratedCombinations:3,previewInvalidCombinations:0})
  const candidates=node.data.previewFoundationCandidates as import('../domain/types').FoundationCandidate[]
  expect(candidates.map(item=>(item.geometry.derived as Record<string,number>).Lx)).toEqual([9.6,13.2,16.8])
  expect(candidates.every(item=>(item.geometry.derived as Record<string,number>).Ly===9.6)).toBe(true)
  expect(node.data.outputs?.candidates).toBeUndefined()
 })

 it('shows Foundation raw combinations and the shared limit without materializing an oversized set',()=>{
  const graph:SpanovaGraph={id:'foundation-limit',name:'foundation limit',schemaVersion:1,nodes:[
   {id:'lx',type:'input.range',name:'Lx',position:{x:0,y:0},parameters:{min:1,max:100,step:1,quantityKind:'length',unit:'m'}},
   {id:'ly',type:'input.range',name:'Ly',position:{x:0,y:100},parameters:{min:1,max:100,step:1,quantityKind:'length',unit:'m'}},
   {id:'h',type:'input.range',name:'Height',position:{x:0,y:200},parameters:{min:1,max:2,step:1,quantityKind:'length',unit:'m'}},
   {id:'shallow',type:'substructure.foundation.shallow',name:'Shallow',position:{x:300,y:0},parameters:{LxValue:8,LxUnit:'m',LyValue:6,LyUnit:'m',heightValue:2,heightUnit:'m',materialId:'C40/50'}},
  ],connections:[{id:'x',sourceNodeId:'lx',sourcePortId:'values',targetNodeId:'shallow',targetPortId:'Lx'},{id:'y',sourceNodeId:'ly',sourcePortId:'values',targetNodeId:'shallow',targetPortId:'Ly'},{id:'h',sourceNodeId:'h',sourcePortId:'values',targetNodeId:'shallow',targetPortId:'height'}]}
  const node=toReactFlowNodes(graph,{onParameterChange:vi.fn()}).find(item=>item.id==='shallow')!
  expect(node.data.previewCandidateCount).toBeUndefined()
  expect(node.data.previewGeneratedCombinations).toBe(20_000)
  expect(node.data.executionError).toContain('Maximum is 10,000')
  expect(node.data.previewFoundationCandidates).toBeUndefined()
 })

 it('previews direct Number and Concrete authoring values for Watch', () => {
  const graph: SpanovaGraph = { id:'g', name:'preview', schemaVersion:1, nodes:[
   {id:'n',type:'input.number',name:'Number',position:{x:0,y:0},parameters:{value:8}},
   {id:'c',type:'material.concrete',name:'Concrete',position:{x:0,y:100},parameters:{materialId:'C35/45'}},
   {id:'w1',type:'output.watch',name:'Watch 1',position:{x:200,y:0},parameters:{}},
   {id:'w2',type:'output.watch',name:'Watch 2',position:{x:200,y:100},parameters:{}},
  ],connections:[
   {id:'e1',sourceNodeId:'n',sourcePortId:'value',targetNodeId:'w1',targetPortId:'value'},
   {id:'e2',sourceNodeId:'c',sourcePortId:'material',targetNodeId:'w2',targetPortId:'value'},
  ] }
  const nodes = toReactFlowNodes(graph, { onParameterChange: vi.fn() })
  expect(nodes[2].data).toMatchObject({ previewValue:8, outputAvailability:'preview' })
  expect(nodes[3].data).toMatchObject({ previewValue:{domainType:'ConcreteMaterial',id:'C35/45',name:'C35/45'}, outputAvailability:'preview' })
 })

 it('marks candidate collections Run required until graph execution produces them', () => {
  const graph: SpanovaGraph = { id:'g', name:'pending', schemaVersion:1, nodes:[
   {id:'p',type:'substructure.pier.rectangular',name:'Pier',position:{x:0,y:0},parameters:{}},
   {id:'l',type:'output.list',name:'List',position:{x:200,y:0},parameters:{}},
  ],connections:[{id:'e',sourceNodeId:'p',sourcePortId:'candidates',targetNodeId:'l',targetPortId:'items'}] }
  expect(toReactFlowNodes(graph, { onParameterChange: vi.fn() })[1].data.outputAvailability).toBe('run-required')
 })

 it('previews Range values through connected Math inputs to Watch and List without execution', () => {
  const graph:SpanovaGraph={id:'live',name:'live list preview',schemaVersion:1,nodes:[
   {id:'start',type:'input.number',name:'Start',position:{x:0,y:0},parameters:{value:2}},
   {id:'base',type:'input.number',name:'Base',position:{x:0,y:100},parameters:{value:2}},
   {id:'add',type:'math.add',name:'Add',position:{x:100,y:100},parameters:{}},
   {id:'range',type:'input.range',name:'Range',position:{x:200,y:0},parameters:{min:0,max:0,step:1,quantityKind:'dimensionless',unit:'1'}},
   {id:'watch',type:'output.watch',name:'Watch',position:{x:400,y:0},parameters:{}},
   {id:'list',type:'output.list',name:'List',position:{x:500,y:0},parameters:{}},
  ],connections:[
   {id:'start-edge',sourceNodeId:'start',sourcePortId:'value',targetNodeId:'range',targetPortId:'start'},
   {id:'math-a',sourceNodeId:'base',sourcePortId:'value',targetNodeId:'add',targetPortId:'a'},
   {id:'math-b',sourceNodeId:'base',sourcePortId:'value',targetNodeId:'add',targetPortId:'b'},
   {id:'end-edge',sourceNodeId:'add',sourcePortId:'result',targetNodeId:'range',targetPortId:'end'},
   {id:'watch-edge',sourceNodeId:'range',sourcePortId:'values',targetNodeId:'watch',targetPortId:'value'},
   {id:'list-edge',sourceNodeId:'range',sourcePortId:'values',targetNodeId:'list',targetPortId:'items'},
  ]}
  const nodes=toReactFlowNodes(graph,{onParameterChange:vi.fn()})
  expect(nodes[4].data).toMatchObject({previewValue:[2,3,4],outputAvailability:'preview'})
  expect(nodes[5].data).toMatchObject({previewValue:[2,3,4],outputAvailability:'preview'})
  expect(nodes[3].data.connectedInputs?.start.value).toBe(2)
  expect(nodes[3].data.connectedInputs?.end.value).toBe(4)
 })
})
