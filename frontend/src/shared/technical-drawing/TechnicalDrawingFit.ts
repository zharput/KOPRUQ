import type { DrawingBounds } from './DrawingBounds'

export type FitViewport = { width: number; height: number }
export type FitPadding = { top: number; right: number; bottom: number; left: number }
export type TechnicalDrawingFit = { scale: number; scaleX: number; scaleY: number; translateX: number; translateY: number; geometryBounds: DrawingBounds; drawingEnvelope: DrawingBounds; availableBounds: DrawingBounds; baseScale: number; maximumContainedScale: number; scaleLimited: boolean; targetGeometryWidth: number; targetGeometryHeight: number }
function validBounds(bounds: DrawingBounds) { return Number.isFinite(bounds.minX) && Number.isFinite(bounds.maxX) && Number.isFinite(bounds.minY) && Number.isFinite(bounds.maxY) && bounds.width > 0 && bounds.height > 0 }
function bounds(minX: number, maxX: number, minY: number, maxY: number): DrawingBounds { return { minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY, centerX: (minX + maxX) / 2, centerY: (minY + maxY) / 2 } }

/** Uniform viewport-utilization fit with fixed drawing-space annotation clearance. */
export function computeTechnicalDrawingFit({ geometryBounds, drawingEnvelope = geometryBounds, viewport, safePadding = { top: 24, right: 24, bottom: 24, left: 24 }, targetGeometryWidthRatio = 0.72, targetGeometryHeightRatio = 0.68, fixedAnnotationPadding = { x: 56, y: 32 } }: { geometryBounds: DrawingBounds; drawingEnvelope?: DrawingBounds; viewport: FitViewport; safePadding?: FitPadding; targetGeometryWidthRatio?: number; targetGeometryHeightRatio?: number; fixedAnnotationPadding?: { x: number; y: number } }): TechnicalDrawingFit | undefined {
  if (!validBounds(geometryBounds) || !validBounds(drawingEnvelope) || !(viewport.width > 0) || !(viewport.height > 0)) return undefined
  const availableBounds = bounds(safePadding.left, viewport.width - safePadding.right, safePadding.top, viewport.height - safePadding.bottom)
  if (!validBounds(availableBounds)) return undefined
  const targetGeometryWidth = availableBounds.width * targetGeometryWidthRatio, targetGeometryHeight = availableBounds.height * targetGeometryHeightRatio
  const baseScale = Math.min(targetGeometryWidth / geometryBounds.width, targetGeometryHeight / geometryBounds.height)
  const centerX = viewport.width / 2, centerY = viewport.height / 2
  const halfWidth = Math.max(Math.abs(geometryBounds.minX - geometryBounds.centerX), Math.abs(geometryBounds.maxX - geometryBounds.centerX))
  const halfHeight = Math.max(Math.abs(geometryBounds.minY - geometryBounds.centerY), Math.abs(geometryBounds.maxY - geometryBounds.centerY))
  const maximumContainedScale = Math.min((centerX - safePadding.left - fixedAnnotationPadding.x) / halfWidth, (centerY - safePadding.top - fixedAnnotationPadding.y) / halfHeight)
  const scale = Math.min(baseScale, maximumContainedScale)
  if (!Number.isFinite(scale) || scale <= 0) return undefined
  return { scale, scaleX: scale, scaleY: scale, translateX: centerX - geometryBounds.centerX * scale, translateY: centerY - geometryBounds.centerY * scale, geometryBounds, drawingEnvelope, availableBounds, baseScale, maximumContainedScale, scaleLimited: scale < baseScale, targetGeometryWidth, targetGeometryHeight }
}
