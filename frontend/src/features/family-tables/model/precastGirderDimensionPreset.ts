import { TECHNICAL_DRAWING_TOKENS } from '../../../shared/technical-drawing/TechnicalDrawingTokens'

export const PRECAST_GIRDER_DIMENSION_PRESET = {
  rightDimensionFactor: 0.25,
  twTextGapFactor: 2 / 3,
  extensionGap: TECHNICAL_DRAWING_TOKENS.extensionGap,
  extensionOverrun: TECHNICAL_DRAWING_TOKENS.extensionOverrun,
  textGap: TECHNICAL_DRAWING_TOKENS.textGap,
  rightLabels: ['th1', 'bh1', 'bh2', 'th2'] as const,
} as const
