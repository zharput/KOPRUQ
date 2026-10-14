import { z } from 'zod'
import type { Dimension } from '../../../shared/lib/parameterSweep'
import { WireMappingError } from '../../../shared/project-store/projectDataValidation'
import type { SectionDefinition } from '../../../shared/project-store/serverSection'
import type { BearingFamily } from '../../bearing-families/model/types'
import type { FoundationFamily, FoundationRule, PiledFoundationGeneration, ShallowFoundationGeneration } from '../../foundation-families/model/types'
import type { PierCapFamily, Rule } from '../../pier-cap-families/model/types'
import type { HeightApplicability, PierFamily, PierType } from '../../pier-families/model/types'
import type { FamilyRepositoryCategory } from './familyRepository'

/**
 * Wire mapping of the five family catalogs and of the girder library. Source of the shapes: backend `FamilyDtos`,
 * `FamiliesDto`, `GirderLibraryDto` (key order follows the record components). Rule units follow the family: pier cap and
 * foundation metres, bearing millimetres, pier heights metres; nothing is converted.
 * `toWire` sends every field and writes an absent one as an explicit null; passthrough and unknown fields are dropped (K8).
 * `fromWire` leaves an absent (null) optional field out of the record, except the four nullable-by-type fields
 * (`twoColumnSpacing`, `stemWidth`, `shallowGeneration`, `piledGeneration`), which stay null.
 */
const text = z.string()
const number = z.number()

export const sweepDimensionWireSchema = z.object({ key: text, label: text, min: number, max: number, delta: number }).strict()
const rangeRule = z.object({ min: number.nullable(), max: number.nullable(), delta: number.nullable() }).strict()
const heightApplicability = z.object({ minimumHeight: number.nullable(), preferredHeightMin: number.nullable(), preferredHeightMax: number.nullable(), maximumHeight: number.nullable() }).strict()

const pierWire = z.object({
  id: text, name: text.nullable(),
  pierType: z.enum(['RECTANGULAR', 'CIRCULAR', 'OVAL', 'BOX', 'H_SECTION', 'H_TYPE', 'WALL']).nullable(),
  enabled: z.boolean().nullable(), source: text.nullable(), dimensions: z.array(sweepDimensionWireSchema).nullable(),
  allowedConfigurations: z.array(text).nullable(), twoColumnSpacing: sweepDimensionWireSchema.nullable(), heightApplicability: heightApplicability.nullable(),
}).strict()
const pierCapWire = z.object({
  id: text, name: text.nullable(), capType: z.enum(['RECTANGULAR', 'T_CAP']).nullable(), compatiblePierConfiguration: z.enum(['SINGLE_COLUMN', 'TWO_COLUMNS']).nullable(),
  enabled: z.boolean().nullable(), source: text.nullable(), capTransverseLength: rangeRule.nullable(), capStructuralHeight: rangeRule.nullable(), stemWidth: rangeRule.nullable(),
}).strict()
const shallowGeneration = z.object({ lengthX: rangeRule, lengthY: rangeRule, height: rangeRule }).strict()
const piledGeneration = z.object({ pileDiameter: rangeRule, pileCountX: rangeRule, pileSpacingX: rangeRule, pileCountY: rangeRule, pileSpacingY: rangeRule, height: rangeRule }).strict()
const foundationWire = z.object({
  id: text, name: text.nullable(), foundationType: z.enum(['SHALLOW', 'PILED']).nullable(), enabled: z.boolean().nullable(), source: text.nullable(),
  shallowGeneration: shallowGeneration.nullable(), piledGeneration: piledGeneration.nullable(),
}).strict()
const bearingWire = z.object({
  id: text, name: text.nullable(), bearingType: z.enum(['ELASTOMERIC']).nullable(), enabled: z.boolean().nullable(), source: text.nullable(),
  length: rangeRule.nullable(), width: rangeRule.nullable(), height: rangeRule.nullable(),
}).strict()
const materialWire = z.object({ id: text, no: number.nullable(), element: text.nullable(), concreteClass: text.nullable() }).strict()

export type SweepDimensionWire = z.infer<typeof sweepDimensionWireSchema>
export type PierFamilyWire = z.infer<typeof pierWire>
export type PierCapFamilyWire = z.infer<typeof pierCapWire>
export type FoundationFamilyWire = z.infer<typeof foundationWire>
export type BearingFamilyWire = z.infer<typeof bearingWire>
export type MaterialAssignmentWire = z.infer<typeof materialWire>
type RangeRuleWire = z.infer<typeof rangeRule>

