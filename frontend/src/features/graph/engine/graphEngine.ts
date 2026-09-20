import type { GraphExecutionResult, GraphPortType, GraphValue, SpanovaConnection, SpanovaGraph } from '../domain/types'
import { canConnect, getNodeDefinition, type GraphExecutionServices } from '../registry/nodeRegistry'
import { resolveEngineeringInput } from '../domain/engineeringInputs'

export type GraphValidationIssue = { nodeId?: string; message: string }

export function validateConnection(graph: SpanovaGraph, connection: Omit<SpanovaConnection, 'id'>): GraphValidationIssue | undefined {
  const source = graph.nodes.find((node) => node.id === connection.sourceNodeId)
  const target = graph.nodes.find((node) => node.id === connection.targetNodeId)
  const sourcePort = source && getNodeDefinition(source.type)?.outputs.find((port) => port.id === connection.sourcePortId)
  const targetDefinition = target && getNodeDefinition(target.type)
  const targetPort = targetDefinition?.inputs.find((port) => port.id === connection.targetPortId)
  if (!source || !target || !sourcePort || !targetPort) return { message: 'The selected connection ports are unavailable.' }
  const rawSourceKind = ['quantity', 'quantity[]', 'length', 'length[]', 'numeric[]', 'number[]'].includes(sourcePort.type)
    ? (sourcePort.quantityKind ?? source.parameters.quantityKind) as import('../domain/quantities').QuantityKind
    : undefined
  const sourceKind = rawSourceKind === 'dimensionless' ? undefined : rawSourceKind
    const targetKind = targetPort.quantityKind ?? (targetPort.type === 'length' || targetPort.type === 'length[]' ? 'length' : undefined)
    const rangeKind = target.type === 'input.range' ? target.parameters.quantityKind as import('../domain/quantities').QuantityKind | undefined : undefined
    if (rangeKind && rawSourceKind && rawSourceKind !== rangeKind) return { nodeId: target.id, message: `Range inputs require ${rangeKind} values.` }
  const acceptsMathList = target.type.startsWith('math.') && targetPort.type === 'numeric' && ['number[]','integer[]','numeric[]','quantity[]','length[]'].includes(sourcePort.type)
    if (!acceptsMathList && !canConnect(sourcePort.type, targetPort.type, sourceKind, targetKind)) return { nodeId: target.id, message: targetKind === 'length' && !sourceKind ? 'ERROR: This input requires a Length value. Connect a Length node.' : sourceKind && targetKind ? `Cannot connect ${sourceKind} to ${targetKind}.` : `Cannot connect ${sourcePort.type} to ${targetPort.type === 'numeric' ? 'number/quantity' : targetPort.type}.` }
  const operation = target.type
  const existingEdge = graph.connections.find(edge => edge.targetNodeId === target.id && edge.targetPortId !== targetPort.id)
  const existingSource = existingEdge && graph.nodes.find(node => node.id === existingEdge.sourceNodeId)
  const existingPort = existingSource && getNodeDefinition(existingSource.type)?.outputs.find(port => port.id === existingEdge.sourcePortId)
  const rawExistingKind = existingSource && existingPort && ['quantity','quantity[]','numeric[]','number[]','integer[]'].includes(existingPort.type) ? existingSource.parameters.quantityKind as import('../domain/quantities').QuantityKind : undefined
  const existingKind = rawExistingKind === 'dimensionless' ? undefined : rawExistingKind
  if ((operation === 'math.add' || operation === 'math.subtract') && existingEdge && ((sourceKind && !existingKind) || (!sourceKind && existingKind) || (sourceKind && existingKind && sourceKind !== existingKind))) return { nodeId: target.id, message: 'Addition and subtraction require two quantities of the same kind, or two dimensionless numbers.' }
  if ((operation === 'math.multiply' || operation === 'math.divide') && sourceKind && existingKind) return { nodeId: target.id, message: 'Multiplication and division of two quantities are not supported yet.' }
  if (operation === 'math.divide' && targetPort.id === 'a' && existingKind) return { nodeId: target.id, message: 'A quantity divisor is not supported; divide a quantity by a dimensionless number.' }
  if (operation === 'math.divide' && targetPort.id === 'b' && sourceKind) return { nodeId: target.id, message: 'A quantity may only be divided by a dimensionless number.' }
  if (graph.connections.some((edge) => edge.targetNodeId === target.id && edge.targetPortId === targetPort.id)) return { nodeId: target.id, message: `Input ${targetPort.label} already has a connection.` }
  return undefined
}

