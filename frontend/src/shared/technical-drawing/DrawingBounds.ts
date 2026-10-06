import type { DimensionDefinition, DrawingPoint } from './DimensionTypes'
import { TECHNICAL_DRAWING_TOKENS } from './TechnicalDrawingTokens'

export type DrawingBounds = { minX: number; maxX: number; minY: number; maxY: number; width: number; height: number; centerX: number; centerY: number }
export type AnnotationText = { text: string; point: DrawingPoint; anchor?: 'start' | 'middle' | 'end' }

const textWidthFactor = 0.58

export function estimateTechnicalTextBounds({ text, x, y, fontSize = TECHNICAL_DRAWING_TOKENS.fontSize, textAnchor = 'start' }: { text: string; x: number; y: number; fontSize?: number; textAnchor?: 'start' | 'middle' | 'end' }): DrawingBounds {
  const width = text.length * fontSize * textWidthFactor
  const minX = textAnchor === 'end' ? x - width : textAnchor === 'middle' ? x - width / 2 : x
  const maxX = textAnchor === 'end' ? x : textAnchor === 'middle' ? x + width / 2 : x + width
  const halfHeight = fontSize * 0.55
  return makeBounds(minX, maxX, y - halfHeight, y + halfHeight)
}

export function makeBounds(minX: number, maxX: number, minY: number, maxY: number): DrawingBounds {
  return { minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY, centerX: (minX + maxX) / 2, centerY: (minY + maxY) / 2 }
}

export function expandDrawingBounds(bounds: DrawingBounds, points: readonly DrawingPoint[], padding = 0): DrawingBounds {
  const xs = points.map((point) => point.x), ys = points.map((point) => point.y)
  if (!xs.length) return bounds
  return makeBounds(Math.min(bounds.minX, ...xs) - padding, Math.max(bounds.maxX, ...xs) + padding, Math.min(bounds.minY, ...ys) - padding, Math.max(bounds.maxY, ...ys) + padding)
}

export function drawingBounds(sectionPoints: readonly DrawingPoint[], dimensions: readonly DimensionDefinition[], padding = 0, fontSize = TECHNICAL_DRAWING_TOKENS.fontSize): DrawingBounds {
  if (!sectionPoints.length) throw new Error('A drawing requires section points')
  let bounds = makeBounds(Math.min(...sectionPoints.map((point) => point.x)), Math.max(...sectionPoints.map((point) => point.x)), Math.min(...sectionPoints.map((point) => point.y)), Math.max(...sectionPoints.map((point) => point.y)))
  for (const dimension of dimensions) {
    bounds = expandDrawingBounds(bounds, [dimension.from, dimension.to], 0)
    for (const arrow of dimension.arrows ?? []) bounds = expandDrawingBounds(bounds, [arrow.point], arrow.size ?? 0)
    for (const line of dimension.extensionLines ?? []) bounds = expandDrawingBounds(bounds, [line.from, line.to], 0)
    if (dimension.text) {
      const text = `${dimension.label}${dimension.formattedValue === undefined ? '' : ` = ${dimension.formattedValue}`}`
      const textBounds = estimateTechnicalTextBounds({ text, x: dimension.text.point.x, y: dimension.text.point.y, fontSize, textAnchor: dimension.text.anchor })
      bounds = makeBounds(Math.min(bounds.minX, textBounds.minX), Math.max(bounds.maxX, textBounds.maxX), Math.min(bounds.minY, textBounds.minY), Math.max(bounds.maxY, textBounds.maxY))
    }
  }
  return makeBounds(bounds.minX - padding, bounds.maxX + padding, bounds.minY - padding, bounds.maxY + padding)
}

/** Complete technical envelope derived from the same dimension definitions used by the renderer. */
export function computeTechnicalDrawingEnvelope(sectionPoints: readonly DrawingPoint[], dimensions: readonly DimensionDefinition[], padding = 0, fontSize = TECHNICAL_DRAWING_TOKENS.fontSize): DrawingBounds {
  return drawingBounds(sectionPoints, dimensions, padding, fontSize)
}
