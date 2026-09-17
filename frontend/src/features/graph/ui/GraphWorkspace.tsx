import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react'
import { ReactFlow, ReactFlowProvider, Background, BackgroundVariant, MiniMap, useReactFlow, type Connection, type EdgeChange, type NodeChange } from '@xyflow/react'
import { Activity, CircleStop, Maximize2, Minus, Plus, Redo2, Save, Trash2, Undo2 } from 'lucide-react'
import WorkspaceLayout from '../../../app/layout/WorkspaceLayout'
import type { GraphExecutionState, GraphValue, SpanovaGraph } from '../domain/types'
import { fromReactFlowEdge, moveNodePositions, toReactFlowEdges, toReactFlowNodes, type FlowGraphNode } from '../adapters/reactFlowAdapter'
import { executeGraph, validateConnection } from '../engine/graphEngine'
import { getNodeDefinition } from '../registry/nodeRegistry'
import { addConnection, addNode, beginMoveHistory, createGraphDocument, deleteConnections, deleteNodes, endMoveHistory, getActiveGraph, persistGraphStore, redoGraph, renameActiveGraph, selectGraphDocument, setNodeParameter, undoGraph, updateNode, updatePositions } from '../state/graphStore'
import { useGraphStore } from '../state/useGraphStore'
import BaseNode from './BaseNode'
import GraphLog, { type GraphLogEntry } from './GraphLog'
import NodeInspector from './NodeInspector'
import NodeLibrary from './NodeLibrary'
import { graphMaterialServices } from '../api/graphMaterialService'
import { readGraphViewPreferences, writeGraphViewPreferences, type ConnectionStyle } from '../state/graphViewPreferences'

const NODE_TYPES = { spanova: BaseNode }
type AddNodeRef = MutableRefObject<((type: string) => string | undefined) | undefined>

export default function GraphWorkspace() {
  return <ReactFlowProvider><GraphWorkspaceContent /></ReactFlowProvider>
}

