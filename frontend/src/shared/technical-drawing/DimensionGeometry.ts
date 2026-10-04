import { TECHNICAL_DRAWING_TOKENS } from './TechnicalDrawingTokens'
import type { DimensionDefinition, DrawingPoint, ExtensionLineGeometry } from './DimensionTypes'

export function resolveHorizontalDimension(id: string, label: string, from: DrawingPoint, to: DrawingPoint, value?: string): DimensionDefinition {
  return { id, label, side: 'top', from, to, formattedValue: value, arrows: [{ point: from, direction: 'left' }, { point: to, direction: 'right' }], text: { point: { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 }, anchor: 'middle' } }
}

export function resolveVerticalDimension(id: string, label: string, from: DrawingPoint, to: DrawingPoint, value?: string): DimensionDefinition {
  return { id, label, side: 'right', from, to, formattedValue: value, arrows: [{ point: from, direction: 'up' }, { point: to, direction: 'down' }], text: { point: { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 }, anchor: 'middle' } }
}

export function resolveInlineDimension(id: string, label: string, from: DrawingPoint, to: DrawingPoint, value?: string): DimensionDefinition {
  return { id, label, side: 'inline', from, to, formattedValue: value, arrows: [{ point: from, direction: 'left' }, { point: to, direction: 'right' }], text: { point: { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 }, anchor: 'middle' } }
}

export function extensionLine(from: DrawingPoint, to: DrawingPoint, overrun: number = TECHNICAL_DRAWING_TOKENS.extensionOverrun) {
  const dx = to.x - from.x, dy = to.y - from.y
  const length = Math.hypot(dx, dy)
  if (!length) return { from, to }
  return { from: { x: from.x - dx / length * overrun, y: from.y - dy / length * overrun }, to: { x: to.x + dx / length * overrun, y: to.y + dy / length * overrun } }
}

export function dimensionExtensionLine(geometryAnchor: DrawingPoint, dimensionEndpoint: DrawingPoint, gap = TECHNICAL_DRAWING_TOKENS.extensionGap, overrun = TECHNICAL_DRAWING_TOKENS.extensionOverrun) {
  const dx = dimensionEndpoint.x - geometryAnchor.x, dy = dimensionEndpoint.y - geometryAnchor.y
  const length = Math.hypot(dx, dy)
  if (!length) return { from: geometryAnchor, to: dimensionEndpoint, dimensionIntersection: dimensionEndpoint } satisfies ExtensionLineGeometry
  return {
    from: { x: geometryAnchor.x + dx / length * gap, y: geometryAnchor.y + dy / length * gap },
    to: { x: dimensionEndpoint.x + dx / length * overrun, y: dimensionEndpoint.y + dy / length * overrun },
    dimensionIntersection: dimensionEndpoint,
  } satisfies ExtensionLineGeometry
}
