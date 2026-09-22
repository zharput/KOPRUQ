import type { EngineeringQuantity } from './quantities'
export type GraphPortType = 'number' | 'integer' | 'numeric' | 'boolean' | 'string' | 'number[]' | 'integer[]' | 'numeric[]' | 'quantity' | 'quantity[]' | 'length' | 'length[]' | 'concreteMaterial' | 'reinforcementMaterial' | 'prestressingSteelMaterial' | 'structuralSteelMaterial' | 'pierCandidate[]' | 'pierCapCandidate[]' | 'foundationCandidate[]' | 'bearingCandidate[]' | 'girderCandidate[]' | 'superstructureCandidate[]' | 'abutmentCandidate[]' | 'bridgeAssembly' | 'display:any' | 'pierFamily' | 'foundationFamily' | 'bearingFamily' | 'bridge' | 'alignment' | 'geometry' | 'loadCase' | 'analysisModel' | 'analysisResult'
export interface MaterialValue { readonly domainType: 'ConcreteMaterial' | 'ReinforcementMaterial' | 'PrestressingSteelMaterial' | 'StructuralSteelMaterial'; readonly id: string; readonly name: string; readonly properties: Readonly<Record<string, EngineeringQuantity>> }
export interface PierCandidate { readonly id: string; readonly pierType: 'CIRCULAR' | 'RECTANGULAR' | 'OVAL' | 'BOX' | 'H_SECTION'; readonly geometry: Readonly<Record<string, number>>; readonly columnCount: 1 | 2; readonly heightM: number; readonly material: MaterialValue }
export interface PierCapCandidate { readonly id: string; readonly capType: 'RECTANGULAR' | 'T'; readonly geometry: Readonly<Record<string, number>>; readonly material: MaterialValue }
export interface FoundationCandidate { readonly id: string; readonly foundationType: 'SHALLOW' | 'PILED'; readonly geometry: Readonly<Record<string, number | Readonly<Record<string, number>>>>; readonly material: MaterialValue }
export interface BearingCandidate { readonly id: string; readonly bearingType: 'ELASTOMERIC'; readonly geometry: Readonly<{ lengthX: number; widthY: number; totalHeight: number }>; readonly stiffness: Readonly<{ kx: number; ky: number; kz: number; krx: number; kry: number; krz: number }> }
export type GraphValue = number | boolean | string | number[] | EngineeringQuantity | EngineeringQuantity[] | MaterialValue | PierCandidate | PierCandidate[] | PierCapCandidate | PierCapCandidate[] | FoundationCandidate | FoundationCandidate[] | BearingCandidate | BearingCandidate[] | import('./girderCandidates').GirderCandidate | import('./girderCandidates').GirderCandidate[] | import('./superstructureCandidates').SuperstructureCandidate | import('./superstructureCandidates').SuperstructureCandidate[] | import('./abutmentCandidates').AbutmentCandidate | import('./abutmentCandidates').AbutmentCandidate[] | import('./bridgeAssembly').BridgeAssembly
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
  resolvedInputs: Record<string, Record<string, GraphValue>>
  watchValues: Record<string, GraphValue>
  errors: Record<string, string>
  logs: { level: 'INFO' | 'ERROR'; message: string }[]
}

