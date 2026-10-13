import { GIRDER_LIBRARY_MODULE } from '../../features/family-registry/model/girderLibraryProjectModule'
import { PREFERRED_SPAN_RULES_MODULE } from '../../features/preferred-span/model/preferredSpanRulesProjectModule'
import { SEISMIC_INPUTS_MODULE, WIND_INPUTS_MODULE, TEMPERATURE_INPUTS_MODULE, SELF_WEIGHT_INPUTS_MODULE, TRAFFIC_LM1_MODULE } from '../../features/loads/model/loadsProjectModules'
import { CROSS_SECTION_VALUES_MODULE } from '../../features/superstructure-families/model/crossSectionProjectModule'

/**
 * Central list of project-scoped data that lives in localStorage and must travel with the
 * .kopruq file. Each module is defined (id, key, zod schema, custom write/reset) by the
 * feature that owns its data; this registry only fixes the file order and the labels.
 */
export const PROJECT_MODULES = {
  girderLibrary: GIRDER_LIBRARY_MODULE,
  preferredSpanRules: PREFERRED_SPAN_RULES_MODULE,
  seismicInputs: SEISMIC_INPUTS_MODULE,
  windInputs: WIND_INPUTS_MODULE,
  temperatureInputs: TEMPERATURE_INPUTS_MODULE,
  crossSectionValues: CROSS_SECTION_VALUES_MODULE,
  selfWeightInputs: SELF_WEIGHT_INPUTS_MODULE,
  trafficLm1: TRAFFIC_LM1_MODULE,
}
export type ProjectModules = typeof PROJECT_MODULES
export type ProjectModuleId = keyof ProjectModules
export const PROJECT_MODULE_IDS = Object.keys(PROJECT_MODULES) as ProjectModuleId[]

/** Human-readable module names for user-facing messages. */
export const PROJECT_MODULE_LABELS: Record<ProjectModuleId, string> = {
  girderLibrary: 'Girder library', preferredSpanRules: 'Preferred span rules', seismicInputs: 'Seismic inputs', windInputs: 'Wind inputs',
  temperatureInputs: 'Temperature inputs', crossSectionValues: 'Cross section', selfWeightInputs: 'Self weight', trafficLm1: 'Traffic LM1',
}
