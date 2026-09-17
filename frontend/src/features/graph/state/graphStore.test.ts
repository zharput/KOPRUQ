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
