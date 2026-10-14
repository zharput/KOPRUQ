import { createActiveSection } from '../../../shared/project-store/activeProject'
import { CROSS_SECTION_SECTION } from './crossSectionWire'

/** Server section instance of the cross-section values (the data store of the feature since M5c). */
export const CROSS_SECTION_SERVER_SECTION = createActiveSection(CROSS_SECTION_SECTION)
