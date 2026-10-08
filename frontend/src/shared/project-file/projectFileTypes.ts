import type { PersistedProjectState } from '../../features/project/model/projectWorkspace'
import type { BridgeDefinitionStore } from '../../features/bridge-definition/model/types'
import type { GraphDocuments } from '../../features/graph/state/graphStore'

export const PROJECT_FILE_FORMAT = 'KOPRUQ_PROJECT'
export const PROJECT_FILE_SCHEMA_VERSION = 1
export type WindCalculationSnapshot = { schemaVersion: 1; status?: string; inputs: { vb: string; terrain: string; ze: string; deckWidthM: number; drefM: number }; result: unknown }
export type ProjectFile = { format: typeof PROJECT_FILE_FORMAT; schemaVersion: 1; applicationVersion: string; projectState: PersistedProjectState; bridgeDefinitions: BridgeDefinitionStore; graph: GraphDocuments; families: Record<string, unknown[]>; modules: Record<string, unknown> & { windLoads?: WindCalculationSnapshot } }