function GraphWorkspaceContent() {
  const snapshot = useGraphStore()
  const graph = snapshot.graphs.find((item) => item.id === snapshot.activeGraphId) ?? snapshot.graphs[0] ?? getActiveGraph()
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([])
  const [selectedEdgeIds, setSelectedEdgeIds] = useState<string[]>([])
  const [states, setStates] = useState<Record<string, GraphExecutionState>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [nodeOutputs, setNodeOutputs] = useState<Record<string, Record<string, GraphValue>>>({})
  const [log, setLog] = useState<GraphLogEntry[]>([])
  const [feedback, setFeedback] = useState('')
  const [isRunning, setIsRunning] = useState(false)
  const [connectionStyle, setConnectionStyle] = useState<ConnectionStyle>(() => readGraphViewPreferences().connectionStyle)
  const addRef = useRef<((type: string) => string | undefined) | undefined>(undefined)
  const controller = useRef<AbortController | null>(null)
  const selected = graph.nodes.find((node) => node.id === selectedNodeId)

  useEffect(() => { persistGraphStore() }, [])
  useEffect(() => { setStates({}); setErrors({}); setNodeOutputs({}); setLog([]) }, [graph.id])
  useEffect(() => { if (!graph.nodes.some((node) => node.id === selectedNodeId)) { setSelectedNodeId(null); setSelectedNodeIds([]) } }, [graph.nodes, selectedNodeId])
  const onParameterChange = useCallback((id: string, key: string, value: number | boolean | string | number[]) => { setNodeParameter(id, key, value) }, [])
  const onAdd = useCallback((type: string) => { const id = addRef.current?.(type); if (id) setSelectedNodeId(id) }, [])
  const addDocument = () => { createGraphDocument(`Graph ${snapshot.graphs.length + 1}`); setSelectedNodeId(null); setLog([]); setStates({}); setErrors({}); setNodeOutputs({}) }
  const removeSelected = () => { if (selectedNodeIds.length) deleteNodes(selectedNodeIds); if (selectedEdgeIds.length) deleteConnections(selectedEdgeIds); setSelectedNodeId(null); setSelectedNodeIds([]); setSelectedEdgeIds([]) }
  const run = async () => {
    controller.current?.abort()
    const abort = new AbortController(); controller.current = abort
    setIsRunning(true); setFeedback(''); setErrors({}); setStates(Object.fromEntries(graph.nodes.map((node) => [node.id, 'running'])))
    const result = await executeGraph(graph, abort.signal, graphMaterialServices)
    setLog(result.logs); setErrors(result.errors); setNodeOutputs(result.values)
    setStates(Object.fromEntries(graph.nodes.map((node) => [node.id, result.errors[node.id] ? 'error' : result.values[node.id] ? 'success' : 'idle'])))
    setIsRunning(false); controller.current = null
  }
  const stop = () => controller.current?.abort()
  const changeConnectionStyle = (style: ConnectionStyle) => { setConnectionStyle(style); writeGraphViewPreferences({ connectionStyle: style }) }

  const onConnectionCreated = (message: string) => setLog((entries) => [...entries, { level: 'INFO', message: `Connection created: ${message}` }])
  return <WorkspaceLayout leftTitle="Node Library" leftPanel={<NodeLibrary onAdd={onAdd} />} mainContent={<GraphCanvas graph={graph} addRef={addRef} onNewGraph={addDocument} onConnectionCreated={onConnectionCreated} selectedNodeIds={selectedNodeIds} selectedEdgeIds={selectedEdgeIds} setSelectedNodeId={setSelectedNodeId} setSelectedNodeIds={setSelectedNodeIds} setSelectedEdgeIds={setSelectedEdgeIds} states={states} errors={errors} nodeOutputs={nodeOutputs} onParameterChange={onParameterChange} log={log} feedback={feedback} setFeedback={setFeedback} isRunning={isRunning} run={run} stop={stop} onDelete={removeSelected} canUndo={snapshot.canUndo} canRedo={snapshot.canRedo} connectionStyle={connectionStyle} onConnectionStyleChange={changeConnectionStyle} />} rightTitle="Node Inspector" rightPanel={<NodeInspector node={selected} states={states} errors={errors} outputs={nodeOutputs} onNodeChange={(id, patch) => updateNode(id, (node) => ({ ...node, ...patch }))} onParameterChange={onParameterChange} />} mainClassName="spn-workspace-main-graph" />
}

