import { createProjectModule } from '../../../shared/project-file/projectModuleStore'
import {
  SEISMIC_SERVER_SECTION, SELF_WEIGHT_SERVER_SECTION, TEMPERATURE_SERVER_SECTION, TRAFFIC_LM1_SERVER_SECTION, WIND_SERVER_SECTION, WIND_SNAPSHOT_SERVER_SECTION,
} from './loadsServerSections'

export const SEISMIC_INPUTS_MODULE = createProjectModule(SEISMIC_SERVER_SECTION)
export const WIND_INPUTS_MODULE = createProjectModule(WIND_SERVER_SECTION)
export const TEMPERATURE_INPUTS_MODULE = createProjectModule(TEMPERATURE_SERVER_SECTION)
export const SELF_WEIGHT_INPUTS_MODULE = createProjectModule(SELF_WEIGHT_SERVER_SECTION)
export const TRAFFIC_LM1_MODULE = createProjectModule(TRAFFIC_LM1_SERVER_SECTION)
/** The wind calculation snapshot, result included (stored as calculated; BACKEND-DB-PERSISTENCE m3b). */
export const WIND_SNAPSHOT_MODULE = createProjectModule(WIND_SNAPSHOT_SERVER_SECTION)
