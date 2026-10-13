import { describe, expect, it } from 'vitest'
import { GIRDER_LIBRARY_MODULE } from '../../features/family-registry'
import { PREFERRED_SPAN_RULES_MODULE } from '../../features/preferred-span'
import { SEISMIC_INPUTS_MODULE, SELF_WEIGHT_INPUTS_MODULE, TEMPERATURE_INPUTS_MODULE, TRAFFIC_LM1_MODULE, WIND_INPUTS_MODULE } from '../../features/loads/model/loadsProjectModules'
import { CROSS_SECTION_VALUES_MODULE } from '../../features/superstructure-families/model/crossSectionProjectModule'
import { PROJECT_MODULES, PROJECT_MODULE_IDS, PROJECT_MODULE_LABELS } from './projectModules'

describe('project module registry', () => {
  it('keeps the eight module ids in file order', () => {
    expect(PROJECT_MODULE_IDS).toEqual(['girderLibrary', 'preferredSpanRules', 'seismicInputs', 'windInputs', 'temperatureInputs', 'crossSectionValues', 'selfWeightInputs', 'trafficLm1'])
  })

  it('registers every module under its own id', () => {
    for (const id of PROJECT_MODULE_IDS) expect(PROJECT_MODULES[id].id).toBe(id)
  })

  it('keeps the legacy localStorage keys', () => {
    expect(PROJECT_MODULE_IDS.map(id => PROJECT_MODULES[id].key)).toEqual([
      'kopruq.girder-library.precast',
      'kopruq.project-design-system.girder-span-rules',
      'kopruq.seismic',
      'kopruq.wind-load.inputs',
      'kopruq.uniform-temperature.inputs',
      'kopruq.superstructure.cross-section.v1',
      'kopruq.loads.self-weight.v1',
      'kopruq.loads.traffic-lm1.v1',
    ])
  })

  it('holds the same module instances the owning features export', () => {
    expect(PROJECT_MODULES.girderLibrary).toBe(GIRDER_LIBRARY_MODULE)
    expect(PROJECT_MODULES.preferredSpanRules).toBe(PREFERRED_SPAN_RULES_MODULE)
    expect(PROJECT_MODULES.seismicInputs).toBe(SEISMIC_INPUTS_MODULE)
    expect(PROJECT_MODULES.windInputs).toBe(WIND_INPUTS_MODULE)
    expect(PROJECT_MODULES.temperatureInputs).toBe(TEMPERATURE_INPUTS_MODULE)
    expect(PROJECT_MODULES.crossSectionValues).toBe(CROSS_SECTION_VALUES_MODULE)
    expect(PROJECT_MODULES.selfWeightInputs).toBe(SELF_WEIGHT_INPUTS_MODULE)
    expect(PROJECT_MODULES.trafficLm1).toBe(TRAFFIC_LM1_MODULE)
  })

  it('has a label for every module', () => {
    expect(Object.keys(PROJECT_MODULE_LABELS)).toEqual([...PROJECT_MODULE_IDS])
    expect(PROJECT_MODULE_LABELS.trafficLm1).toBe('Traffic LM1')
  })
})
