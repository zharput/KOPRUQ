import type { DrawingBounds } from './DrawingBounds'

export type FitViewport = { width: number; height: number }
export type FitPadding = { top: number; right: number; bottom: number; left: number }
export type TechnicalDrawingFit = { scale: number; scaleX: number; scaleY: number; translateX: number; translateY: number; geometryBounds: DrawingBounds; drawingEnvelope: DrawingBounds; availableBounds: DrawingBounds; baseScale: number; requestedScale: number; maximumContainedScale: number; scaleLimited: boolean }

function validBounds(bounds: DrawingBounds) { return Number.isFinite(bounds.minX) && Number.isFinite(bounds.maxX) && Number.isFinite(bounds.minY) && Number.isFinite(bounds.maxY) && bounds.width > 0 && bounds.height > 0 }
function bounds(minX: number, maxX: number, minY: number, maxY: number): DrawingBounds { return { minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY, centerX: (minX + maxX) / 2, centerY: (minY + maxY) / 2 } }

export function computeTechnicalDrawingFit({ geometryBounds, drawingEnvelope, viewport, safePadding = { top: 24, right: 24, bottom: 24, left: 24 } }: { geometryBounds: DrawingBounds; drawingEnvelope: DrawingBounds; viewport: FitViewport; safePadding?: FitPadding }): TechnicalDrawingFit | undefined {
  if (!validBounds(geometryBounds) || !validBounds(drawingEnvelope) || !(viewport.width > 0) || !(viewport.height > 0)) return undefined
  const availableBounds = bounds(safePadding.left, viewport.width - safePadding.right, safePadding.top, viewport.height - safePadding.bottom)
  if (!validBounds(availableBounds)) return undefined
  const scale = Math.min(availableBounds.width / drawingEnvelope.width, availableBounds.height / drawingEnvelope.height)
  if (!Number.isFinite(scale) || scale <= 0) return undefined
  return { scale, scaleX: scale, scaleY: scale, translateX: availableBounds.centerX - drawingEnvelope.centerX * scale, translateY: availableBounds.centerY - drawingEnvelope.centerY * scale, geometryBounds, drawingEnvelope, availableBounds, baseScale: scale, requestedScale: scale, maximumContainedScale: scale, scaleLimited: false }
}

/** Applies presentation zoom while keeping the geometry centre fixed in the viewport. */
export function computeTechnicalDrawingVisualFit({ geometryBounds, drawingEnvelope, viewport, visualScaleFactor, safePadding = { top: 24, right: 24, bottom: 24, left: 24 } }: { geometryBounds: DrawingBounds; drawingEnvelope: DrawingBounds; viewport: FitViewport; visualScaleFactor: number; safePadding?: FitPadding }): TechnicalDrawingFit | undefined {
  // The engineering geometry determines the base zoom. The envelope margin is
  // annotation clearance in drawing space and must not be multiplied by the
  // geometry scale.
  const base = computeTechnicalDrawingFit({ geometryBounds, drawingEnvelope: geometryBounds, viewport, safePadding })
  if (!base || !Number.isFinite(visualScaleFactor) || visualScaleFactor <= 0) return base
  const centerX = base.availableBounds.centerX
  const centerY = base.availableBounds.centerY
  const annotationPaddingX = Math.max(Math.abs(drawingEnvelope.minX - geometryBounds.minX), Math.abs(drawingEnvelope.maxX - geometryBounds.maxX))
  const annotationPaddingY = Math.max(Math.abs(drawingEnvelope.minY - geometryBounds.minY), Math.abs(drawingEnvelope.maxY - geometryBounds.maxY))
  const maxScaleX = (Math.min(centerX - base.availableBounds.minX, base.availableBounds.maxX - centerX) - annotationPaddingX) / Math.max(Math.abs(geometryBounds.minX - geometryBounds.centerX), Math.abs(geometryBounds.maxX - geometryBounds.centerX))
  const maxScaleY = (Math.min(centerY - base.availableBounds.minY, base.availableBounds.maxY - centerY) - annotationPaddingY) / Math.max(Math.abs(geometryBounds.minY - geometryBounds.centerY), Math.abs(geometryBounds.maxY - geometryBounds.centerY))
  const scale = Math.min(base.scale * visualScaleFactor, maxScaleX, maxScaleY)
  if (!Number.isFinite(scale) || scale <= 0) return base
  return { ...base, scale, scaleX: scale, scaleY: scale, translateX: centerX - geometryBounds.centerX * scale, translateY: centerY - geometryBounds.centerY * scale, baseScale: base.scale, requestedScale: base.scale * visualScaleFactor, maximumContainedScale: Math.min(maxScaleX, maxScaleY), scaleLimited: scale < base.scale * visualScaleFactor }
}
