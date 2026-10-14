import { z } from 'zod'

const number = z.number()
export const seismicInputsSchema = z.object({ a: z.string(), g: z.string(), t: z.string(), i: z.string() })
export const windInputsSchema = z.object({ vb: z.string(), terrain: z.string(), ze: z.string() })
export const temperatureInputsSchema = z.object({ min: z.string(), max: z.string(), t0: z.string() })
export const selfWeightInputsSchema = z.object({
  asphaltThicknessM: number, asphaltUnitWeightKNm3: number, sidewalkThicknessM: number, sidewalkUnitWeightKNm3: number,
  faciaCount: number, faciaWidthM: number, faciaThicknessM: number, faciaUnitWeightKNm3: number,
  guardrailCount: number, guardrailUnitLoadKNm: number, pedestrianRailingCount: number, pedestrianRailingUnitLoadKNm: number,
  protectiveFenceCount: number, protectiveFenceUnitLoadKNm: number, soundPanelCount: number, soundPanelUnitLoadKNm: number,
})

export type SeismicInputs = z.infer<typeof seismicInputsSchema>
export type WindInputs = z.infer<typeof windInputsSchema>
export type TemperatureInputs = z.infer<typeof temperatureInputsSchema>
export type SelfWeightInputs = z.infer<typeof selfWeightInputsSchema>
