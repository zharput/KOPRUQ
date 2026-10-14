import { createActiveSection } from '../../../shared/project-store/activeProject'
import {
  SEISMIC_SECTION, SELF_WEIGHT_SECTION, TEMPERATURE_SECTION, TRAFFIC_LM1_SECTION, WIND_SECTION, WIND_SNAPSHOT_SECTION,
} from './loadsWire'

/** Server section instances of the six load-input sections (M5b: not wired into the application yet). */
export const SEISMIC_SERVER_SECTION = createActiveSection(SEISMIC_SECTION)
export const WIND_SERVER_SECTION = createActiveSection(WIND_SECTION)
export const TEMPERATURE_SERVER_SECTION = createActiveSection(TEMPERATURE_SECTION)
export const SELF_WEIGHT_SERVER_SECTION = createActiveSection(SELF_WEIGHT_SECTION)
export const TRAFFIC_LM1_SERVER_SECTION = createActiveSection(TRAFFIC_LM1_SECTION)
export const WIND_SNAPSHOT_SERVER_SECTION = createActiveSection(WIND_SNAPSHOT_SECTION)