export const pierFamilyWireSchema = pierWire
export const pierCapFamilyWireSchema = pierCapWire
export const foundationFamilyWireSchema = foundationWire
export const bearingFamilyWireSchema = bearingWire
export const materialAssignmentWireSchema = materialWire
export const familiesWireSchema = z.object({
  piers: z.array(pierWire).nullable(), pierCaps: z.array(pierCapWire).nullable(), foundations: z.array(foundationWire).nullable(),
  bearings: z.array(bearingWire).nullable(), materials: z.array(materialWire).nullable(),
}).strict()

/** Records as the catalogs store them: only `id` is guaranteed, the rest is optional and the legacy pier types are tolerated. */
export type PierFamilyRecord = { id: string } & Partial<Omit<PierFamily, 'id' | 'pierType' | 'allowedConfigurations' | 'source'>> & { pierType?: PierType | 'H_TYPE' | 'WALL'; allowedConfigurations?: string[]; source?: string }
export type PierCapFamilyRecord = { id: string } & Partial<Omit<PierCapFamily, 'id' | 'source'>> & { source?: string }
export type FoundationFamilyRecord = { id: string } & Partial<Omit<FoundationFamily, 'id' | 'source'>> & { source?: string }
export type BearingFamilyRecord = { id: string } & Partial<Omit<BearingFamily, 'id' | 'source'>> & { source?: string }
export type MaterialAssignmentRecord = { id: string; no?: number; element?: string; concreteClass?: string }
export type FamilyRecordMap = { PIER: PierFamilyRecord; PIER_CAP: PierCapFamilyRecord; FOUNDATION: FoundationFamilyRecord; BEARING: BearingFamilyRecord; MATERIAL: MaterialAssignmentRecord }
export type FamilyRecordOf<C extends FamilyRepositoryCategory> = FamilyRecordMap[C]

// ---- helpers --------------------------------------------------------------------------------------------------

function requireId(index: number, id: unknown): string {
  if (typeof id !== 'string') throw new WireMappingError(`[${index}].id`, 'is required')
  if (id.trim() === '') throw new WireMappingError(`[${index}].id`, 'must not be blank')
  return id
}
const dimensionToWire = (d: Dimension): SweepDimensionWire => ({ key: d.key, label: d.label, min: d.min, max: d.max, delta: d.delta })
const dimensionFromWire = (d: SweepDimensionWire): Dimension => ({ key: d.key, label: d.label, min: d.min, max: d.max, delta: d.delta })
const ruleToWire = (r: Rule | FoundationRule | null | undefined): RangeRuleWire | null => r ? { min: r.min ?? null, max: r.max ?? null, delta: r.delta ?? null } : null
function requiredRule(path: string, r: Rule | undefined | null): RangeRuleWire {
  if (!r) throw new WireMappingError(path, 'is required')
  return ruleToWire(r) as RangeRuleWire
}
const ruleFromWire = (r: RangeRuleWire): Rule => ({ min: r.min, max: r.max, delta: r.delta })
/** Keeps only the non-null entries (an absent optional field is omitted, not written as null). */
const present = <T extends object>(entries: { [K in keyof T]: T[K] | null }): Partial<T> => Object.fromEntries(Object.entries(entries).filter(([, value]) => value !== null)) as Partial<T>

// ---- piers ----------------------------------------------------------------------------------------------------

export function pierFamiliesToWire(records: PierFamilyRecord[]): PierFamilyWire[] {
  return records.map((r, index) => ({
    id: requireId(index, r.id), name: r.name ?? null, pierType: r.pierType ?? null, enabled: r.enabled ?? null, source: r.source ?? null,
    dimensions: r.dimensions ? r.dimensions.map(dimensionToWire) : null, allowedConfigurations: r.allowedConfigurations ? [...r.allowedConfigurations] : null,
    twoColumnSpacing: r.twoColumnSpacing ? dimensionToWire(r.twoColumnSpacing) : null,
    heightApplicability: r.heightApplicability ? { minimumHeight: r.heightApplicability.minimumHeight ?? null, preferredHeightMin: r.heightApplicability.preferredHeightMin ?? null, preferredHeightMax: r.heightApplicability.preferredHeightMax ?? null, maximumHeight: r.heightApplicability.maximumHeight ?? null } : null,
  }))
}
export function pierFamiliesFromWire(wire: PierFamilyWire[]): PierFamilyRecord[] {
  return wire.map((w) => ({
    id: w.id,
    ...present<Omit<PierFamilyRecord, 'id' | 'twoColumnSpacing'>>({
      name: w.name, pierType: w.pierType, enabled: w.enabled, source: w.source, dimensions: w.dimensions ? w.dimensions.map(dimensionFromWire) : null,
      allowedConfigurations: w.allowedConfigurations ? [...w.allowedConfigurations] : null,
      heightApplicability: w.heightApplicability ? ({ ...w.heightApplicability } satisfies HeightApplicability) : null,
    }),
    twoColumnSpacing: w.twoColumnSpacing ? dimensionFromWire(w.twoColumnSpacing) : null,
  }))
}

