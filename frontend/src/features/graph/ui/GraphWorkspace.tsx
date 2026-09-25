import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react'
import { ReactFlow, ReactFlowProvider, Background, BackgroundVariant, ConnectionMode, useReactFlow, useStoreApi, type Connection, type EdgeChange, type NodeChange } from '@xyflow/react'
import { Activity, CircleStop, Maximize2, Minus, Plus, Redo2, Save, Trash2, Undo2 } from 'lucide-react'
import WorkspaceLayout from '../../../app/layout/WorkspaceLayout'
import type { GraphExecutionState, GraphValue, MaterialValue, KopruqGraph } from '../domain/types'
import { moveNodePositions, toReactFlowEdges, toReactFlowNodes, type FlowGraphNode } from '../adapters/reactFlowAdapter'
import { executeGraph, validateConnection } from '../engine/graphEngine'
import { getNodeDefinition } from '../registry/nodeRegistry'
import { addConnection, addNode, beginMoveHistory, createGraphDocument, deleteConnections, deleteNodes, endMoveHistory, getActiveGraph, pasteGraphSelection, persistGraphStore, reconnectConnection, redoGraph, renameActiveGraph, selectGraphDocument, selectOrCreateBridgeGraph, setNodeParameter, undoGraph, updateNode, updatePositions } from '../state/graphStore'
import { useGraphStore } from '../state/useGraphStore'
import { cloneGraphSelection, copyGraphSelection, sameGraphSelection, type GraphClipboard } from '../state/graphClipboard'
import BaseNode from './BaseNode'
import GraphLog, { type GraphLogEntry } from './GraphLog'
import NodeInspector from './NodeInspector'
import NodeLibrary from './NodeLibrary'
import { mergeBoxSelection, normalizedBox, selectNodeIdsByBox, selectionMode, transformBox, type BoxRect, type BoxSelectionMode } from './boxSelection'
import { graphMaterialServices } from '../api/graphMaterialService'
import type { ProjectUnitPreferences } from '../domain/engineeringInputs'
import { adaptGraphExecutionToFamilySnapshots, graphFingerprint } from '../family/familyResults'
import { markFamilySnapshotsStale, publishFamilySnapshots } from '../family/familySnapshotStore'

import { readProjectState, type ProjectWorkspaceData } from '../../project/model/projectWorkspace'

const NODE_TYPES = { kopruq: BaseNode }
type AddNodeRef = MutableRefObject<((type: string) => string | undefined) | undefined>

export default function GraphWorkspace({ project, setProject }: { project: ProjectWorkspaceData; setProject: (project: ProjectWorkspaceData) => void }) {
  return <ReactFlowProvider><GraphWorkspaceContent project={project} setProject={setProject} /></ReactFlowProvider>
}

