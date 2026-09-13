import { z } from 'zod'

/**
 * Generic UI-level validation only (required numeric fields, positive
 * where physically meaningful) - never an invented engineering rule
 * (spec section 22). Mirrors the previous `FastSolverRequest` interface
 * field-for-field; added as part of the React Hook Form + Zod migration
 * (architecture migration Milestone 3, 2026-09-12). Bearing
 * stiffnesses are left unconstrained in sign/range (no `.positive()`) -
 * the engineer's own given test values are the only ones ever used, and
 * this form is not the place to guess a validity range for a stiffness
 * value.
 */
export const fastSolverSchema = z.object({
  spanLengthsM: z.array(z.number().positive('Must be positive')),
  deckWidthM: z.number().positive('Must be positive'),
  deckThicknessM: z.number().positive('Must be positive'),
  sdlKnPerM: z.number(),
  pierHeightsM: z.array(z.number().positive('Must be positive')),
  columnLongitudinalM: z.number().positive('Must be positive'),
  columnTransverseM: z.number().positive('Must be positive'),
  columnSpacingTransverseM: z.number().positive('Must be positive'),
  capBeamWidthM: z.number().positive('Must be positive'),
  capBeamDepthM: z.number().positive('Must be positive'),
  concreteFckMpa: z.number().positive('Must be positive'),
  bearingKx: z.number(),
  bearingKy: z.number(),
  bearingKz: z.number(),
  bearingKrx: z.number(),
  bearingKry: z.number(),
  bearingKrz: z.number(),
})

export type FastSolverFormValues = z.infer<typeof fastSolverSchema>
