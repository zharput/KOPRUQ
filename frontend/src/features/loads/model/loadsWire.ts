import { z } from 'zod'
import type { SectionDefinition } from '../../../shared/project-store/serverSection'
import type { Lm1Parameters, LaneFactor, ParameterValue } from '../api/trafficLoadsService'
import type { SEISMIC_INPUTS_MODULE, SELF_WEIGHT_INPUTS_MODULE, TEMPERATURE_INPUTS_MODULE, WIND_INPUTS_MODULE } from './loadsProjectModules'
import type { WindCalculationSnapshot } from './windTypes'

/**
 * Wire mapping of the six load-input sections (`PUT /loads/*`). Source of the shapes: backend `LoadInputDtos` and `LoadsDto`
 * (key order follows the record components). Seismic, wind and temperature inputs are the texts the user typed, unchanged.
 * Self-weight names carry their units (m, kN/m3, kN/m); nothing is converted.
 */
export type SeismicInputs = NonNullable<ReturnType<typeof SEISMIC_INPUTS_MODULE.read>>
export type WindInputs = NonNullable<ReturnType<typeof WIND_INPUTS_MODULE.read>>
export type TemperatureInputs = NonNullable<ReturnType<typeof TEMPERATURE_INPUTS_MODULE.read>>
export type SelfWeightInputs = NonNullable<ReturnType<typeof SELF_WEIGHT_INPUTS_MODULE.read>>
/** A wind snapshot without its calculation result: the backend stores the inputs only. */
export type WindSnapshotInputsValue = Omit<WindCalculationSnapshot, 'result'>

const text = z.string()
const number = z.number()

export const seismicWireSchema = z.object({ a: text, g: text, t: text, i: text }).strict()
export const windWireSchema = z.object({ vb: text, terrain: text, ze: text }).strict()
export const temperatureWireSchema = z.object({ min: text, max: text, t0: text }).strict()
export const selfWeightWireSchema = z.object({
  asphaltThicknessM: number, asphaltUnitWeightKNm3: number, sidewalkThicknessM: number, sidewalkUnitWeightKNm3: number, faciaCount: number, faciaWidthM: number,
  faciaThicknessM: number, faciaUnitWeightKNm3: number, guardrailCount: number, guardrailUnitLoadKNm: number, pedestrianRailingCount: number,
  pedestrianRailingUnitLoadKNm: number, protectiveFenceCount: number, protectiveFenceUnitLoadKNm: number, soundPanelCount: number, soundPanelUnitLoadKNm: number,
}).strict()
const parameterValue = z.object({ value: number.nullable(), provenance: z.enum(['CODE_DEFAULT', 'NATIONAL_ANNEX', 'PROJECT_OVERRIDE']), codeDefaultValue: number.nullable() }).strict()
const laneFactor = z.object({ label: text, characteristicValue: parameterValue, adjustmentFactor: parameterValue }).strict()
export const trafficLm1WireSchema = z.object({ tandemSystem: z.array(laneFactor), udl: z.array(laneFactor), remainingAreaUdl: laneFactor }).strict()
export const windSnapshotWireSchema = z.object({
  schemaVersion: z.literal(1), status: text.nullable(),
  inputs: z.object({ vb: text, terrain: text, ze: text, deckWidthM: number, drefM: number }).strict(),
}).strict()

export type SeismicWire = z.infer<typeof seismicWireSchema>
export type WindWire = z.infer<typeof windWireSchema>
export type TemperatureWire = z.infer<typeof temperatureWireSchema>
export type SelfWeightWire = z.infer<typeof selfWeightWireSchema>
export type TrafficLm1Wire = z.infer<typeof trafficLm1WireSchema>
export type WindSnapshotWire = z.infer<typeof windSnapshotWireSchema>

export const loadsWireSchema = z.object({
  seismic: seismicWireSchema.nullable(), wind: windWireSchema.nullable(), temperature: temperatureWireSchema.nullable(),
  selfWeight: selfWeightWireSchema.nullable(), trafficLm1: trafficLm1WireSchema.nullable(), windSnapshot: windSnapshotWireSchema.nullable(),
}).strict()
export type LoadsWire = z.infer<typeof loadsWireSchema>

