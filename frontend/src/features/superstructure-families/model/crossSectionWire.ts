import { z } from 'zod'
import type { SectionDefinition } from '../../../shared/project-store/serverSection'
import type { CrossSectionValues } from './types'

/**
 * Wire mapping of the cross section (`PUT /cross-section`). Source of the shape: backend `CrossSectionDto` (every field
 * required; widths and spacing are metres, unchanged). A cleared/never written section reads as `undefined`
 * (the caller falls back to `INITIAL_CROSS_SECTION_VALUES`).
 */
export const crossSectionWireSchema = z.object({
  platformWidthM: z.number(), leftWalkwayM: z.number(), rightWalkwayM: z.number(), spaceOfGirderM: z.number(), numberOfGirders: z.number(),
}).strict()
export type CrossSectionWire = z.infer<typeof crossSectionWireSchema>

export function crossSectionToWire(v: CrossSectionValues): CrossSectionWire {
  return { platformWidthM: v.platformWidthM, leftWalkwayM: v.leftWalkwayM, rightWalkwayM: v.rightWalkwayM, spaceOfGirderM: v.spaceOfGirderM, numberOfGirders: v.numberOfGirders }
}
export function crossSectionFromWire(w: CrossSectionWire): CrossSectionValues {
  return { platformWidthM: w.platformWidthM, leftWalkwayM: w.leftWalkwayM, rightWalkwayM: w.rightWalkwayM, spaceOfGirderM: w.spaceOfGirderM, numberOfGirders: w.numberOfGirders }
}

export const CROSS_SECTION_SECTION: SectionDefinition<CrossSectionValues, CrossSectionWire> = {
  id: 'crossSectionValues', path: 'cross-section',
  codec: { schema: crossSectionWireSchema.nullable(), clearable: true, toWire: crossSectionToWire, fromWire: (wire) => wire === null ? undefined : crossSectionFromWire(wire) },
}