export function validateGraph(graph: SpanovaGraph): GraphValidationIssue[] {
  const issues: GraphValidationIssue[] = []
  const nodeIds = new Set(graph.nodes.map((node) => node.id))
  for (const node of graph.nodes) {
    const definition = getNodeDefinition(node.type)
    if (!definition) { issues.push({ nodeId: node.id, message: `Unknown node type: ${node.type}.` }); continue }
    const knownParameters = new Set(definition.parameterSchema.map((parameter) => parameter.key))
    for (const key of Object.keys(node.parameters)) if (!knownParameters.has(key)) issues.push({ nodeId: node.id, message: `Unknown parameter: ${key}.` })
    const rangeOverrides = node.type === 'input.range' ? new Set(graph.connections.filter(edge => edge.targetNodeId === node.id).map(edge => edge.targetPortId)) : undefined
    const parameters = rangeOverrides?.size ? { ...node.parameters, min: 0, max: 0, step: 1 } : node.parameters
    for (const message of definition.validateParameters(parameters)) issues.push({ nodeId: node.id, message })
    for (const port of definition.inputs) if (port.required && !graph.connections.some((edge) => edge.targetNodeId === node.id && edge.targetPortId === port.id)) issues.push({ nodeId: node.id, message: `Input ${port.label} is not connected.` })
  }
  for (const edge of graph.connections) {
    if (!nodeIds.has(edge.sourceNodeId) || !nodeIds.has(edge.targetNodeId)) { issues.push({ message: `Connection ${edge.id} refers to a missing node.` }); continue }
    const issue = validateConnection({ ...graph, connections: graph.connections.filter((item) => item.id !== edge.id) }, edge)
    if (issue) issues.push(issue)
  }
  if (hasCycle(graph.nodes.map((node) => node.id), graph.connections)) issues.push({ message: `Cycle detected: ${findCycle(graph.nodes.map((node) => node.id), graph.connections).join(' → ')}.` })
  return issues
}

export function topologicalSort(graph: SpanovaGraph): string[] {
  const indegree = new Map(graph.nodes.map((node) => [node.id, 0]))
  const outgoing = new Map(graph.nodes.map((node) => [node.id, [] as string[]]))
  graph.connections.forEach((edge) => { if (indegree.has(edge.sourceNodeId) && indegree.has(edge.targetNodeId)) { indegree.set(edge.targetNodeId, indegree.get(edge.targetNodeId)! + 1); outgoing.get(edge.sourceNodeId)!.push(edge.targetNodeId) } })
  const queue = [...indegree].filter(([, degree]) => degree === 0).map(([id]) => id)
  const ordered: string[] = []
  while (queue.length) { const id = queue.shift()!; ordered.push(id); for (const target of outgoing.get(id)!) { indegree.set(target, indegree.get(target)! - 1); if (indegree.get(target) === 0) queue.push(target) } }
  if (ordered.length !== graph.nodes.length) throw new Error(`Cycle detected: ${findCycle(graph.nodes.map((node) => node.id), graph.connections).join(' → ')}.`)
  return ordered
}

