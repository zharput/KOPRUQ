import { z } from 'zod'

/**
 * Generic UI-level validation only (required fields, positive numbers,
 * min &lt;= max) - never an invented engineering rule (spec section 22).
 * Mirrors `LayoutGenerationRequest`'s fields field-for-field; added as
 * part of the React Hook Form + Zod migration (architecture migration
 * Milestone 3, 2026-09-12).
 */
export const noPierZoneSchema = z
  .object({
    id: z.string().min(1, 'Required'),
    startChainageM: z.number(),
    endChainageM: z.number(),
    description: z.string(),
  })
  .refine((zone) => zone.endChainageM >= zone.startChainageM, {
    message: 'End chainage must be ≥ start chainage',
    path: ['endChainageM'],
  })

export const layoutGenerationSchema = z
  .object({
    alignmentLengthM: z.number().positive('Must be positive'),
    siteStartChainageM: z.number(),
    siteEndChainageM: z.number(),
    crossingType: z.string().min(1, 'Required'),
    noPierZones: z.array(noPierZoneSchema),
    minSpanM: z.number().positive('Must be positive'),
    maxSpanM: z.number().positive('Must be positive'),
    minSpanCount: z.number().int('Must be a whole number').positive('Must be positive'),
    maxSpanCount: z.number().int('Must be a whole number').positive('Must be positive'),
    spanLengthStepM: z.number().positive('Must be positive'),
    c1StepM: z.number().positive('Must be positive'),
  })
  .refine((v) => v.siteEndChainageM >= v.siteStartChainageM, {
    message: 'Site end chainage must be ≥ start chainage',
    path: ['siteEndChainageM'],
  })
  .refine((v) => v.maxSpanM >= v.minSpanM, {
    message: 'Max span must be ≥ min span',
    path: ['maxSpanM'],
  })
  .refine((v) => v.maxSpanCount >= v.minSpanCount, {
    message: 'Max span count must be ≥ min span count',
    path: ['maxSpanCount'],
  })

export type LayoutGenerationFormValues = z.infer<typeof layoutGenerationSchema>