// ---- pier caps ------------------------------------------------------------------------------------------------

export function pierCapFamiliesToWire(records: PierCapFamilyRecord[]): PierCapFamilyWire[] {
  return records.map((r, index) => ({
    id: requireId(index, r.id), name: r.name ?? null, capType: r.capType ?? null, compatiblePierConfiguration: r.compatiblePierConfiguration ?? null,
    enabled: r.enabled ?? null, source: r.source ?? null, capTransverseLength: ruleToWire(r.capTransverseLength), capStructuralHeight: ruleToWire(r.capStructuralHeight), stemWidth: ruleToWire(r.stemWidth),
  }))
}
export function pierCapFamiliesFromWire(wire: PierCapFamilyWire[]): PierCapFamilyRecord[] {
  return wire.map((w) => ({
    id: w.id,
    ...present<Omit<PierCapFamilyRecord, 'id' | 'stemWidth'>>({
      name: w.name, capType: w.capType, compatiblePierConfiguration: w.compatiblePierConfiguration, enabled: w.enabled, source: w.source,
      capTransverseLength: w.capTransverseLength ? ruleFromWire(w.capTransverseLength) : null, capStructuralHeight: w.capStructuralHeight ? ruleFromWire(w.capStructuralHeight) : null,
    }),
    stemWidth: w.stemWidth ? ruleFromWire(w.stemWidth) : null,
  }))
}

// ---- foundations ----------------------------------------------------------------------------------------------

export function foundationFamiliesToWire(records: FoundationFamilyRecord[]): FoundationFamilyWire[] {
  return records.map((r, index) => {
    const at = `[${index}]`
    const shallow: ShallowFoundationGeneration | null | undefined = r.shallowGeneration
    const piled: PiledFoundationGeneration | null | undefined = r.piledGeneration
    return {
      id: requireId(index, r.id), name: r.name ?? null, foundationType: r.foundationType ?? null, enabled: r.enabled ?? null, source: r.source ?? null,
      shallowGeneration: shallow ? { lengthX: requiredRule(`${at}.shallowGeneration.lengthX`, shallow.lengthX), lengthY: requiredRule(`${at}.shallowGeneration.lengthY`, shallow.lengthY), height: requiredRule(`${at}.shallowGeneration.height`, shallow.height) } : null,
      piledGeneration: piled ? {
        pileDiameter: requiredRule(`${at}.piledGeneration.pileDiameter`, piled.pileDiameter), pileCountX: requiredRule(`${at}.piledGeneration.pileCountX`, piled.pileCountX),
        pileSpacingX: requiredRule(`${at}.piledGeneration.pileSpacingX`, piled.pileSpacingX), pileCountY: requiredRule(`${at}.piledGeneration.pileCountY`, piled.pileCountY),
        pileSpacingY: requiredRule(`${at}.piledGeneration.pileSpacingY`, piled.pileSpacingY), height: requiredRule(`${at}.piledGeneration.height`, piled.height),
      } : null,
    }
  })
}
export function foundationFamiliesFromWire(wire: FoundationFamilyWire[]): FoundationFamilyRecord[] {
  return wire.map((w) => ({
    id: w.id,
    ...present<Omit<FoundationFamilyRecord, 'id' | 'shallowGeneration' | 'piledGeneration'>>({ name: w.name, foundationType: w.foundationType, enabled: w.enabled, source: w.source }),
    shallowGeneration: w.shallowGeneration ? { lengthX: ruleFromWire(w.shallowGeneration.lengthX), lengthY: ruleFromWire(w.shallowGeneration.lengthY), height: ruleFromWire(w.shallowGeneration.height) } : null,
    piledGeneration: w.piledGeneration ? {
      pileDiameter: ruleFromWire(w.piledGeneration.pileDiameter), pileCountX: ruleFromWire(w.piledGeneration.pileCountX), pileSpacingX: ruleFromWire(w.piledGeneration.pileSpacingX),
      pileCountY: ruleFromWire(w.piledGeneration.pileCountY), pileSpacingY: ruleFromWire(w.piledGeneration.pileSpacingY), height: ruleFromWire(w.piledGeneration.height),
    } : null,
  }))
}

// ---- bearings and materials -----------------------------------------------------------------------------------

