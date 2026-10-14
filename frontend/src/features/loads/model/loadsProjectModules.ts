import { z } from 'zod'
import { createProjectModule } from '../../../shared/project-file/projectModuleStore'
import type { Lm1Parameters } from '../api/trafficLoadsService'
import { seismicInputsSchema, selfWeightInputsSchema, temperatureInputsSchema, windInputsSchema } from './loadsInputs'

const trafficLm1Schema = z.object({ tandemSystem: z.array(z.unknown()), udl: z.array(z.unknown()), remainingAreaUdl: z.object({}).passthrough() }).passthrough() as unknown as z.ZodType<Lm1Parameters>

export const SEISMIC_INPUTS_MODULE = createProjectModule('seismicInputs', 'kopruq.seismic', seismicInputsSchema)
export const WIND_INPUTS_MODULE = createProjectModule('windInputs', 'kopruq.wind-load.inputs', windInputsSchema)
export const TEMPERATURE_INPUTS_MODULE = createProjectModule('temperatureInputs', 'kopruq.uniform-temperature.inputs', temperatureInputsSchema)
export const SELF_WEIGHT_INPUTS_MODULE = createProjectModule('selfWeightInputs', 'kopruq.loads.self-weight.v1', selfWeightInputsSchema)
export const TRAFFIC_LM1_MODULE = createProjectModule('trafficLm1', 'kopruq.loads.traffic-lm1.v1', trafficLm1Schema)
