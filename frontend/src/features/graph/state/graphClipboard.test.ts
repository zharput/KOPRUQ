import { describe, expect, it } from 'vitest'
import { cloneGraphSelection, copyGraphSelection, sameGraphSelection } from './graphClipboard'
import type { SpanovaGraph } from '../domain/types'

const graph: SpanovaGraph = {
  id: 'g', name: 'copy test', schemaVersion: 1,
  nodes: [
    { id: 'a', type: 'input.number', name: 'Number A', position: { x: 10, y: 20 }, parameters: { value: 3 } },
    { id: 'b', type: 'math.multiply', name: 'Multiply', position: { x: 110, y: 20 }, parameters: {} },
    { id: 'c', type: 'input.number', name: 'Number C', position: { x: 10, y: 120 }, parameters: { value: 4 } },
    { id: 'w', type: 'output.watch', name: 'Watch', position: { x: 220, y: 20 }, parameters: {} },
  ],
  connections: [
    { id: 'e1', sourceNodeId: 'a', sourcePortId: 'value', targetNodeId: 'b', targetPortId: 'a' },
    { id: 'e2', sourceNodeId: 'c', sourcePortId: 'value', targetNodeId: 'b', targetPortId: 'b' },
    { id: 'e3', sourceNodeId: 'b', sourcePortId: 'result', targetNodeId: 'w', targetPortId: 'value' },
  ],
}

