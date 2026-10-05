export type PreviewBounds = { left: number; top: number; right: number; bottom: number }
export type SectionEnvelope = { width: number; height: number }
import { structuralSectionScale } from './SectionPreviewTokens'

export function structuralSectionPreviewLayout(width: number, height: number, maximumEnvelope: SectionEnvelope, selectedEnvelope: SectionEnvelope = maximumEnvelope, bands: { bottom?: number; top?: number; left?: number; right?: number } = {}) {
  const inset = 20
  const safeBounds: PreviewBounds = { left: inset, top: inset, right: Math.max(inset, width - inset), bottom: Math.max(inset, height - inset) }
  // Axis overlays and labels are reference annotations; they do not reduce the geometry fit area.
  const geometryFitBounds: PreviewBounds = { left: safeBounds.left + (bands.left ?? 0), top: safeBounds.top + (bands.top ?? 0), right: safeBounds.right - (bands.right ?? 0), bottom: safeBounds.bottom - (bands.bottom ?? 0) }
  const availableWidth = Math.max(0, geometryFitBounds.right - geometryFitBounds.left), availableHeight = Math.max(0, geometryFitBounds.bottom - geometryFitBounds.top)
  const referenceScale = structuralSectionScale(maximumEnvelope, { width: availableWidth, height: availableHeight })
  const sectionOrigin = { x: (geometryFitBounds.left + geometryFitBounds.right) / 2, y: (geometryFitBounds.top + geometryFitBounds.bottom) / 2 }
  const selectedWidth = selectedEnvelope.width * referenceScale, selectedHeight = selectedEnvelope.height * referenceScale
  const axisExtensionX = Math.min(24, Math.max(12, selectedWidth * 0.18)), axisExtensionY = Math.min(24, Math.max(12, selectedHeight * 0.18))
  const dynamicAxes = { xAxis: { x1: sectionOrigin.x - selectedWidth / 2 - axisExtensionX, x2: sectionOrigin.x + selectedWidth / 2 + axisExtensionX, y: sectionOrigin.y }, yAxis: { x: sectionOrigin.x, y1: sectionOrigin.y - selectedHeight / 2 - axisExtensionY, y2: sectionOrigin.y + selectedHeight / 2 + axisExtensionY } }
  return {
    safeBounds, geometryFitBounds, referenceScale, sectionOrigin,
    xAxis: dynamicAxes.xAxis,
    yAxis: dynamicAxes.yAxis,
    axisLabelNormalOffset: 4,
    axisLabelEdgeInset: 3,
    xLabel: { x: dynamicAxes.xAxis.x2 - 3, y: dynamicAxes.xAxis.y - 4, anchor: 'end' as const },
    yLabel: { x: dynamicAxes.yAxis.x + 4, y: dynamicAxes.yAxis.y1 + 10, anchor: 'start' as const },
    annotationLanes: { top: safeBounds.top + 10, right: safeBounds.right - 10, bottom: safeBounds.bottom - 10, left: safeBounds.left + 10 },
    dimensionOffset: (characteristicSize: number) => Math.min(18, Math.max(8, characteristicSize * 0.08)),
  }
}
