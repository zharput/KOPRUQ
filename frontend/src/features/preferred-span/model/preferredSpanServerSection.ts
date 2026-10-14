import { createActiveSection } from '../../../shared/project-store/activeProject'
import { PREFERRED_SPAN_RULES_SECTION } from './preferredSpanWire'

/** Server section instance of the preferred span rules (M5b: not wired into the application yet). */
export const PREFERRED_SPAN_RULES_SERVER_SECTION = createActiveSection(PREFERRED_SPAN_RULES_SECTION)
