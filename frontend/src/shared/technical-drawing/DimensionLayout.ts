import { TECHNICAL_DRAWING_TOKENS } from './TechnicalDrawingTokens'
import type { DimensionSide } from './DimensionTypes'
import type { SectionBounds } from './SectionBounds'

export function laneOffset(lane = 1, laneGap: number = TECHNICAL_DRAWING_TOKENS.laneGap) { return Math.max(0, lane - 1) * laneGap }
export function dimensionAxis(bounds: SectionBounds, side: DimensionSide, lane = 1, baseOffset: number = TECHNICAL_DRAWING_TOKENS.baseOffset, gap: number = TECHNICAL_DRAWING_TOKENS.laneGap) {
  const offset = baseOffset + laneOffset(lane, gap)
  if (side === 'right') return bounds.maxX + offset
  if (side === 'left') return bounds.minX - offset
  if (side === 'top') return bounds.minY - offset
  if (side === 'bottom') return bounds.maxY + offset
  return undefined
}