function GraphCanvas({ graph, addRef, onNewGraph, onConnectionCreated, selectedNodeIds, selectedEdgeIds, setSelectedNodeId, setSelectedNodeIds, setSelectedEdgeIds, states, errors, nodeOutputs, onParameterChange, log, feedback, setFeedback, isRunning, run, stop, onDelete, canUndo, canRedo, connectionStyle, onConnectionStyleChange }: {
  graph: SpanovaGraph; addRef: AddNodeRef; onNewGraph: () => void; onConnectionCreated: (message: string) => void; selectedNodeIds: string[]; selectedEdgeIds: string[]; setSelectedNodeId: (id: string | null) => void; setSelectedNodeIds: (ids: string[]) => void; setSelectedEdgeIds: (ids: string[]) => void; states: Record<string, GraphExecutionState>; errors: Record<string, string>; nodeOutputs: Record<string, Record<string, GraphValue>>; onParameterChange: (id: string, key: string, value: number | boolean | string | number[]) => void; log: GraphLogEntry[]; feedback: string; setFeedback: (value: string) => void; isRunning: boolean; run: () => void; stop: () => void; onDelete: () => void; canUndo: boolean; canRedo: boolean; connectionStyle: ConnectionStyle; onConnectionStyleChange: (style: ConnectionStyle) => void
}) {
  const { screenToFlowPosition, fitView, zoomIn, zoomOut } = useReactFlow<FlowGraphNode>()
  const [dragPositions, setDragPositions] = useState<Record<string, { x: number; y: number }>>({})
  const canvasRef = useRef<HTMLDivElement>(null)
  const flowNodeData = useMemo(() => ({ selectedIds: selectedNodeIds, states, errors, outputs: nodeOutputs, onParameterChange }), [selectedNodeIds, states, errors, nodeOutputs, onParameterChange])
  const flowNodes = useMemo(() => toReactFlowNodes(graph, flowNodeData).map((node) => dragPositions[node.id] ? { ...node, position: dragPositions[node.id] } : node), [graph, flowNodeData, dragPositions])
  const flowEdges = useMemo(() => toReactFlowEdges(graph, connectionStyle).map((edge) => selectedEdgeIds.includes(edge.id) ? { ...edge, selected: true } : edge), [graph, selectedEdgeIds, connectionStyle])
  const addAtCenter = useCallback((type: string) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    const position = rect ? screenToFlowPosition({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }) : { x: 120, y: 100 }
    return addNode(type, { x: Math.round(position.x / 20) * 20, y: Math.round(position.y / 20) * 20 })
  }, [screenToFlowPosition])
  useEffect(() => { addRef.current = addAtCenter }, [addRef, addAtCenter])
  const onNodesChange = (changes: NodeChange<FlowGraphNode>[]) => {
    if (changes.some((change) => change.type === 'position')) setDragPositions((positions) => {
      const next = { ...positions }
      for (const change of changes) if (change.type === 'position' && change.position) next[change.id] = change.position
      return next
    })
    const removed = changes.filter((change) => change.type === 'remove').map((change) => change.id)
    if (removed.length) deleteNodes(removed)
  }
  const onEdgesChange = (changes: EdgeChange[]) => {
    const removed = changes.filter((change) => change.type === 'remove').map((change) => change.id)
    if (removed.length) deleteConnections(removed)
  }
  const isValidConnection = useCallback((connection: Connection | import('@xyflow/react').Edge) => {
    if (!connection.source || !connection.sourceHandle || !connection.target || !connection.targetHandle) return false
    return !validateConnection(graph, { sourceNodeId: connection.source, sourcePortId: connection.sourceHandle, targetNodeId: connection.target, targetPortId: connection.targetHandle })
  }, [graph])
  const connect = (connection: Connection) => {
    if (!connection.source || !connection.sourceHandle || !connection.target || !connection.targetHandle) return
    const candidate = { sourceNodeId: connection.source, sourcePortId: connection.sourceHandle, targetNodeId: connection.target, targetPortId: connection.targetHandle }
    const issue = validateConnection(graph, candidate)
    if (issue) { setFeedback(issue.message); return }
    const stored = fromReactFlowEdge({ ...connection, id: globalThis.crypto?.randomUUID?.() ?? `edge-${Date.now()}-${Math.random().toString(36).slice(2)}` })
    if (stored && addConnection(stored)) {
      const sourceNode = graph.nodes.find((node) => node.id === stored.sourceNodeId), targetNode = graph.nodes.find((node) => node.id === stored.targetNodeId)
      const sourcePort = sourceNode && getNodeDefinition(sourceNode.type)?.outputs.find((port) => port.id === stored.sourcePortId)
      const targetPort = targetNode && getNodeDefinition(targetNode.type)?.inputs.find((port) => port.id === stored.targetPortId)
      onConnectionCreated(`${sourceNode?.name ?? stored.sourceNodeId}.${sourcePort?.label ?? stored.sourcePortId} → ${targetNode?.name ?? stored.targetNodeId}.${targetPort?.label ?? stored.targetPortId}`)
      setFeedback('')
    }
  }
  const dropNode = (event: React.DragEvent) => {
    event.preventDefault()
    const type = event.dataTransfer.getData('application/spanova-node')
    if (!type || !getNodeDefinition(type) || !canvasRef.current) return
    const position = screenToFlowPosition({ x: event.clientX, y: event.clientY })
    addNode(type, { x: Math.round(position.x / 20) * 20, y: Math.round(position.y / 20) * 20 })
  }

  return <div className="spn-graph-workspace">
    <header className="spn-graph-toolbar"><div className="spn-graph-name"><label htmlFor="graph-name">GRAPH</label><input id="graph-name" aria-label="Graph name" value={graph.name} onChange={(event) => renameActiveGraph(event.target.value)} /><select aria-label="Graph document" value={graph.id} onChange={(event) => selectGraphDocument(event.target.value)}>{useGraphStore().graphs.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><button type="button" className="spn-graph-icon-button" aria-label="New graph" title="New graph" onClick={onNewGraph}><Plus size={15} /></button></div><div className="spn-graph-tools"><button type="button" onClick={run} disabled={isRunning} title="Run graph"><Activity size={14} /> Run</button><button type="button" onClick={stop} disabled={!isRunning} title="Stop graph"><CircleStop size={14} /> Stop</button><i /><button type="button" aria-label="Undo" title="Undo" disabled={!canUndo} onClick={undoGraph}><Undo2 size={15} /></button><button type="button" aria-label="Redo" title="Redo" disabled={!canRedo} onClick={redoGraph}><Redo2 size={15} /></button><button type="button" aria-label="Delete selected" title="Delete selected" disabled={!selectedNodeIds.length && !selectedEdgeIds.length} onClick={onDelete}><Trash2 size={15} /></button><i /><button type="button" aria-label="Fit View" title="Fit View" onClick={() => fitView({ padding: 0.2, duration: 140 })}><Maximize2 size={15} /></button><button type="button" aria-label="Zoom In" title="Zoom In" onClick={() => zoomIn({ duration: 100 })}><Plus size={15} /></button><button type="button" aria-label="Zoom Out" title="Zoom Out" onClick={() => zoomOut({ duration: 100 })}><Minus size={15} /></button></div><label className="spn-graph-connection-style" title="Connection Style"><span>Connections</span><select aria-label="Connection Style" value={connectionStyle} onChange={(event) => onConnectionStyleChange(event.target.value as ConnectionStyle)}><option value="smooth">Smooth</option><option value="orthogonal">Orthogonal</option></select></label><div className="spn-graph-save-state"><Save size={13} /> Saved</div></header>
    {feedback && <button className="spn-graph-feedback" type="button" onClick={() => setFeedback('')} aria-label="Dismiss connection feedback">{feedback} ×</button>}
    <div className="spn-graph-flow" ref={canvasRef} onDrop={dropNode} onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'copy' }}>
      <ReactFlow nodes={flowNodes} edges={flowEdges} nodeTypes={NODE_TYPES} isValidConnection={isValidConnection} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={connect} onNodeClick={(_, node) => setSelectedNodeId(node.id)} onPaneClick={() => { setSelectedNodeId(null); setSelectedNodeIds([]); setSelectedEdgeIds([]) }} onSelectionChange={({ nodes, edges }) => {
        const nodeIds = nodes.map((node) => node.id), edgeIds = edges.map((edge) => edge.id)
        if (!sameIds(selectedNodeIds, nodeIds)) setSelectedNodeIds(nodeIds)
        if (!sameIds(selectedEdgeIds, edgeIds)) setSelectedEdgeIds(edgeIds)
      }} onNodeDragStart={() => beginMoveHistory()} onNodeDragStop={(_, node) => { updatePositions(moveNodePositions([{ id: node.id, position: node.position }])); endMoveHistory(); setDragPositions((positions) => { const next = { ...positions }; delete next[node.id]; return next }) }} deleteKeyCode={['Backspace', 'Delete']} snapToGrid snapGrid={[20, 20]} fitView nodesConnectable nodesDraggable edgesReconnectable proOptions={{ hideAttribution: true }}>
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#354052" />
        <MiniMap pannable zoomable nodeColor={(node) => node.selected ? '#4c91ff' : '#344158'} maskColor="rgba(8,12,18,0.66)" />
      </ReactFlow>
      {graph.nodes.length === 0 && <div className="spn-graph-empty"><strong>Graph Canvas</strong><span>Add a node from the library or drag it here.</span></div>}
    </div>
    <GraphLog entries={log} />
  </div>
}

function sameIds(current: string[], next: string[]) { return current.length === next.length && current.every((id, index) => id === next[index]) }
