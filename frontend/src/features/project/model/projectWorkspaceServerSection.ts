import { createActiveSection } from '../../../shared/project-store/activeProject'
import { WORKSPACE_SECTION } from './projectWorkspaceWire'

/** Server section instance of the project workspace (M5b: not wired into the application yet). */
export const WORKSPACE_SERVER_SECTION = createActiveSection(WORKSPACE_SECTION)
