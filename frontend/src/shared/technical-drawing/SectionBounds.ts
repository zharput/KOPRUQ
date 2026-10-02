import type { DrawingPoint } from './DimensionTypes'

export type SectionBounds = { minX: number; maxX: number; minY: number; maxY: number; width: number; height: number; centerX: number; centerY: number }

export function sectionBounds(points: readonly DrawingPoint[]): SectionBounds {
  if (!points.length) throw new Error('A section requires at least one point')
  const xs = points.map((p) => p.x), ys = points.map((p) => p.y)
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys)
  return { minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY, centerX: (minX + maxX) / 2, centerY: (minY + maxY) / 2 }
}