export const seismicToWire = (v: SeismicInputs): SeismicWire => ({ a: v.a, g: v.g, t: v.t, i: v.i })
export const seismicFromWire = (w: SeismicWire): SeismicInputs => ({ a: w.a, g: w.g, t: w.t, i: w.i })
export const windToWire = (v: WindInputs): WindWire => ({ vb: v.vb, terrain: v.terrain, ze: v.ze })
export const windFromWire = (w: WindWire): WindInputs => ({ vb: w.vb, terrain: w.terrain, ze: w.ze })
export const temperatureToWire = (v: TemperatureInputs): TemperatureWire => ({ min: v.min, max: v.max, t0: v.t0 })
export const temperatureFromWire = (w: TemperatureWire): TemperatureInputs => ({ min: w.min, max: w.max, t0: w.t0 })
export const selfWeightToWire = (v: SelfWeightInputs): SelfWeightWire => ({
  asphaltThicknessM: v.asphaltThicknessM, asphaltUnitWeightKNm3: v.asphaltUnitWeightKNm3, sidewalkThicknessM: v.sidewalkThicknessM, sidewalkUnitWeightKNm3: v.sidewalkUnitWeightKNm3,
  faciaCount: v.faciaCount, faciaWidthM: v.faciaWidthM, faciaThicknessM: v.faciaThicknessM, faciaUnitWeightKNm3: v.faciaUnitWeightKNm3, guardrailCount: v.guardrailCount,
  guardrailUnitLoadKNm: v.guardrailUnitLoadKNm, pedestrianRailingCount: v.pedestrianRailingCount, pedestrianRailingUnitLoadKNm: v.pedestrianRailingUnitLoadKNm,
  protectiveFenceCount: v.protectiveFenceCount, protectiveFenceUnitLoadKNm: v.protectiveFenceUnitLoadKNm, soundPanelCount: v.soundPanelCount, soundPanelUnitLoadKNm: v.soundPanelUnitLoadKNm,
})
export const selfWeightFromWire = (w: SelfWeightWire): SelfWeightInputs => selfWeightToWire(w)

const parameterToWire = (p: ParameterValue) => ({ value: p.value ?? null, provenance: p.provenance, codeDefaultValue: p.codeDefaultValue ?? null })
const laneToWire = (l: LaneFactor) => ({ label: l.label, characteristicValue: parameterToWire(l.characteristicValue), adjustmentFactor: parameterToWire(l.adjustmentFactor) })
export const trafficLm1ToWire = (v: Lm1Parameters): TrafficLm1Wire => ({ tandemSystem: v.tandemSystem.map(laneToWire), udl: v.udl.map(laneToWire), remainingAreaUdl: laneToWire(v.remainingAreaUdl) })
export const trafficLm1FromWire = (w: TrafficLm1Wire): Lm1Parameters => trafficLm1ToWire(w)

/** `result` is dropped on the way out; a missing `status` is sent as null. */
export const windSnapshotToWire = (v: WindSnapshotInputsValue): WindSnapshotWire => ({
  schemaVersion: 1, status: v.status ?? null,
  inputs: { vb: v.inputs.vb, terrain: v.inputs.terrain, ze: v.inputs.ze, deckWidthM: v.inputs.deckWidthM, drefM: v.inputs.drefM },
})
/** No `result` is invented: the snapshot comes back without one (the caller recalculates or shows "not calculated"). */
export const windSnapshotFromWire = (w: WindSnapshotWire): WindSnapshotInputsValue => ({
  schemaVersion: 1, ...(w.status !== null && { status: w.status }),
  inputs: { vb: w.inputs.vb, terrain: w.inputs.terrain, ze: w.inputs.ze, deckWidthM: w.inputs.deckWidthM, drefM: w.inputs.drefM },
})

function loadSection<T, W>(id: string, path: string, schema: z.ZodType<W, z.ZodTypeDef, unknown>, toWire: (value: T) => W, fromWire: (wire: W) => T): SectionDefinition<T, W> {
  return { id, path, codec: { schema: schema.nullable(), clearable: true, toWire, fromWire: (wire) => wire === null ? undefined : fromWire(wire) } }
}

export const SEISMIC_SECTION = loadSection<SeismicInputs, SeismicWire>('seismicInputs', 'loads/seismic', seismicWireSchema, seismicToWire, seismicFromWire)
export const WIND_SECTION = loadSection<WindInputs, WindWire>('windInputs', 'loads/wind', windWireSchema, windToWire, windFromWire)
export const TEMPERATURE_SECTION = loadSection<TemperatureInputs, TemperatureWire>('temperatureInputs', 'loads/temperature', temperatureWireSchema, temperatureToWire, temperatureFromWire)
export const SELF_WEIGHT_SECTION = loadSection<SelfWeightInputs, SelfWeightWire>('selfWeightInputs', 'loads/self-weight', selfWeightWireSchema, selfWeightToWire, selfWeightFromWire)
export const TRAFFIC_LM1_SECTION = loadSection<Lm1Parameters, TrafficLm1Wire>('trafficLm1', 'loads/traffic-lm1', trafficLm1WireSchema, trafficLm1ToWire, trafficLm1FromWire)
export const WIND_SNAPSHOT_SECTION = loadSection<WindSnapshotInputsValue, WindSnapshotWire>('windSnapshot', 'loads/wind-snapshot', windSnapshotWireSchema, windSnapshotToWire, windSnapshotFromWire)
