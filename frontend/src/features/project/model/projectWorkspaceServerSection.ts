import { createActiveSection } from '../../../shared/project-store/activeProject'
import { WORKSPACE_SECTION } from './projectWorkspaceWire'

/** Server section instance of the project workspace (the data store of the feature since M5c). */
export const WORKSPACE_SERVER_SECTION = createActiveSection(WORKSPACE_SECTION)
