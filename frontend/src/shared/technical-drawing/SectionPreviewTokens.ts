export const SECTION_PREVIEW_TOKENS = {
  maxHeightRatio: 0.75,
  geometryFillRatio: 0.76,
  geometrySafeInset: 48,
  axisExtension: 24,
  axisLabelGap: 10,
  axisToDimensionTextGap: 12,
  axisLabelFontSize: 9,
  minimumReadableGeometry: 12,
} as const
/** Canonical engineering-to-SVG user-unit conversion for every structural section. */
export const STRUCTURAL_ENGINEERING_TO_SVG_SCALE = 40

export type SectionEnvelope = { width: number; height: number }

/** Single engineering-unit to SVG-user-unit scale for structural previews. */
export function structuralSectionScale(_reference: SectionEnvelope, _drawing: SectionEnvelope) {
  return STRUCTURAL_ENGINEERING_TO_SVG_SCALE
}

export function referenceSectionScale(envelope: SectionEnvelope, available: SectionEnvelope, fillRatio = SECTION_PREVIEW_TOKENS.geometryFillRatio) {
  if (!(envelope.width > 0) || !(envelope.height > 0)) return 0
  const width = Math.max(0, available.width - SECTION_PREVIEW_TOKENS.geometrySafeInset * 2)
  const height = Math.max(0, available.height - SECTION_PREVIEW_TOKENS.geometrySafeInset * 2)
  return Math.min(width / envelope.width, height / envelope.height) * fillRatio
}