export function bearingFamiliesToWire(records: BearingFamilyRecord[]): BearingFamilyWire[] {
  return records.map((r, index) => ({
    id: requireId(index, r.id), name: r.name ?? null, bearingType: r.bearingType ?? null, enabled: r.enabled ?? null, source: r.source ?? null,
    length: ruleToWire(r.length), width: ruleToWire(r.width), height: ruleToWire(r.height),
  }))
}
export function bearingFamiliesFromWire(wire: BearingFamilyWire[]): BearingFamilyRecord[] {
  return wire.map((w) => ({
    id: w.id,
    ...present<Omit<BearingFamilyRecord, 'id'>>({
      name: w.name, bearingType: w.bearingType, enabled: w.enabled, source: w.source,
      length: w.length ? ruleFromWire(w.length) : null, width: w.width ? ruleFromWire(w.width) : null, height: w.height ? ruleFromWire(w.height) : null,
    }),
  }))
}

export function materialAssignmentsToWire(records: MaterialAssignmentRecord[]): MaterialAssignmentWire[] {
  return records.map((r, index) => ({ id: requireId(index, r.id), no: r.no ?? null, element: r.element ?? null, concreteClass: r.concreteClass ?? null }))
}
export function materialAssignmentsFromWire(wire: MaterialAssignmentWire[]): MaterialAssignmentRecord[] {
  return wire.map((w) => ({ id: w.id, ...present<Omit<MaterialAssignmentRecord, 'id'>>({ no: w.no, element: w.element, concreteClass: w.concreteClass }) }))
}

// ---- sections -------------------------------------------------------------------------------------------------

function section<T, W>(id: string, path: string, schema: z.ZodType<W, z.ZodTypeDef, unknown>, toWire: (records: T) => W, fromWire: (wire: W) => T): SectionDefinition<T, W> {
  return { id, path, codec: { schema: schema.nullable(), clearable: false, toWire, fromWire: (wire) => wire === null ? undefined : fromWire(wire) } }
}

export const PIER_FAMILIES_SECTION = section<PierFamilyRecord[], PierFamilyWire[]>('families.piers', 'families/piers', z.array(pierWire), pierFamiliesToWire, pierFamiliesFromWire)
export const PIER_CAP_FAMILIES_SECTION = section<PierCapFamilyRecord[], PierCapFamilyWire[]>('families.pierCaps', 'families/pier-caps', z.array(pierCapWire), pierCapFamiliesToWire, pierCapFamiliesFromWire)
export const FOUNDATION_FAMILIES_SECTION = section<FoundationFamilyRecord[], FoundationFamilyWire[]>('families.foundations', 'families/foundations', z.array(foundationWire), foundationFamiliesToWire, foundationFamiliesFromWire)
export const BEARING_FAMILIES_SECTION = section<BearingFamilyRecord[], BearingFamilyWire[]>('families.bearings', 'families/bearings', z.array(bearingWire), bearingFamiliesToWire, bearingFamiliesFromWire)
export const MATERIAL_ASSIGNMENTS_SECTION = section<MaterialAssignmentRecord[], MaterialAssignmentWire[]>('families.materials', 'families/materials', z.array(materialWire), materialAssignmentsToWire, materialAssignmentsFromWire)

export const FAMILY_SECTIONS = {
  PIER: PIER_FAMILIES_SECTION, PIER_CAP: PIER_CAP_FAMILIES_SECTION, FOUNDATION: FOUNDATION_FAMILIES_SECTION, BEARING: BEARING_FAMILIES_SECTION, MATERIAL: MATERIAL_ASSIGNMENTS_SECTION,
}

// ---- girder library -------------------------------------------------------------------------------------------

export type GirderLibraryValue = { enabled?: boolean; dimensions?: Dimension[] }
export const girderLibraryWireSchema = z.object({ enabled: z.boolean().nullable(), dimensions: z.array(sweepDimensionWireSchema).nullable() }).strict()
export type GirderLibraryWire = z.infer<typeof girderLibraryWireSchema>

/**
 * The legacy reset value `[]` (any array) is the cleared library: it maps to null. Deliberately lossy (plan R4): a NON-empty legacy
 * array is also sent as null, i.e. it is silently cleared on the server. Mind this when migrating legacy data in M5.
 */
export function girderLibraryToWire(value: unknown[] | GirderLibraryValue): GirderLibraryWire | null {
  if (Array.isArray(value)) return null
  return { enabled: value.enabled ?? null, dimensions: value.dimensions ? value.dimensions.map(dimensionToWire) : null }
}
export function girderLibraryFromWire(wire: GirderLibraryWire | null): GirderLibraryValue | undefined {
  if (wire === null) return undefined
  return { ...(wire.enabled !== null && { enabled: wire.enabled }), ...(wire.dimensions !== null && { dimensions: wire.dimensions.map(dimensionFromWire) }) }
}

export const GIRDER_LIBRARY_SECTION: SectionDefinition<unknown[] | GirderLibraryValue, GirderLibraryWire> = {
  id: 'girderLibrary', path: 'girder-library',
  codec: { schema: girderLibraryWireSchema.nullable(), clearable: true, toWire: girderLibraryToWire, fromWire: girderLibraryFromWire },
}
