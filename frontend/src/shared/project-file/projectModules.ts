import { z } from 'zod'
import type { PreferredSpanRule } from '../../features/preferred-span/model/types'
import type { Lm1Parameters } from '../../features/loads/api/trafficLoadsService'
import { PRECAST_GIRDER_STORAGE_KEY, savePrecastGirderDefinition } from '../../features/family-registry/model/familyRepository'
import { PROJECT_DATA_CHANGED_EVENT } from './projectDataEvents'

/**
 * Single list of project-scoped data that lives in localStorage and must travel
 * with the .kopruq file. Every module has a zod schema (`parse` throws when the
 * value is invalid) and tolerant `read` (corrupt or invalid storage -> undefined).
 * `write` and `reset` emit `kopruq:project-data-changed` (dirty tracking) and
 * `kopruq:project-module-changed` (subscribers such as `useProjectModule`).
 */
export const PROJECT_MODULE_CHANGED_EVENT = 'kopruq:project-module-changed'

const number = z.number()
const girderLibrarySchema = z.union([z.array(z.unknown()), z.object({}).passthrough()])
const preferredSpanRulesSchema = z.array(z.object({ id: z.string(), superstructureType: z.string(), girderVariantId: z.string(), minSpan: number, maxSpan: number, spanDelta: number, primarySpan: number, enabled: z.boolean(), source: z.string() }).passthrough()) as unknown as z.ZodType<PreferredSpanRule[]>
const seismicInputsSchema = z.object({ a: z.string(), g: z.string(), t: z.string(), i: z.string() })
const windInputsSchema = z.object({ vb: z.string(), terrain: z.string(), ze: z.string() })
const temperatureInputsSchema = z.object({ min: z.string(), max: z.string(), t0: z.string() })
const crossSectionValuesSchema = z.object({ platformWidthM: number, leftWalkwayM: number, rightWalkwayM: number, spaceOfGirderM: number, numberOfGirders: number })
const selfWeightInputsSchema = z.object({
  asphaltThicknessM: number, asphaltUnitWeightKNm3: number, sidewalkThicknessM: number, sidewalkUnitWeightKNm3: number,
  faciaCount: number, faciaWidthM: number, faciaThicknessM: number, faciaUnitWeightKNm3: number,
  guardrailCount: number, guardrailUnitLoadKNm: number, pedestrianRailingCount: number, pedestrianRailingUnitLoadKNm: number,
  protectiveFenceCount: number, protectiveFenceUnitLoadKNm: number, soundPanelCount: number, soundPanelUnitLoadKNm: number,
})
const trafficLm1Schema = z.object({ tandemSystem: z.array(z.unknown()), udl: z.array(z.unknown()), remainingAreaUdl: z.object({}).passthrough() }).passthrough() as unknown as z.ZodType<Lm1Parameters>

export type ProjectModule<T> = {
  id: string
  key: string
  parse(value: unknown): T
  read(): T | undefined
  write(value: T): boolean
  reset(): void
}

function emit(id: string) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(PROJECT_MODULE_CHANGED_EVENT, { detail: { id } }))
  window.dispatchEvent(new CustomEvent(PROJECT_DATA_CHANGED_EVENT, { detail: { source: 'module', id } }))
}

function createModule<S extends z.ZodTypeAny>(id: string, key: string, schema: S, custom?: { write?: (value: z.infer<S>) => boolean; reset?: () => boolean }): ProjectModule<z.infer<S>> {
  type T = z.infer<S>
  const parse = (value: unknown): T => schema.parse(value)
  const read = (): T | undefined => {
    try {
      const raw = localStorage.getItem(key)
      if (raw == null) return undefined
      const result = schema.safeParse(JSON.parse(raw))
      return result.success ? result.data : undefined
    } catch { return undefined }
  }
  const write = (value: T): boolean => {
    try {
      const text = JSON.stringify(value)
      if (localStorage.getItem(key) === text) return true
      if (custom?.write) { if (!custom.write(value)) return false } else localStorage.setItem(key, text)
    } catch { return false }
    emit(id)
    return true
  }
  const reset = () => {
    try {
      if (custom?.reset) { if (!custom.reset()) return } else { if (localStorage.getItem(key) == null) return; localStorage.removeItem(key) }
    } catch { return }
    emit(id)
  }
  return { id, key, parse, read, write, reset }
}

export const PROJECT_MODULES = {
  girderLibrary: createModule('girderLibrary', PRECAST_GIRDER_STORAGE_KEY, girderLibrarySchema, { write: (value) => savePrecastGirderDefinition(value), reset: () => savePrecastGirderDefinition([]) }),
  preferredSpanRules: createModule('preferredSpanRules', 'kopruq.project-design-system.girder-span-rules', preferredSpanRulesSchema),
  seismicInputs: createModule('seismicInputs', 'kopruq.seismic', seismicInputsSchema),
  windInputs: createModule('windInputs', 'kopruq.wind-load.inputs', windInputsSchema),
  temperatureInputs: createModule('temperatureInputs', 'kopruq.uniform-temperature.inputs', temperatureInputsSchema),
  crossSectionValues: createModule('crossSectionValues', 'kopruq.superstructure.cross-section.v1', crossSectionValuesSchema),
  selfWeightInputs: createModule('selfWeightInputs', 'kopruq.loads.self-weight.v1', selfWeightInputsSchema),
  trafficLm1: createModule('trafficLm1', 'kopruq.loads.traffic-lm1.v1', trafficLm1Schema),
}
export type ProjectModules = typeof PROJECT_MODULES
export type ProjectModuleId = keyof ProjectModules
export type ProjectModuleValue<K extends ProjectModuleId> = NonNullable<ReturnType<ProjectModules[K]['read']>>
export const PROJECT_MODULE_IDS = Object.keys(PROJECT_MODULES) as ProjectModuleId[]

/** Human-readable module names for user-facing messages. */
export const PROJECT_MODULE_LABELS: Record<ProjectModuleId, string> = {
  girderLibrary: 'Girder library', preferredSpanRules: 'Preferred span rules', seismicInputs: 'Seismic inputs', windInputs: 'Wind inputs',
  temperatureInputs: 'Temperature inputs', crossSectionValues: 'Cross section', selfWeightInputs: 'Self weight', trafficLm1: 'Traffic LM1',
}