function GraphWorkspaceContent({ project, setProject }: { project: ProjectWorkspaceData; setProject: (project: ProjectWorkspaceData) => void }) {
  const snapshot = useGraphStore()
  const graph = snapshot.graphs.find((item) => item.id === snapshot.activeGraphId) ?? snapshot.graphs[0] ?? getActiveGraph()
  const projectUnitLabels = project.units
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([])
  const [selectedEdgeIds, setSelectedEdgeIds] = useState<string[]>([])
  const [states, setStates] = useState<Record<string, GraphExecutionState>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [nodeOutputs, setNodeOutputs] = useState<Record<string, Record<string, GraphValue>>>({})
  const [resolvedInputs, setResolvedInputs] = useState<Record<string, Record<string, GraphValue>>>({})
  const [executedSignature, setExecutedSignature] = useState<string | undefined>(undefined)
  const currentSignature = useMemo(() => graphExecutionSignature(graph), [graph])
  useEffect(() => { if (graph.bridgeId) markFamilySnapshotsStale(graph.bridgeId, graph.id, graphFingerprint(graph)) }, [graph])
  const isDirty = executedSignature !== undefined && executedSignature !== currentSignature
  const executionDisplay = useMemo(() => isDirty ? { states: {} as Record<string, GraphExecutionState>, errors: {} as Record<string, string>, resolvedInputs: {} as Record<string, Record<string, GraphValue>> } : { states, errors, resolvedInputs }, [isDirty, states, errors, resolvedInputs])
  const [log, setLog] = useState<GraphLogEntry[]>([])
  const [feedback, setFeedback] = useState('')
  const [isRunning, setIsRunning] = useState(false)
  const [inspectorMaterial, setInspectorMaterial] = useState<MaterialValue>()
  const addRef = useRef<((type: string) => string | undefined) | undefined>(undefined)
  const controller = useRef<AbortController | null>(null)
  const clipboard = useRef<GraphClipboard | undefined>(undefined)
  const pasteCount = useRef(0)
  const diagnostics = import.meta.env.DEV && new URLSearchParams(window.location.search).has('graphDiagnostics')
  const selected = graph.nodes.find((node) => node.id === selectedNodeId)
  useEffect(() => {
    if (selected?.type !== 'material.concrete' || typeof selected.parameters.materialId !== 'string') { setInspectorMaterial(undefined); return }
    let active = true
    setInspectorMaterial(undefined)
    const resolveMaterial = graphMaterialServices.resolveConcreteMaterial
    if (!resolveMaterial) return () => { active = false }
    void resolveMaterial(selected.parameters.materialId).then(material => { if (active) setInspectorMaterial(material) }).catch(() => { if (active) setInspectorMaterial(undefined) })
    return () => { active = false }
  }, [selected?.id, selected?.parameters.materialId])

  useEffect(() => { persistGraphStore() }, [])
  useEffect(() => { setStates({}); setErrors({}); setNodeOutputs({}); setResolvedInputs({}); setExecutedSignature(undefined); setLog([]) }, [graph.id])
  useEffect(() => { if (selectedNodeId !== null && !graph.nodes.some((node) => node.id === selectedNodeId)) { setSelectedNodeId(null); setSelectedNodeIds([]) } }, [graph.nodes, selectedNodeId])
  const onParameterChange = useCallback((id: string, key: string, value: number | boolean | string | number[]) => { setNodeParameter(id, key, value) }, [])
  const inspectorPreviewInputs = useMemo(() => selected ? toReactFlowNodes(graph,{projectUnits:projectUnitLabels,isDirty,onParameterChange}).find(item=>item.id===selected.id)?.data.connectedInputs : undefined,[graph,selected?.id,projectUnitLabels,isDirty,onParameterChange])
  const onAdd = useCallback((type: string) => { const id = addRef.current?.(type); if (id) setSelectedNodeId(id) }, [])
  const addDocument = () => { createGraphDocument(`Graph ${snapshot.graphs.length + 1}`); setSelectedNodeId(null); setLog([]); setStates({}); setErrors({}); setNodeOutputs({}) }
  const removeSelected = () => { if (selectedNodeIds.length) deleteNodes(selectedNodeIds); if (selectedEdgeIds.length) deleteConnections(selectedEdgeIds); setSelectedNodeId(null); setSelectedNodeIds([]); setSelectedEdgeIds([]) }
  const run = async () => {
    controller.current?.abort()
    const abort = new AbortController(); controller.current = abort
    setIsRunning(true); setFeedback(''); setErrors({}); setResolvedInputs({}); setStates(Object.fromEntries(graph.nodes.map((node) => [node.id, 'running'])))
    // Execution and live rendering must use the same authoritative App state.
    // Reading storage here could lag behind a just-selected Quick Unit.
    const projectUnits = project.units
    const result = await executeGraph(graph, abort.signal, { ...graphMaterialServices, projectUnits })
    if (!abort.signal.aborted && graph.bridgeId) publishFamilySnapshots(adaptGraphExecutionToFamilySnapshots(graph, result))
    setLog(result.logs); setErrors(result.errors); setNodeOutputs(result.values); setResolvedInputs(result.resolvedInputs)
    setExecutedSignature(currentSignature)
    setStates(Object.fromEntries(graph.nodes.map((node) => [node.id, result.errors[node.id] ? 'error' : result.values[node.id] ? 'success' : 'idle'])))
    setIsRunning(false); controller.current = null
  }
  const stop = () => controller.current?.abort()

  const onConnectionCreated = (message: string) => setLog((entries) => [...entries, { level: 'INFO', message: `Connection created: ${message}` }])
  const selectedForClipboard = () => selectedNodeIds.length ? selectedNodeIds : selectedNodeId ? [selectedNodeId] : []
  const copySelection = () => {
    const ids = selectedForClipboard()
    if (!ids.length) return false
    clipboard.current = copyGraphSelection(graph, ids)
    pasteCount.current = 0
    return true
  }
  const pasteClipboard = (source = clipboard.current) => {
    if (!source?.nodes.length) return false
    if (diagnostics) console.count('[graph diagnostics] paste transaction')
    const cloned = cloneGraphSelection(source, 30 * (pasteCount.current + 1))
    pasteGraphSelection(cloned.nodes, cloned.connections)
    pasteCount.current += 1
    return true
  }
  const handleGraphShortcut = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const target = event.target
    const gradeSelector = target instanceof HTMLElement && Boolean(target.closest('[aria-label="Concrete Class"]'))
    if (target instanceof HTMLElement && (target.isContentEditable || target.matches('input, textarea, select, [role="listbox"], [role="option"]') || target.closest('[role="listbox"], [role="option"]')) && !gradeSelector) return
    if (!(event.ctrlKey || event.metaKey) || event.altKey) return
    const key = event.key.toLowerCase()
    if (gradeSelector && (key === 'y' || (key === 'z' && event.shiftKey))) { event.preventDefault(); redoGraph() }
    else if (key === 'z' && gradeSelector) { event.preventDefault(); undoGraph() }
    else if (key === 'c' && copySelection()) event.preventDefault()
    else if (key === 'v' && pasteClipboard()) event.preventDefault()
    else if (key === 'd') { const ids = selectedForClipboard(); if (ids.length) { event.preventDefault(); pasteClipboard(copyGraphSelection(graph, ids)) } }
  }
  return <WorkspaceLayout leftTitle="Node Library" leftPanel={<NodeLibrary onAdd={onAdd} />} mainContent={<GraphCanvas graph={graph} addRef={addRef} onNewGraph={addDocument} onConnectionCreated={onConnectionCreated} onGraphShortcut={handleGraphShortcut} selectedNodeIds={selectedNodeIds} selectedEdgeIds={selectedEdgeIds} setSelectedNodeId={setSelectedNodeId} setSelectedNodeIds={setSelectedNodeIds} setSelectedEdgeIds={setSelectedEdgeIds} states={executionDisplay.states} errors={executionDisplay.errors} nodeOutputs={nodeOutputs} resolvedInputs={executionDisplay.resolvedInputs} projectUnits={projectUnitLabels} onParameterChange={onParameterChange} log={log} feedback={feedback} setFeedback={setFeedback} isRunning={isRunning} run={run} stop={stop} onDelete={removeSelected} canUndo={snapshot.canUndo} canRedo={snapshot.canRedo} diagnostics={diagnostics} isDirty={isDirty} project={project} setProject={setProject} />} rightTitle="Node Inspector" rightPanel={<NodeInspector node={selected} selectedNodes={graph.nodes.filter(item => selectedNodeIds.includes(item.id))} states={executionDisplay.states} errors={executionDisplay.errors} outputs={nodeOutputs} resolvedInputs={executionDisplay.resolvedInputs} previewInputs={inspectorPreviewInputs} connections={graph.connections} concreteMaterial={inspectorMaterial} projectUnits={projectUnitLabels} onNodeChange={(id, patch) => updateNode(id, (node) => ({ ...node, ...patch }))} onParameterChange={onParameterChange} />} mainClassName="spn-workspace-main-graph" />
}

