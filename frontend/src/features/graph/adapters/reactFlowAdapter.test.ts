import { describe, expect, it } from 'vitest'
import type { SpanovaGraph } from '../domain/types'
import { toReactFlowEdges } from './reactFlowAdapter'

const graph:SpanovaGraph={id:'graph',name:'Graph',schemaVersion:1,nodes:[{id:'a',type:'input.number',name:'Number',position:{x:10,y:20},parameters:{value:2}},{id:'b',type:'output.watch',name:'Watch',position:{x:300,y:40},parameters:{}}],connections:[{id:'stable-edge-id',sourceNodeId:'a',sourcePortId:'value',targetNodeId:'b',targetPortId:'value'}]}

describe('React Flow edge style projection',()=>{
 it('uses built-in Bezier and orthogonal edge types without changing graph connections',()=>{
  const before=structuredClone(graph)
  const smooth=toReactFlowEdges(graph,'smooth')
  const orthogonal=toReactFlowEdges(graph,'orthogonal')
  expect(smooth[0]).toMatchObject({id:'stable-edge-id',type:'default'})
  expect(orthogonal[0]).toMatchObject({id:'stable-edge-id',type:'step'})
  expect(graph).toEqual(before)
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