describe('Graph clipboard', () => {
  it('treats newly allocated and reordered selected ID arrays as the same selection', () => {
    expect(sameGraphSelection(['a', 'b'], ['b', 'a'])).toBe(true)
    expect(sameGraphSelection(['a', 'b'], ['a', 'c'])).toBe(false)
  })
  it('copies selected nodes and only connections internal to the selection', () => {
    const copied = copyGraphSelection(graph, ['a', 'b', 'c'])
    expect(copied.nodes.map(node => node.id)).toEqual(['a', 'b', 'c'])
    expect(copied.connections.map(edge => edge.id)).toEqual(['e1', 'e2'])
  })

  it('clones subgraphs with new IDs, copied parameters, independent data and relative positions', () => {
    const copied = copyGraphSelection(graph, ['a', 'b', 'c'])
    let next = 0
    const cloned = cloneGraphSelection(copied, 30, () => `new-${++next}`)
    expect(cloned.nodes.map(node => node.id)).toEqual(['new-1', 'new-2', 'new-3'])
    expect(cloned.nodes.map(node => node.position)).toEqual([{ x: 40, y: 50 }, { x: 140, y: 50 }, { x: 40, y: 150 }])
    expect(cloned.connections).toEqual([
      { id: 'new-4', sourceNodeId: 'new-1', sourcePortId: 'value', targetNodeId: 'new-2', targetPortId: 'a' },
      { id: 'new-5', sourceNodeId: 'new-3', sourcePortId: 'value', targetNodeId: 'new-2', targetPortId: 'b' },
    ])
    ;(cloned.nodes[0].parameters as Record<string, number>).value = 99
    expect(graph.nodes[0].parameters.value).toBe(3)
  })

  it('clones a live Range -> Pier Cap -> Watch subgraph with internal edges and local cap state',()=>{
    const capGraph:SpanovaGraph={id:'cap-clipboard',name:'cap clipboard',schemaVersion:1,nodes:[
      {id:'range',type:'input.range',name:'Range',position:{x:0,y:0},parameters:{min:10,max:14,step:2,quantityKind:'length',unit:'m'}},
      {id:'cap',type:'substructure.pier-cap.rectangular',name:'Rectangular Cap',position:{x:250,y:0},parameters:{lengthValue:12,lengthUnit:'m',widthValue:3,widthUnit:'m',heightValue:2,heightUnit:'m',materialId:'C35/45'}},
      {id:'watch',type:'output.watch',name:'Watch',position:{x:500,y:0},parameters:{}},
    ],connections:[
      {id:'range-cap',sourceNodeId:'range',sourcePortId:'values',targetNodeId:'cap',targetPortId:'length'},
      {id:'cap-watch',sourceNodeId:'cap',sourcePortId:'candidates',targetNodeId:'watch',targetPortId:'value'},
    ]}
    const cloned=cloneGraphSelection(copyGraphSelection(capGraph,['range','cap','watch']),40,((next=0)=>()=>`cap-copy-${++next}`)())
    expect(cloned.nodes.map(node=>node.type)).toEqual(['input.range','substructure.pier-cap.rectangular','output.watch'])
    expect(cloned.nodes[1].parameters).toMatchObject({materialId:'C35/45',lengthValue:12})
    expect(cloned.connections.map(edge=>[edge.sourceNodeId,edge.sourcePortId,edge.targetNodeId,edge.targetPortId])).toEqual([
      ['cap-copy-1','values','cap-copy-2','length'],['cap-copy-2','candidates','cap-copy-3','value'],
    ])
  })

  it('clones Foundation authoring values and its Range/Watch wiring with fresh node and edge IDs',()=>{
    const foundationGraph:SpanovaGraph={id:'foundation-clipboard',name:'foundation clipboard',schemaVersion:1,nodes:[
      {id:'range',type:'input.integer-list',name:'Integer List',position:{x:0,y:0},parameters:{valuesText:'3, 4, 5'}},
      {id:'foundation',type:'substructure.foundation.piled',name:'Piled Foundation',position:{x:250,y:0},parameters:{pileDiameterValue:1.2,pileDiameterUnit:'m',pileCountXValue:4,pileSpacingXValue:3.6,pileSpacingXUnit:'m',pileCountYValue:3,pileSpacingYValue:3.6,pileSpacingYUnit:'m',capHeightValue:2.5,capHeightUnit:'m',materialId:'C35/45'}},
      {id:'watch',type:'output.watch',name:'Watch',position:{x:500,y:0},parameters:{}},
    ],connections:[{id:'count',sourceNodeId:'range',sourcePortId:'values',targetNodeId:'foundation',targetPortId:'pileCountX'},{id:'result',sourceNodeId:'foundation',sourcePortId:'candidates',targetNodeId:'watch',targetPortId:'value'}]}
    const clone=cloneGraphSelection(copyGraphSelection(foundationGraph,['range','foundation','watch']),40,(()=>{let id=0;return()=>`foundation-copy-${++id}`})())
    expect(clone.nodes.map(node=>node.type)).toEqual(['input.integer-list','substructure.foundation.piled','output.watch'])
    expect(clone.nodes[0].parameters).toEqual({valuesText:'3, 4, 5'})
    expect(clone.nodes[1].parameters).toMatchObject({pileDiameterValue:1.2,pileCountXValue:4,pileSpacingXValue:3.6,pileCountYValue:3,pileSpacingYValue:3.6,capHeightValue:2.5,materialId:'C35/45'})
    expect(clone.nodes[1].id).not.toBe('foundation')
    expect(clone.connections.map(edge=>[edge.sourceNodeId,edge.sourcePortId,edge.targetNodeId,edge.targetPortId])).toEqual([['foundation-copy-1','values','foundation-copy-2','pileCountX'],['foundation-copy-2','candidates','foundation-copy-3','value']])
  })

  it('uses the same clone path for twenty repeated Duplicate operations without ID reuse', () => {
    let next = 0
    const copied = copyGraphSelection(graph, ['a', 'b', 'c'])
    const nodeIds = new Set<string>(), edgeIds = new Set<string>()
    for (let index = 0; index < 20; index++) {
      const clone = cloneGraphSelection(copied, 30 * (index + 1), () => `duplicate-${++next}`)
      clone.nodes.forEach(node => nodeIds.add(node.id))
      clone.connections.forEach(edge => edgeIds.add(edge.id))
    }
    expect(nodeIds.size).toBe(60)
    expect(edgeIds.size).toBe(40)
  })
})