function GraphCanvas({ graph, addRef, onNewGraph, onConnectionCreated, onGraphShortcut, selectedNodeIds, selectedEdgeIds, setSelectedNodeId, setSelectedNodeIds, setSelectedEdgeIds, states, errors, nodeOutputs, resolvedInputs, projectUnits, onParameterChange, log, feedback, setFeedback, isRunning, run, stop, onDelete, canUndo, canRedo, diagnostics, isDirty, project, setProject }: {
  graph: KopruqGraph; addRef: AddNodeRef; onNewGraph: () => void; onConnectionCreated: (message: string) => void; onGraphShortcut: (event: React.KeyboardEvent<HTMLDivElement>) => void; selectedNodeIds: string[]; selectedEdgeIds: string[]; setSelectedNodeId: (id: string | null) => void; setSelectedNodeIds: (ids: string[]) => void; setSelectedEdgeIds: (ids: string[]) => void; states: Record<string, GraphExecutionState>; errors: Record<string, string>; nodeOutputs: Record<string, Record<string, GraphValue>>; resolvedInputs: Record<string, Record<string, GraphValue>>; projectUnits: ProjectUnitPreferences; onParameterChange: (id: string, key: string, value: number | boolean | string | number[]) => void; log: GraphLogEntry[]; feedback: string; setFeedback: (value: string) => void; isRunning: boolean; run: () => void; stop: () => void; onDelete: () => void; canUndo: boolean; canRedo: boolean; diagnostics: boolean; isDirty: boolean; project: ProjectWorkspaceData; setProject: (project: ProjectWorkspaceData) => void
}) {
  const bridges = readProjectState([]).bridges
  const activeBridge = bridges.find((bridge) => bridge.id === graph.bridgeId)
  const selectBridge = (bridgeId: string) => {
    const bridge = bridges.find((item) => item.id === bridgeId)
    if (!bridge) return
    selectOrCreateBridgeGraph(bridgeId, project.id || undefined, bridge.no)
    setSelectedNodeId(null); setSelectedNodeIds([]); setSelectedEdgeIds([])
  }
  const { screenToFlowPosition, fitView, zoomIn, zoomOut, getViewport, setViewport } = useReactFlow<FlowGraphNode>()
  const flowStore = useStoreApi()
  const [dragPositions, setDragPositions] = useState<Record<string, { x: number; y: number }>>({})
  const selectedNodeIdsRef = useRef(selectedNodeIds)
  const selectedEdgeIdsRef = useRef(selectedEdgeIds)
  selectedNodeIdsRef.current = selectedNodeIds
  selectedEdgeIdsRef.current = selectedEdgeIds
  const canvasRef = useRef<HTMLDivElement>(null)
  const reconnecting = useRef<{ edgeId: string; mode: 'edge' | 'input' } | undefined>(undefined)
  const ctrlMiddleZoom = useRef<{ lastY: number; x: number } | undefined>(undefined)
  const boxStart = useRef<{ clientX: number; clientY: number; shift: boolean; previous: string[] } | undefined>(undefined)
  const suppressPaneClick = useRef(false)
  const [selectionBox, setSelectionBox] = useState<{ rect: BoxRect; mode: BoxSelectionMode }>()
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    // React Flow owns wheel zoom. Cancel the browser's default scroll at the
    // canvas boundary without stopping propagation to React Flow.
    const preventPageScroll = (event: WheelEvent) => {
      if (event.cancelable) event.preventDefault()
    }
    canvas.addEventListener('wheel', preventPageScroll, { capture: true, passive: false })
    return () => canvas.removeEventListener('wheel', preventPageScroll, true)
  }, [])
  const projectUnitsKey = projectUnits.length
  const flowNodeData = useMemo(() => ({ states, errors, outputs: nodeOutputs, resolvedInputs, projectUnits, projectUnitsKey, isDirty, onParameterChange }), [states, errors, nodeOutputs, resolvedInputs, projectUnits, projectUnitsKey, isDirty, onParameterChange])
  const projectedNodes = useMemo(() => { if (diagnostics) console.count('[graph diagnostics] node projection'); return toReactFlowNodes(graph, flowNodeData) }, [graph, flowNodeData, diagnostics])
  const selectedNodeSet = useMemo(() => new Set(selectedNodeIds), [selectedNodeIds])
  const flowNodes = useMemo(() => projectedNodes.map(node => {
    const position = dragPositions[node.id]
    const selected = selectedNodeSet.has(node.id)
    if (!position && Boolean(node.selected) === selected) return node
    return { ...node, ...(position ? { position } : {}), selected }
  }), [projectedNodes, dragPositions, selectedNodeSet])
  const projectedEdges = useMemo(() => { if (diagnostics) console.count('[graph diagnostics] edge projection'); return toReactFlowEdges(graph, 'smooth') }, [graph, diagnostics])
  const selectedEdgeSet = useMemo(() => new Set(selectedEdgeIds), [selectedEdgeIds])
  const flowEdges = useMemo(() => projectedEdges.map(edge => Boolean(edge.selected) === selectedEdgeSet.has(edge.id) ? edge : { ...edge, selected: selectedEdgeSet.has(edge.id) }), [projectedEdges, selectedEdgeSet])
  useEffect(() => { if (diagnostics) console.count('[graph diagnostics] selection state effect') }, [selectedNodeIds, selectedEdgeIds, diagnostics])
  const addAtCenter = useCallback((type: string) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    const position = rect ? screenToFlowPosition({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }) : { x: 120, y: 100 }
    return addNode(type, { x: Math.round(position.x / 20) * 20, y: Math.round(position.y / 20) * 20 })
  }, [screenToFlowPosition])
  useEffect(() => { addRef.current = addAtCenter }, [addRef, addAtCenter])
  const cancelReconnect = useCallback(() => {
    if (!reconnecting.current) return
    reconnecting.current = undefined
    flowStore.getState().cancelConnection()
  }, [flowStore])
  useEffect(() => {
    const cancelOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') cancelReconnect() }
    window.addEventListener('keydown', cancelOnEscape)
    return () => window.removeEventListener('keydown', cancelOnEscape)
  }, [cancelReconnect])
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
    const candidate = normalizeConnection(graph, connection)
    if (!candidate) return false
    const active = reconnecting.current
    const validationGraph = { ...graph, connections: graph.connections.filter(edge => edge.id !== active?.edgeId && (edge.targetNodeId !== candidate.targetNodeId || edge.targetPortId !== candidate.targetPortId)) }
    return !validateConnection(validationGraph, candidate)
  }, [graph])
  const reconnect = (_oldEdge: import('@xyflow/react').Edge, connection: Connection) => {
    const active = reconnecting.current
    const candidate = normalizeConnection(graph, connection)
    if (!active || active.mode !== 'edge' || !candidate) return
    reconnectConnection(active.edgeId, candidate)
  }
  const finishReconnect = (event: MouseEvent | TouchEvent, _edge: import('@xyflow/react').Edge, _handleType: import('@xyflow/react').HandleType, connectionState: import('@xyflow/react').FinalConnectionState) => {
    const active = reconnecting.current
    if (!active || active.mode !== 'edge') return
    if (!connectionState.isValid && !connectionState.toNode) reconnectConnection(active.edgeId)
    reconnecting.current = undefined
    void event
  }
  const connect = (connection: Connection) => {
    const candidate = normalizeConnection(graph, connection)
    if (!candidate) return
    const manual = reconnecting.current?.mode === 'input' ? reconnecting.current : undefined
    const validationGraph = { ...graph, connections: graph.connections.filter(edge => edge.id !== manual?.edgeId && (edge.targetNodeId !== candidate.targetNodeId || edge.targetPortId !== candidate.targetPortId)) }
    const issue = validateConnection(validationGraph, candidate)
    if (issue) { setFeedback(issue.message); return }
    const stored = { ...candidate, id: globalThis.crypto?.randomUUID?.() ?? `edge-${Date.now()}-${Math.random().toString(36).slice(2)}` }
    const committed = manual ? reconnectConnection(manual.edgeId, candidate) : addConnection(stored)
    if (committed) {
      const sourceNode = graph.nodes.find((node) => node.id === stored.sourceNodeId), targetNode = graph.nodes.find((node) => node.id === stored.targetNodeId)
      const sourcePort = sourceNode && getNodeDefinition(sourceNode.type)?.outputs.find((port) => port.id === stored.sourcePortId)
      const targetPort = targetNode && getNodeDefinition(targetNode.type)?.inputs.find((port) => port.id === stored.targetPortId)
      onConnectionCreated(`${sourceNode?.name ?? stored.sourceNodeId}.${sourcePort?.label ?? stored.sourcePortId} to ${targetNode?.name ?? stored.targetNodeId}.${targetPort?.label ?? stored.targetPortId}`)
      setFeedback('')
    }
    if (manual) reconnecting.current = undefined
  }
  const finishInputReconnect = (_event: MouseEvent | TouchEvent, connectionState: import('@xyflow/react').FinalConnectionState) => {
    const active = reconnecting.current
    if (!active || active.mode !== 'input') return
    if (!connectionState.isValid && !connectionState.toNode) reconnectConnection(active.edgeId)
    reconnecting.current = undefined
  }
  const startInputReconnect = (event: MouseEvent | TouchEvent, params: { nodeId: string | null; handleId: string | null; handleType: import('@xyflow/react').HandleType | null }) => {
    if (!('ctrlKey' in event) || !event.ctrlKey || params.handleType !== 'target' || !params.nodeId || !params.handleId) return
    const incoming = graph.connections.find(edge => edge.targetNodeId === params.nodeId && edge.targetPortId === params.handleId)
    if (incoming) reconnecting.current = { edgeId: incoming.id, mode: 'input' }
  }
  const dropNode = (event: React.DragEvent) => {
    event.preventDefault()
    const type = event.dataTransfer.getData('application/kopruq-node')
    if (!type || !getNodeDefinition(type) || !canvasRef.current) return
    const position = screenToFlowPosition({ x: event.clientX, y: event.clientY })
    addNode(type, { x: Math.round(position.x / 20) * 20, y: Math.round(position.y / 20) * 20 })
  }
  const startCtrlMiddleZoom = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.button !== 1 || !event.ctrlKey || !canvasRef.current || reconnecting.current || flowStore.getState().connection.inProgress) return
    event.preventDefault(); event.stopPropagation()
    const rect=canvasRef.current.getBoundingClientRect()
    ctrlMiddleZoom.current={lastY:event.clientY,x:event.clientX-rect.left}
  }
  useEffect(() => {
    const move=(event:MouseEvent)=>{const gesture=ctrlMiddleZoom.current;if(!gesture)return;event.preventDefault();const delta=event.clientY-gesture.lastY;gesture.lastY=event.clientY;if(delta===0)return;const rect=canvasRef.current?.getBoundingClientRect();if(!rect)return;const x=event.clientX-rect.left,y=event.clientY-rect.top,viewport=getViewport(),zoom=Math.min(2.5,Math.max(.2,viewport.zoom*Math.exp(-delta*.004)));if(zoom===viewport.zoom)return;const flowX=(x-viewport.x)/viewport.zoom,flowY=(y-viewport.y)/viewport.zoom;void setViewport({x:x-flowX*zoom,y:y-flowY*zoom,zoom},{duration:0})}
    const up=()=>{ctrlMiddleZoom.current=undefined}
    window.addEventListener('mousemove',move,{passive:false});window.addEventListener('mouseup',up)
    return()=>{window.removeEventListener('mousemove',move);window.removeEventListener('mouseup',up)}
  },[getViewport,setViewport])

  useEffect(() => {
    const pointInCanvas = (event: MouseEvent) => {
      const rect = canvasRef.current?.getBoundingClientRect()
      if (!rect) return { x: event.clientX, y: event.clientY }
      return { x: Math.min(rect.right, Math.max(rect.left, event.clientX)), y: Math.min(rect.bottom, Math.max(rect.top, event.clientY)) }
    }
    const move = (event: MouseEvent) => {
      const start = boxStart.current
      if (!start) return
      const point = pointInCanvas(event)
      setSelectionBox({ rect: normalizedBox({ x: start.clientX, y: start.clientY }, point), mode: selectionMode(start.clientX, point.x) })
    }
    const up = (event: MouseEvent) => {
      const start = boxStart.current
      if (!start) return
      boxStart.current = undefined
      const point = pointInCanvas(event)
      const mode = selectionMode(start.clientX, point.x)
      const screenBox = normalizedBox({ x: start.clientX, y: start.clientY }, point)
      const toFlowBox = (bounds: Pick<DOMRect, 'left' | 'top' | 'right' | 'bottom'>): BoxRect => transformBox(bounds, screenToFlowPosition)
      const flowBox = toFlowBox(screenBox)
      const renderedNodes = Array.from(canvasRef.current?.querySelectorAll<HTMLElement>('.react-flow__node[data-id]') ?? []).flatMap(element => {
        const id = element.dataset.id
        return id ? [{ id, bounds: toFlowBox(element.getBoundingClientRect()) }] : []
      })
      const hit = selectNodeIdsByBox(renderedNodes, flowBox, mode)
      const next = mergeBoxSelection(start.previous, hit, start.shift)
      selectedNodeIdsRef.current = next
      setSelectedNodeIds(next)
      setSelectedNodeId(next.length === 1 ? next[0] : null)
      setSelectionBox(undefined)
      window.setTimeout(() => { suppressPaneClick.current = false }, 100)
    }
    const cancel = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || !boxStart.current) return
      boxStart.current = undefined
      setSelectionBox(undefined)
      window.setTimeout(() => { suppressPaneClick.current = false }, 100)
    }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
    window.addEventListener('keydown', cancel, true)
    return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); window.removeEventListener('keydown', cancel, true) }
  }, [screenToFlowPosition, setSelectedNodeId, setSelectedNodeIds])

  const startBoxSelection = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.button !== 0 || event.ctrlKey || reconnecting.current || flowStore.getState().connection.inProgress) return
    const target = event.target instanceof Element ? event.target : null
    if (!target || target.closest('.react-flow__node, .react-flow__handle, .react-flow__edge, .react-flow__minimap, input, textarea, select, button, [contenteditable="true"], .nopan')) return
    if (!target.closest('.react-flow__pane, .react-flow__background')) return
    event.preventDefault()
    event.stopPropagation()
    suppressPaneClick.current = true
    boxStart.current = { clientX: event.clientX, clientY: event.clientY, shift: event.shiftKey, previous: selectedNodeIdsRef.current }
    const point = { x: event.clientX, y: event.clientY }
    setSelectionBox({ rect: normalizedBox(point, point), mode: 'window' })
  }

  return <div className="spn-graph-workspace">
    <div className="spn-graph-bridge-selector"><label htmlFor="bridge-selector">Bridge</label><select id="bridge-selector" aria-label="Bridge" value={graph.bridgeId ?? ''} onChange={(event) => selectBridge(event.target.value)}><option value="" disabled>{activeBridge ? activeBridge.no : 'Select bridge'}</option>{bridges.map((bridge) => <option key={bridge.id} value={bridge.id}>{bridge.no} | KM {bridge.km} | L = {bridge.estimatedLengthM.toFixed(2)} m</option>)}</select></div>
    <header className="spn-graph-toolbar"><div className="spn-graph-name"><label htmlFor="graph-name">GRAPH</label><input id="graph-name" aria-label="Graph name" value={graph.name} onChange={(event) => renameActiveGraph(event.target.value)} /><select aria-label="Graph document" value={graph.id} onChange={(event) => selectGraphDocument(event.target.value)}>{useGraphStore().graphs.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><button type="button" className="spn-graph-icon-button" aria-label="New graph" title="New graph" onClick={onNewGraph}><Plus size={15} /></button></div><div className="spn-graph-tools"><button type="button" onClick={run} disabled={isRunning} title="Run graph"><Activity size={14} /> Run</button><button type="button" onClick={stop} disabled={!isRunning} title="Stop graph"><CircleStop size={14} /> Stop</button><i /><button type="button" aria-label="Undo" title="Undo" disabled={!canUndo} onClick={undoGraph}><Undo2 size={15} /></button><button type="button" aria-label="Redo" title="Redo" disabled={!canRedo} onClick={redoGraph}><Redo2 size={15} /></button><button type="button" aria-label="Delete selected" title="Delete selected" disabled={!selectedNodeIds.length && !selectedEdgeIds.length} onClick={onDelete}><Trash2 size={15} /></button><i /><button type="button" aria-label="Fit View" title="Fit View" onClick={() => { if (diagnostics) console.count('[graph diagnostics] fitView'); fitView({ padding: 0.2, duration: 140 }) }}><Maximize2 size={15} /></button><button type="button" aria-label="Zoom In" title="Zoom In" onClick={() => zoomIn({ duration: 100 })}><Plus size={15} /></button><button type="button" aria-label="Zoom Out" title="Zoom Out" onClick={() => zoomOut({ duration: 100 })}><Minus size={15} /></button></div><div className="spn-graph-save-state"><Save size={13} /> Saved</div></header>
    {feedback && <button className="spn-graph-feedback" type="button" onClick={() => setFeedback('')} aria-label="Dismiss connection feedback">{feedback} x</button>}
    <div className="spn-graph-flow" ref={canvasRef} tabIndex={0} onMouseDownCapture={event => { startCtrlMiddleZoom(event); startBoxSelection(event) }} onKeyDown={event => { if (event.key === 'Escape') cancelReconnect(); onGraphShortcut(event) }} onDrop={dropNode} onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'copy' }}>
      <ReactFlow nodes={flowNodes} edges={flowEdges} nodeTypes={NODE_TYPES} connectionMode={ConnectionMode.Loose} selectionKeyCode={null} multiSelectionKeyCode={null} elevateEdgesOnSelect={false} isValidConnection={isValidConnection} onConnectStart={startInputReconnect} onConnectEnd={finishInputReconnect} onReconnectStart={(_event, edge) => { reconnecting.current = { edgeId: edge.id, mode: 'edge' } }} onReconnect={reconnect} onReconnectEnd={finishReconnect} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={connect} onNodeClick={(event, node) => { setSelectedNodeId(node.id); const ids = event.shiftKey ? [...new Set([...selectedNodeIdsRef.current, node.id])] : [node.id]; selectedNodeIdsRef.current = ids; setSelectedNodeIds(ids) }} onPaneClick={() => { if (suppressPaneClick.current) { suppressPaneClick.current = false; return } setSelectedNodeId(null); selectedNodeIdsRef.current = []; selectedEdgeIdsRef.current = []; setSelectedNodeIds([]); setSelectedEdgeIds([]) }} onSelectionChange={({ edges }) => {
        if (diagnostics) console.count('[graph diagnostics] onSelectionChange')
        const edgeIds = edges.map((edge) => edge.id)
        if (!sameGraphSelection(selectedEdgeIdsRef.current, edgeIds)) { selectedEdgeIdsRef.current = edgeIds; setSelectedEdgeIds(edgeIds) }
      }} onMove={diagnostics ? () => console.count('[graph diagnostics] viewport onMove') : undefined} onNodeDragStart={() => beginMoveHistory()} onNodeDragStop={(_, node, movedNodes) => { const moved = movedNodes.length ? movedNodes : [node]; updatePositions(moveNodePositions(moved)); endMoveHistory(); setDragPositions((positions) => { const next = { ...positions }; for (const item of moved) delete next[item.id]; return next }) }} deleteKeyCode={['Backspace', 'Delete']} zoomOnScroll zoomOnPinch minZoom={.2} maxZoom={2.5} panOnDrag={[1]} panOnScroll={false} snapToGrid snapGrid={[20, 20]} fitView nodesConnectable nodesDraggable edgesReconnectable noWheelClassName="nowheel" noPanClassName="nopan" proOptions={{ hideAttribution: true }}>
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="var(--graph-grid-color)" />
      </ReactFlow>
      {selectionBox && <div aria-hidden="true" className={`spn-graph-selection-box is-${selectionBox.mode}`} style={{ left: selectionBox.rect.left - (canvasRef.current?.getBoundingClientRect().left ?? 0), top: selectionBox.rect.top - (canvasRef.current?.getBoundingClientRect().top ?? 0), width: selectionBox.rect.right - selectionBox.rect.left, height: selectionBox.rect.bottom - selectionBox.rect.top }} />}
      {graph.nodes.length === 0 && <div className="spn-graph-empty"><strong>Graph Canvas</strong><span>Add a node from the library or drag it here.</span></div>}
      <QuickUnits project={project} setProject={setProject} />
    </div>
    <GraphLog entries={log} />
  </div>
}

