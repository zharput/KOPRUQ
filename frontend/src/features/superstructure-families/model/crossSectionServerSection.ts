import { createActiveSection } from '../../../shared/project-store/activeProject'
import { CROSS_SECTION_SECTION } from './crossSectionWire'

/** Server section instance of the cross-section values (M5b: not wired into the application yet). */
export const CROSS_SECTION_SERVER_SECTION = createActiveSection(CROSS_SECTION_SECTION)
