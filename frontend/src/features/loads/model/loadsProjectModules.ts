import { z } from 'zod'
import { createProjectModule } from '../../../shared/project-file/projectModuleStore'
import type { Lm1Parameters } from '../api/trafficLoadsService'

const number = z.number()
const seismicInputsSchema = z.object({ a: z.string(), g: z.string(), t: z.string(), i: z.string() })
const windInputsSchema = z.object({ vb: z.string(), terrain: z.string(), ze: z.string() })
const temperatureInputsSchema = z.object({ min: z.string(), max: z.string(), t0: z.string() })
const selfWeightInputsSchema = z.object({
  asphaltThicknessM: number, asphaltUnitWeightKNm3: number, sidewalkThicknessM: number, sidewalkUnitWeightKNm3: number,
  faciaCount: number, faciaWidthM: number, faciaThicknessM: number, faciaUnitWeightKNm3: number,
  guardrailCount: number, guardrailUnitLoadKNm: number, pedestrianRailingCount: number, pedestrianRailingUnitLoadKNm: number,
  protectiveFenceCount: number, protectiveFenceUnitLoadKNm: number, soundPanelCount: number, soundPanelUnitLoadKNm: number,
})
const trafficLm1Schema = z.object({ tandemSystem: z.array(z.unknown()), udl: z.array(z.unknown()), remainingAreaUdl: z.object({}).passthrough() }).passthrough() as unknown as z.ZodType<Lm1Parameters>

export const SEISMIC_INPUTS_MODULE = createProjectModule('seismicInputs', 'kopruq.seismic', seismicInputsSchema)
export const WIND_INPUTS_MODULE = createProjectModule('windInputs', 'kopruq.wind-load.inputs', windInputsSchema)
export const TEMPERATURE_INPUTS_MODULE = createProjectModule('temperatureInputs', 'kopruq.uniform-temperature.inputs', temperatureInputsSchema)
export const SELF_WEIGHT_INPUTS_MODULE = createProjectModule('selfWeightInputs', 'kopruq.loads.self-weight.v1', selfWeightInputsSchema)
export const TRAFFIC_LM1_MODULE = createProjectModule('trafficLm1', 'kopruq.loads.traffic-lm1.v1', trafficLm1Schema)