function QuickUnits({ project, setProject }: { project: ProjectWorkspaceData; setProject: (project: ProjectWorkspaceData) => void }) {
  const update = (key: 'force' | 'length', value: string) => setProject({ ...project, units: { ...project.units, [key]: value } })
  return <div className="spn-quick-units" aria-label="Quick Units"><label>Force <select value={project.units.force} onChange={event => update('force', event.target.value)}><option value="kN">kN</option><option value="N">N</option><option value="kgf">kgf</option><option value="tonf">tonf</option></select></label><label>Length <select value={project.units.length} onChange={event => update('length', event.target.value)}><option value="m">m</option><option value="cm">cm</option><option value="mm">mm</option></select></label></div>
}

function normalizeConnection(graph: KopruqGraph, connection: Pick<Connection, 'source' | 'target'> & { sourceHandle?: string | null; targetHandle?: string | null }): Omit<import('../domain/types').KopruqConnection, 'id'> | undefined {
  if (!connection.source || !connection.sourceHandle || !connection.target || !connection.targetHandle) return undefined
  const sourceNode = graph.nodes.find(node => node.id === connection.source)
  const targetNode = graph.nodes.find(node => node.id === connection.target)
  const sourceDefinition = sourceNode && getNodeDefinition(sourceNode.type)
  const targetDefinition = targetNode && getNodeDefinition(targetNode.type)
  if (sourceDefinition?.outputs.some(port => port.id === connection.sourceHandle) && targetDefinition?.inputs.some(port => port.id === connection.targetHandle)) {
    return { sourceNodeId: connection.source, sourcePortId: connection.sourceHandle, targetNodeId: connection.target, targetPortId: connection.targetHandle }
  }
  if (sourceDefinition?.inputs.some(port => port.id === connection.sourceHandle) && targetDefinition?.outputs.some(port => port.id === connection.targetHandle)) {
    return { sourceNodeId: connection.target, sourcePortId: connection.targetHandle, targetNodeId: connection.source, targetPortId: connection.sourceHandle }
  }
  return undefined
}

function graphExecutionSignature(graph: KopruqGraph) {
  return JSON.stringify({ id: graph.id, nodes: graph.nodes.map(({ id, type, parameters }) => ({ id, type, parameters })), connections: graph.connections })
}
