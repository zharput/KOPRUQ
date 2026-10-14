import { createActiveSection } from '../../../shared/project-store/activeProject'
import { BRIDGE_DEFINITIONS_SECTION } from './bridgeDefinitionWire'

/** Server section instance of the bridge definitions (M5b: not wired into the application yet). */
export const BRIDGE_DEFINITIONS_SERVER_SECTION = createActiveSection(BRIDGE_DEFINITIONS_SECTION)
