import type { EngineeringQuantity } from './quantities'
export type GraphPortType = 'number' | 'integer' | 'numeric' | 'boolean' | 'string' | 'number[]' | 'integer[]' | 'numeric[]' | 'quantity' | 'quantity[]' | 'concreteMaterial' | 'reinforcementMaterial' | 'prestressingSteelMaterial' | 'structuralSteelMaterial' | 'display:any' | 'pierFamily' | 'foundationFamily' | 'bearingFamily' | 'bridge' | 'alignment' | 'geometry' | 'loadCase' | 'analysisModel' | 'analysisResult'
export interface MaterialValue { readonly domainType: 'ConcreteMaterial' | 'ReinforcementMaterial' | 'PrestressingSteelMaterial' | 'StructuralSteelMaterial'; readonly id: string; readonly name: string; readonly properties: Readonly<Record<string, EngineeringQuantity>> }
export type GraphValue = number | boolean | string | number[] | EngineeringQuantity | EngineeringQuantity[] | MaterialValue
export type GraphExecutionState = 'idle' | 'running' | 'success' | 'error'
export type GraphNodePosition = { x: number; y: number }
export type GraphParameterValue = number | boolean | string | number[]

export interface SpanovaNode {
  id: string
  type: string
  name: string
  position: GraphNodePosition
  parameters: Record<string, GraphParameterValue>
}

export interface SpanovaConnection {
  id: string
  sourceNodeId: string
  sourcePortId: string
  targetNodeId: string
  targetPortId: string
}

export interface SpanovaGraph {
  id: string
  name: string
  schemaVersion: 1
  nodes: SpanovaNode[]
  connections: SpanovaConnection[]
}

export interface GraphExecutionResult {
  values: Record<string, Record<string, GraphValue>>
  watchValues: Record<string, GraphValue>
  errors: Record<string, string>
  logs: { level: 'INFO' | 'ERROR'; message: string }[]
}
