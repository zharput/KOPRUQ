import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('Graph document store', () => {
  beforeEach(() => { localStorage.removeItem('spanova.graph.documents.v1'); vi.resetModules() })

  it('persists multiple documents and supports node edit undo/redo', async () => {
    const { addNode, createGraphDocument, deleteNodes, getActiveGraph, getGraphStoreSnapshot, redoGraph, selectGraphDocument, undoGraph } = await import('./graphStore')
    const firstId = createGraphDocument('Bridge Layout')
    const nodeId = addNode('input.number', { x: 40, y: 80 })!
    expect(getActiveGraph().nodes[0]).toMatchObject({ id: nodeId, type: 'input.number', parameters: { value: 0 } })
    undoGraph()
    expect(getActiveGraph().nodes).toHaveLength(0)
    redoGraph()
    expect(getActiveGraph().nodes).toHaveLength(1)
    const secondId = createGraphDocument('Pier Study')
    expect(getGraphStoreSnapshot().graphs.map((graph) => graph.name)).toEqual(['Untitled Graph', 'Bridge Layout', 'Pier Study'])
    selectGraphDocument(firstId)
    deleteNodes([nodeId])
    const saved = JSON.parse(localStorage.getItem('spanova.graph.documents.v1') ?? '{}')
    expect(saved.graphs.find((graph: { id: string }) => graph.id === firstId).nodes).toHaveLength(0)
    expect(saved.graphs.find((graph: { id: string }) => graph.id === secondId)).toBeDefined()
  })

  it('persists Pier Cap authoring parameters and restores them without storing generated candidates',async()=>{
    const {addNode,createGraphDocument,getActiveGraph,undoGraph,redoGraph}=await import('./graphStore')
    createGraphDocument('Pier Cap persistence')
    const id=addNode('substructure.pier-cap.t',{x:100,y:120})!
    const node=getActiveGraph().nodes.find(item=>item.id===id)!
    expect(node.parameters).toMatchObject({lengthValue:12,lengthUnit:'m',topWidthValue:3,stemWidthValue:1.5,totalHeightValue:2.5,flangeThicknessValue:.8,materialId:'C40/50'})
    expect(node.parameters).not.toHaveProperty('candidates')
    const saved=JSON.parse(localStorage.getItem('spanova.graph.documents.v1')??'{}')
    expect(saved.graphs.at(-1).nodes.at(-1)).toEqual(node)
    undoGraph();expect(getActiveGraph().nodes).toHaveLength(0)
    redoGraph();expect(getActiveGraph().nodes.at(-1)).toEqual(node)
  })

  it('persists Foundation authoring values and connections, then regenerates derived data from saved inputs',async()=>{
    const {addConnection,addNode,createGraphDocument,getActiveGraph,undoGraph,redoGraph}=await import('./graphStore')
    createGraphDocument('Foundation persistence')
    const range=addNode('input.range',{x:0,y:0})!,foundation=addNode('substructure.foundation.piled',{x:300,y:0})!
    const edge={id:'foundation-count',sourceNodeId:range,sourcePortId:'values',targetNodeId:foundation,targetPortId:'pileCountX'}
    expect(addConnection(edge)).toBe(true)
    const current=getActiveGraph().nodes.find(item=>item.id===foundation)!
    expect(current.parameters).toMatchObject({pileDiameterValue:1.2,pileCountXValue:4,pileSpacingXValue:3.6,pileSpacingYValue:3.6,capHeightValue:2.5,materialId:'C40/50'})
    const saved=JSON.parse(localStorage.getItem('spanova.graph.documents.v1')??'{}'),restored=saved.graphs.at(-1)
    expect(restored.connections).toEqual([edge])
    expect(restored.nodes.find((item:{id:string})=>item.id===foundation).parameters).toEqual(current.parameters)
    expect(restored.nodes.find((item:{id:string})=>item.id===foundation).parameters).not.toHaveProperty('candidates')
    undoGraph();expect(getActiveGraph().connections).toHaveLength(0)
    redoGraph();expect(getActiveGraph().connections).toEqual([edge])
    vi.resetModules()
    const reloaded=await import('./graphStore')
    expect(reloaded.getActiveGraph().connections).toEqual([edge])
    expect(reloaded.getActiveGraph().nodes.find(item=>item.id===foundation)?.parameters).toEqual(current.parameters)
  })

  it('records one history entry for a connection and retains its ID across undo/redo', async () => {
    const { addConnection, addNode, createGraphDocument, getActiveGraph, subscribeGraphStore, undoGraph, redoGraph } = await import('./graphStore')
    createGraphDocument('Connection Test')
    const numberId = addNode('input.number', { x: 0, y: 0 })!
    const watchId = addNode('output.watch', { x: 200, y: 0 })!
    const connection = { id: 'edge-stable-1', sourceNodeId: numberId, sourcePortId: 'value', targetNodeId: watchId, targetPortId: 'value' }
    let storeUpdates = 0
    const unsubscribe = subscribeGraphStore(() => { storeUpdates += 1 })

    expect(addConnection(connection)).toBe(true)
    expect(storeUpdates).toBe(1)
    expect(addConnection(connection)).toBe(false)
    expect(storeUpdates).toBe(1)
    expect(getActiveGraph().connections).toEqual([connection])

    undoGraph()
    expect(getActiveGraph().connections).toEqual([])
    redoGraph()
    expect(getActiveGraph().connections).toEqual([connection])
    unsubscribe()
  })

  it('replaces an occupied single-source input with one undoable connection operation', async () => {
    const { addConnection, addNode, createGraphDocument, getActiveGraph, undoGraph, redoGraph } = await import('./graphStore')
    createGraphDocument('Replace Connection')
    const first = addNode('input.integer', { x: 0, y: 0 })!, second = addNode('input.integer', { x: 0, y: 100 })!, pier = addNode('substructure.pier.circular', { x: 240, y: 0 })!
    const original = { id: 'first-edge', sourceNodeId: first, sourcePortId: 'value', targetNodeId: pier, targetPortId: 'columns' }
    const replacement = { id: 'second-edge', sourceNodeId: second, sourcePortId: 'value', targetNodeId: pier, targetPortId: 'columns' }
    expect(addConnection(original)).toBe(true)
    expect(addConnection(replacement)).toBe(true)
    expect(getActiveGraph().connections).toEqual([replacement])
    undoGraph()
    expect(getActiveGraph().connections).toEqual([original])
    redoGraph()
    expect(getActiveGraph().connections).toEqual([replacement])
  })

  it('commits a pasted subgraph as one undoable GraphStore operation', async () => {
    const { addNode, createGraphDocument, getActiveGraph, pasteGraphSelection, redoGraph, undoGraph } = await import('./graphStore')
    createGraphDocument('Paste Test')
    const first = addNode('input.number', { x: 0, y: 0 })!
    const second = addNode('output.watch', { x: 200, y: 0 })!
    const cloned: import('../domain/types').SpanovaNode[] = [
      { id: 'copy-number', type: 'input.number', name: 'Number-1', position: { x: 30, y: 30 }, parameters: { value: 7 } },
      { id: 'copy-watch', type: 'output.watch', name: 'Watch-1', position: { x: 230, y: 30 }, parameters: {} },
    ]
    const edges = [{ id: 'copy-edge', sourceNodeId: 'copy-number', sourcePortId: 'value', targetNodeId: 'copy-watch', targetPortId: 'value' }]
    pasteGraphSelection(cloned, edges)
    expect(getActiveGraph().nodes.map(node => node.id)).toEqual([first, second, 'copy-number', 'copy-watch'])
    expect(getActiveGraph().connections).toEqual(edges)
    undoGraph()
    expect(getActiveGraph().nodes.map(node => node.id)).toEqual([first, second])
    expect(getActiveGraph().connections).toEqual([])
    redoGraph()
    expect(getActiveGraph().nodes.map(node => node.id)).toContain('copy-number')
    expect(getActiveGraph().connections).toEqual(edges)
  })

  it('reconnects or disconnects one existing edge as one undoable transaction', async () => {
    const { addConnection, addNode, createGraphDocument, getActiveGraph, reconnectConnection, undoGraph } = await import('./graphStore')
    createGraphDocument('Reconnect Test')
    const first = addNode('input.number', { x: 0, y: 0 })!, second = addNode('input.number', { x: 0, y: 100 })!, target = addNode('output.watch', { x: 220, y: 0 })!
    const original = { id: 'edge-reconnect', sourceNodeId: first, sourcePortId: 'value', targetNodeId: target, targetPortId: 'value' }
    addConnection(original)
    expect(reconnectConnection(original.id, { ...original, sourceNodeId: second })).toBe(true)
    expect(getActiveGraph().connections).toEqual([{ ...original, sourceNodeId: second }])
    undoGraph()
    expect(getActiveGraph().connections).toEqual([original])
    expect(reconnectConnection(original.id)).toBe(true)
    expect(getActiveGraph().connections).toEqual([])
    undoGraph()
    expect(getActiveGraph().connections).toEqual([original])
    expect(reconnectConnection(original.id, original)).toBe(true)
    expect(getActiveGraph().connections).toEqual([])
    undoGraph()
    expect(getActiveGraph().connections).toEqual([original])
  })

  it('survives twenty repeated 5-node subgraph pastes without identity collisions', async () => {
    const { createGraphDocument, getActiveGraph, pasteGraphSelection } = await import('./graphStore')
    const { cloneGraphSelection } = await import('./graphClipboard')
    createGraphDocument('Paste Stress')
    const template = [
      { id: 'n', type: 'input.number', name: 'Number', position: { x: 0, y: 0 }, parameters: { value: 3 } },
      { id: 'i', type: 'input.integer', name: 'Integer', position: { x: 0, y: 80 }, parameters: { value: 4 } },
      { id: 'c', type: 'material.concrete', name: 'Concrete', position: { x: 0, y: 160 }, parameters: { materialId: 'C40/50' } },
      { id: 'p', type: 'substructure.pier.rectangular', name: 'Pier', position: { x: 240, y: 40 }, parameters: { BValue: 3, BUnit: 'm', DValue: 1.5, DUnit: 'm', heightValue: 10, heightUnit: 'm', columns: 1, materialId: 'C40/50' } },
      { id: 'l', type: 'output.list', name: 'List', position: { x: 480, y: 40 }, parameters: {} },
    ] as import('../domain/types').SpanovaNode[]
    const connections = [
      { id: 'nb', sourceNodeId: 'n', sourcePortId: 'value', targetNodeId: 'p', targetPortId: 'width' },
      { id: 'id', sourceNodeId: 'i', sourcePortId: 'value', targetNodeId: 'p', targetPortId: 'depth' },
      { id: 'cm', sourceNodeId: 'c', sourcePortId: 'material', targetNodeId: 'p', targetPortId: 'material' },
      { id: 'pl', sourceNodeId: 'p', sourcePortId: 'candidates', targetNodeId: 'l', targetPortId: 'items' },
    ]
    let sequence = 0
    const clipboard = { nodes: template, connections }
    for (let index = 0; index < 20; index++) {
      const clone = cloneGraphSelection(clipboard, 30 * (index + 1), () => `stress-${++sequence}`)
      pasteGraphSelection(clone.nodes, clone.connections)
    }
    const result = getActiveGraph()
    expect(result.nodes).toHaveLength(100)
    expect(result.connections).toHaveLength(80)
    expect(new Set(result.nodes.map(node => node.id)).size).toBe(100)
    expect(new Set(result.connections.map(edge => edge.id)).size).toBe(80)
  })

  it('deletes a connection and can undo and redo the deletion', async () => {
    const { addConnection, addNode, createGraphDocument, deleteConnections, getActiveGraph, undoGraph, redoGraph } = await import('./graphStore')
    createGraphDocument('Delete Test')
    const sourceNodeId = addNode('input.integer', { x: 0, y: 0 })!
    const targetNodeId = addNode('output.watch', { x: 200, y: 0 })!
    const connection = { id: 'edge-delete-1', sourceNodeId, sourcePortId: 'value', targetNodeId, targetPortId: 'value' }
    addConnection(connection)
    deleteConnections([connection.id])
    expect(getActiveGraph().connections).toEqual([])
    undoGraph()
    expect(getActiveGraph().connections).toEqual([connection])
    redoGraph()
    expect(getActiveGraph().connections).toEqual([])
  })

  it('does not mutate or record history for an invalid connection', async () => {
    const { addConnection, addNode, createGraphDocument, getActiveGraph, getGraphStoreSnapshot } = await import('./graphStore')
    createGraphDocument('Invalid Connection')
    const booleanId = addNode('input.boolean', { x: 0, y: 0 })!
    const multiplyId = addNode('math.multiply', { x: 200, y: 0 })!
    const before = getActiveGraph()
    const canUndoBefore = getGraphStoreSnapshot().canUndo
    expect(addConnection({ id: 'invalid-edge', sourceNodeId: booleanId, sourcePortId: 'value', targetNodeId: multiplyId, targetPortId: 'a' })).toBe(false)
    expect(getActiveGraph()).toBe(before)
    expect(getActiveGraph().connections).toEqual([])
    expect(getGraphStoreSnapshot().canUndo).toBe(canUndoBefore)
  })

  it('handles at least 50 committed connections across 80 graph nodes', async () => {
    const { addConnection, addNode, createGraphDocument, getActiveGraph } = await import('./graphStore')
    const { validateGraph } = await import('../engine/graphEngine')
    createGraphDocument('Stress Test')
    const numbers = Array.from({ length: 50 }, (_, index) => addNode('input.number', { x: index * 20, y: 0 })!)
    const math = Array.from({ length: 20 }, (_, index) => addNode('math.add', { x: index * 20, y: 120 })!)
    const watches = Array.from({ length: 10 }, (_, index) => addNode('output.watch', { x: index * 20, y: 240 })!)
    let edgeNumber = 0
    for (let index = 0; index < 20; index += 1) {
      expect(addConnection({ id: `stress-${edgeNumber++}`, sourceNodeId: numbers[index * 2], sourcePortId: 'value', targetNodeId: math[index], targetPortId: 'a' })).toBe(true)
      expect(addConnection({ id: `stress-${edgeNumber++}`, sourceNodeId: numbers[index * 2 + 1], sourcePortId: 'value', targetNodeId: math[index], targetPortId: 'b' })).toBe(true)
    }
    for (let index = 0; index < 10; index += 1) expect(addConnection({ id: `stress-${edgeNumber++}`, sourceNodeId: math[index], sourcePortId: 'result', targetNodeId: watches[index], targetPortId: 'value' })).toBe(true)

    const graph = getActiveGraph()
    expect(graph.nodes).toHaveLength(80)
    expect(graph.connections).toHaveLength(50)
    expect(validateGraph(graph)).toEqual([])
  })
})
