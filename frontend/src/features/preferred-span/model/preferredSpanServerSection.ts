import { createActiveSection } from '../../../shared/project-store/activeProject'
import { PREFERRED_SPAN_RULES_SECTION } from './preferredSpanWire'

/** Server section instance of the preferred span rules (the data store of the feature since M5c). */
export const PREFERRED_SPAN_RULES_SERVER_SECTION = createActiveSection(PREFERRED_SPAN_RULES_SECTION)
