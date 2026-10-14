import { createActiveSection } from '../../../shared/project-store/activeProject'
import { BRIDGE_DEFINITIONS_SECTION } from './bridgeDefinitionWire'

/** Server section instance of the bridge definitions (the data store of the feature since M5c). */
export const BRIDGE_DEFINITIONS_SERVER_SECTION = createActiveSection(BRIDGE_DEFINITIONS_SECTION)
