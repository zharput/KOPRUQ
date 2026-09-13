import { z } from 'zod'

/**
 * Generic UI-level validation only (required fields, positive numbers,
 * min &lt;= max) - never an invented engineering rule (spec section 22).
 * Mirrors the previous `KernelStateRequest` interface field-for-field;
 * added as part of the React Hook Form + Zod migration (architecture
 * migration Milestone 3, 2026-09-12).
 */
export const kernelStateSchema = z
  .object({
    bridgeName: z.string().min(1, 'Required'),
    totalLengthM: z.number().positive('Must be positive'),
    deckWidthM: z.number().positive('Must be positive'),
    minSpanM: z.number().positive('Must be positive'),
    maxSpanM: z.number().positive('Must be positive'),
    minGirderCount: z.number().int('Must be a whole number').positive('Must be positive'),
    maxGirderCount: z.number().int('Must be a whole number').positive('Must be positive'),
    minGirderDepthM: z.number().positive('Must be positive'),
    maxGirderDepthM: z.number().positive('Must be positive'),
  })
  .refine((v) => v.maxSpanM >= v.minSpanM, { message: 'Max span must be ≥ min span', path: ['maxSpanM'] })
  .refine((v) => v.maxGirderCount >= v.minGirderCount, { message: 'Max girder count must be ≥ min girder count', path: ['maxGirderCount'] })
  .refine((v) => v.maxGirderDepthM >= v.minGirderDepthM, { message: 'Max girder depth must be ≥ min girder depth', path: ['maxGirderDepthM'] })

export type KernelStateFormValues = z.infer<typeof kernelStateSchema>