export async function executeGraph(graph: SpanovaGraph, signal?: AbortSignal, services?: GraphExecutionServices): Promise<GraphExecutionResult> {
  const issues = validateGraph(graph)
  const result: GraphExecutionResult = { values: {}, resolvedInputs: {}, watchValues: {}, errors: {}, logs: [] }
  if (issues.length) {
    for (const issue of issues) { if (issue.nodeId) result.errors[issue.nodeId] = [result.errors[issue.nodeId], issue.message].filter(Boolean).join(' '); result.logs.push({ level: 'ERROR', message: issue.nodeId ? `${graph.nodes.find((node) => node.id === issue.nodeId)?.name ?? issue.nodeId}: ${issue.message}` : issue.message }) }
    return result
  }
  result.logs.push({ level: 'INFO', message: 'Graph execution started.' })
  const order = topologicalSort(graph)
  for (const id of order) {
    if (signal?.aborted) { result.logs.push({ level: 'INFO', message: 'Graph execution stopped.' }); return result }
    const node = graph.nodes.find((item) => item.id === id)!
    const definition = getNodeDefinition(node.type)!
    try {
      const inputs: Record<string, GraphValue> = {}
      for (const edge of graph.connections.filter((item) => item.targetNodeId === id)) {
        const value = result.values[edge.sourceNodeId]?.[edge.sourcePortId]
        const targetPort = definition.inputs.find((port) => port.id === edge.targetPortId)
        if (value !== undefined && targetPort) {
          const resolved = resolveEngineeringInput(value, targetPort, services?.projectUnits)
          inputs[edge.targetPortId] = resolved
          result.resolvedInputs[id] = { ...result.resolvedInputs[id], [edge.targetPortId]: resolved }
        }
      }
      const outputs = await definition.executor({ node, inputs, services })
      result.values[id] = outputs
      if (node.type === 'output.watch' && outputs.value !== undefined) result.watchValues[id] = outputs.value
      const shown = Object.values(outputs).map(formatValue).join(', ')
      result.logs.push({ level: 'INFO', message: `${node.name}${shown ? ` = ${shown}` : ' executed'}.` })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Node execution failed.'
      result.errors[id] = message
      result.logs.push({ level: 'ERROR', message: `${node.name}: ${message}` })
      return result
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 0))
  }
  result.logs.push({ level: 'INFO', message: 'Graph execution completed.' })
  return result
}

function hasCycle(ids: string[], connections: SpanovaConnection[]) { try { topologicalSort({ id: '', name: '', schemaVersion: 1, nodes: ids.map((id) => ({ id, type: '', name: id, position: { x: 0, y: 0 }, parameters: {} })), connections }); return false } catch { return true } }
function findCycle(ids: string[], connections: SpanovaConnection[]): string[] {
  const adjacency = new Map(ids.map((id) => [id, [] as string[]]))
  connections.forEach((edge) => adjacency.get(edge.sourceNodeId)?.push(edge.targetNodeId))
  const visiting = new Set<string>(), visited = new Set<string>(), path: string[] = []
  const visit = (id: string): string[] | undefined => {
    if (visiting.has(id)) return [...path.slice(path.indexOf(id)), id]
    if (visited.has(id)) return undefined
    visiting.add(id); path.push(id)
    for (const next of adjacency.get(id) ?? []) { const cycle = visit(next); if (cycle) return cycle }
    path.pop(); visiting.delete(id); visited.add(id); return undefined
  }
  for (const id of ids) { const cycle = visit(id); if (cycle) return cycle }
  return []
}
export function portCanConnect(source: GraphPortType, target: GraphPortType) { return canConnect(source, target) }
function formatValue(value: GraphValue): string { if(Array.isArray(value))return `[${value.slice(0,5).map(formatValue).join(', ')}${value.length>5?', …':''}]${value.length>5?` (${value.length} items)`:''}`; if(typeof value==='object'&&value!==null&&'quantityKind' in value)return `${value.value} ${value.quantityKind}`; if(typeof value==='object'&&value!==null&&'domainType' in value)return `${value.domainType} ${value.name}`; if(typeof value==='object'&&value!==null&&'pierType' in value)return `${value.pierType} Pier ${JSON.stringify(value.geometry)}`; return String(value) }
