import { z } from 'zod'
import { parseWithSchema, ProjectFileValidationError } from '../../../shared/project-file/projectFileValidation'
import type { FamilyRepositoryCategory } from './familyRepository'
import type { Dimension } from '../../../shared/lib/parameterSweep'
import type { PierFamily } from '../../pier-families/model/types'
import type { PierCapFamily } from '../../pier-cap-families/model/types'
import type { FoundationFamily } from '../../foundation-families/model/types'
import type { BearingFamily } from '../../bearing-families/model/types'

/**
 * File-level validation of family catalog records. A record must be a non-null object with a string `id`
 * (K2b); category fields are checked only when present, so older and partial records keep opening.
 * Unknown fields pass through. Numbers are only checked to be numbers (no ranges). Ids must be unique per category.
 */
type Loose<T> = Partial<T> & { id: string }
const text = z.string()
const rule = z.object({ min: z.number().nullable(), max: z.number().nullable(), delta: z.number().nullable() }).passthrough()
const dimension: z.ZodType<Dimension, z.ZodTypeDef, unknown> = z.object({ key: text, label: text, min: z.number(), max: z.number(), delta: z.number() }).passthrough()
const base = { id: text, name: text, enabled: z.boolean(), source: text }
const loose = <T>(shape: z.ZodRawShape) => z.object({ ...Object.fromEntries(Object.entries(shape).map(([key, field]) => [key, field.optional()])), id: text }).passthrough() as unknown as z.ZodType<Loose<T>, z.ZodTypeDef, unknown>

const pierSchema = loose<PierFamily>({
  ...base,
  // H_TYPE and WALL are legacy values that PierFamiliesPanel migrates to H_SECTION on read.
  pierType: z.enum(['RECTANGULAR', 'CIRCULAR', 'OVAL', 'BOX', 'H_SECTION', 'H_TYPE', 'WALL']),
  dimensions: z.array(dimension), allowedConfigurations: z.array(text), twoColumnSpacing: dimension.nullable(),
  heightApplicability: z.object({ minimumHeight: z.number().nullable(), preferredHeightMin: z.number().nullable(), preferredHeightMax: z.number().nullable(), maximumHeight: z.number().nullable() }).passthrough(),
})
const pierCapSchema = loose<PierCapFamily>({
  ...base, capType: z.enum(['RECTANGULAR', 'T_CAP']), compatiblePierConfiguration: z.enum(['SINGLE_COLUMN', 'TWO_COLUMNS']),
  capTransverseLength: rule, capStructuralHeight: rule, stemWidth: rule.nullable(),
})
const foundationSchema = loose<FoundationFamily>({
  ...base, foundationType: z.enum(['SHALLOW', 'PILED']),
  shallowGeneration: z.object({ lengthX: rule, lengthY: rule, height: rule }).passthrough().nullable(),
  piledGeneration: z.object({ pileDiameter: rule, pileCountX: rule, pileSpacingX: rule, pileCountY: rule, pileSpacingY: rule, height: rule }).passthrough().nullable(),
})
const bearingSchema = loose<BearingFamily>({ ...base, bearingType: z.enum(['ELASTOMERIC']), length: rule, width: rule, height: rule })
const materialSchema = loose<{ id: string; no: number; element: string; concreteClass: string }>({ no: z.number(), element: text, concreteClass: text })

const RECORD_SCHEMAS: Record<FamilyRepositoryCategory, z.ZodType<{ id: string }, z.ZodTypeDef, unknown>> = {
  PIER: pierSchema, PIER_CAP: pierCapSchema, FOUNDATION: foundationSchema, BEARING: bearingSchema, MATERIAL: materialSchema,
}

/** Validates the records of one family category from a project file. Throws `Missing family data` for a non-array and ProjectFileValidationError for bad records. */
export function parseFamilyRecords(category: FamilyRepositoryCategory, value: unknown): unknown[] {
  if (!Array.isArray(value)) throw new Error(`Missing family data: ${category}`)
  const records = parseWithSchema(z.array(RECORD_SCHEMAS[category]), value, `families.${category}`)
  const seen = new Set<string>()
  for (const record of records) {
    if (seen.has(record.id)) throw new ProjectFileValidationError([{ path: `families.${category}`, message: `duplicate id "${record.id}"` }])
    seen.add(record.id)
  }
  return value
}
