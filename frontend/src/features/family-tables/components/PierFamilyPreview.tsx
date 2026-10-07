import { readProjectState } from '../../project/model/projectWorkspace'
import type { FamilyAlternative } from '../../graph/family/familyResults'
import type { ProjectUnits } from '../../graph/domain/quantities'
import { formatDisplayValue, toDisplayValue } from '../../graph/domain/quantities'
import { computePierSectionProperties, type PierSectionKind } from '../../graph/domain/pierSectionProperties'
import { resolveHorizontalDimension, resolveVerticalDimension, dimensionExtensionLine } from '../../../shared/technical-drawing/DimensionGeometry'
import { formatTechnicalDimension } from '../../../shared/technical-drawing/DimensionFormatter'
import { makeBounds } from '../../../shared/technical-drawing/DrawingBounds'
import { computeTechnicalDrawingFit } from '../../../shared/technical-drawing/TechnicalDrawingFit'
import { useTechnicalDrawingViewport } from '../../../shared/technical-drawing/useTechnicalDrawingViewport'
import { useRef } from 'react'
import { DimensionGraphics, DimensionLabel } from '../../../shared/technical-drawing/components/DimensionLayers'
import { TECHNICAL_DRAWING_TOKENS } from '../../../shared/technical-drawing/TechnicalDrawingTokens'
import { buildPierSectionGeometry } from '../model/pierSectionGeometry'

const geometryOf = (candidate: FamilyAlternative) => ((candidate.candidateData as Record<string, unknown>).geometry ?? {}) as Record<string, unknown>
const numberOf = (candidate: FamilyAlternative, key: string) => { const value = Number(geometryOf(candidate)[key]); return Number.isFinite(value) ? value : undefined }
const dimension = (value: number, units: ProjectUnits) => formatTechnicalDimension(value, item => toDisplayValue(item, 'Length', units))
function shape(geometry: ReturnType<typeof buildPierSectionGeometry>, cx: number, cy: number, scale: number) {
  if (!geometry) return null
  const point = (item: { x: number; y: number }) => `${cx + item.x * scale},${cy - item.y * scale}`
  return <>{geometry.polygons.map((polygon, index) => <polygon key={index} className="spn-preview-section-fill spn-pier-section-shape" points={polygon.map(point).join(' ')} />)}{geometry.holes.map((hole, index) => <polygon key={`hole-${index}`} className="spn-pier-section-shape" fill="var(--spn-family-preview-background, #111820)" points={hole.map(point).join(' ')} />)}</>
}

export default function PierFamilyPreview({ kind, candidate, familyCandidates: _familyCandidates = [], projectUnits = readProjectState([]).project.units }: { kind: PierSectionKind; candidate: FamilyAlternative; familyCandidates?: readonly FamilyAlternative[]; projectUnits?: ProjectUnits }) {
  const viewportRef = useRef<HTMLDivElement>(null), viewport = useTechnicalDrawingViewport(viewportRef)
  const B = numberOf(candidate, 'B'), D = numberOf(candidate, 'D')
  if (B === undefined || D === undefined) return <p>Section preview is not available for this family.</p>
  const engineeringGeometry = buildPierSectionGeometry(kind, { B, D, w: numberOf(candidate, 'w') ?? 0, ft: numberOf(candidate, 'ft') ?? 0, wx: numberOf(candidate, 'wx') ?? 0, wy: numberOf(candidate, 'wy') ?? 0 })
  if (!engineeringGeometry) return <p>Section preview is not available for this family.</p>
  const geometry = engineeringGeometry
  if (!viewport) return <section ref={viewportRef} className="spn-pier-family-preview" aria-label={`${kind} Pier Preview`} />
  const geometryBounds = makeBounds(geometry.bounds.minX, geometry.bounds.maxX, geometry.bounds.minY, geometry.bounds.maxY), drawingEnvelope = geometryBounds, fit = computeTechnicalDrawingFit({ geometryBounds, drawingEnvelope, viewport, targetGeometryWidthRatio: .78, targetGeometryHeightRatio: .76, fixedAnnotationPadding: { x: 24, y: 24 } }); if (!fit) return <p>Section preview is not available for this family.</p>
  const scale = fit.scale, cx = fit.translateX, cy = fit.translateY, offset = Math.max(8, Math.min(18, Math.max(geometry.bounds.width, geometry.bounds.height) * scale * 0.08))
  const left = cx + geometry.bounds.minX * scale, right = cx + geometry.bounds.maxX * scale, top = cy - geometry.bounds.maxY * scale, bottom = cy - geometry.bounds.minY * scale, dimY = top - offset, dimX = right + offset
  const horizontal = resolveHorizontalDimension('B', 'B', { x: left, y: dimY }, { x: right, y: dimY }, dimension(B, projectUnits)); horizontal.extensionLines = [dimensionExtensionLine({ x: left, y: top }, { x: left, y: dimY }), dimensionExtensionLine({ x: right, y: top }, { x: right, y: dimY })]; horizontal.text = { point: { x: cx, y: dimY - 6 }, anchor: 'middle' }
  const vertical = resolveVerticalDimension('D', 'D', { x: dimX, y: top }, { x: dimX, y: bottom }, dimension(D, projectUnits)); vertical.extensionLines = [dimensionExtensionLine({ x: right, y: top }, { x: dimX, y: top }), dimensionExtensionLine({ x: right, y: bottom }, { x: dimX, y: bottom })]; vertical.text = { point: { x: dimX + 8, y: cy }, anchor: 'start', dominantBaseline: 'middle' }
  const boxWx = kind === 'box' ? numberOf(candidate, 'wx') : undefined, boxWy = kind === 'box' ? numberOf(candidate, 'wy') : undefined
  const boxWxX = cx + TECHNICAL_DRAWING_TOKENS.pierLocalDimensionOffset
  const boxWxDimension = boxWx ? resolveVerticalDimension('wx', 'wx', { x: boxWxX, y: top }, { x: boxWxX, y: top + boxWx * scale }, dimension(boxWx, projectUnits)) : undefined
  if (boxWxDimension) { boxWxDimension.extensionLines = [dimensionExtensionLine({ x: cx, y: top }, { x: boxWxX, y: top }), dimensionExtensionLine({ x: cx, y: top + boxWx! * scale }, { x: boxWxX, y: top + boxWx! * scale })]; boxWxDimension.text = { point: { x: boxWxX + 8, y: top + boxWx! * scale / 2 }, anchor: 'start', dominantBaseline: 'middle' } }
  const boxWyY = cy - TECHNICAL_DRAWING_TOKENS.pierLocalDimensionOffset
  const boxWyDimension = boxWy ? resolveHorizontalDimension('wy', 'wy', { x: right - boxWy * scale, y: boxWyY }, { x: right, y: boxWyY }, dimension(boxWy, projectUnits)) : undefined
  if (boxWyDimension) { boxWyDimension.extensionLines = [dimensionExtensionLine({ x: right - boxWy! * scale, y: cy }, { x: right - boxWy! * scale, y: boxWyY }), dimensionExtensionLine({ x: right, y: cy }, { x: right, y: boxWyY })]; boxWyDimension.text = { point: { x: right - boxWy! * scale / 2, y: boxWyY - 6 }, anchor: 'middle' } }
  const hExtra = kind === 'h_section' ? numberOf(candidate, 'ft') : undefined, wExtra = kind === 'h_section' ? numberOf(candidate, 'w') : undefined
  const ftDimension = hExtra ? resolveHorizontalDimension('ft', 'ft', { x: left, y: top + (hExtra * scale) }, { x: left + hExtra * scale, y: top + (hExtra * scale) }, dimension(hExtra, projectUnits)) : undefined
  const wDimension = wExtra ? resolveVerticalDimension('w', 'w', { x: cx + TECHNICAL_DRAWING_TOKENS.pierLocalDimensionOffset, y: cy - wExtra * scale / 2 }, { x: cx + TECHNICAL_DRAWING_TOKENS.pierLocalDimensionOffset, y: cy + wExtra * scale / 2 }, dimension(wExtra, projectUnits)) : undefined
  if (wDimension) { wDimension.extensionLines = [dimensionExtensionLine({ x: cx, y: cy - wExtra! * scale / 2 }, { x: cx + TECHNICAL_DRAWING_TOKENS.pierLocalDimensionOffset, y: cy - wExtra! * scale / 2 }), dimensionExtensionLine({ x: cx, y: cy + wExtra! * scale / 2 }, { x: cx + TECHNICAL_DRAWING_TOKENS.pierLocalDimensionOffset, y: cy + wExtra! * scale / 2 })]; wDimension.text = { point: { x: cx + TECHNICAL_DRAWING_TOKENS.pierLocalDimensionOffset + 8, y: cy }, anchor: 'start', dominantBaseline: 'middle' } }
  const dimensions = [horizontal, vertical, ...(ftDimension ? [ftDimension] : []), ...(wDimension ? [wDimension] : []), ...(boxWxDimension ? [boxWxDimension] : []), ...(boxWyDimension ? [boxWyDimension] : [])]
  return <section className="spn-pier-family-preview" aria-label={`${kind} Pier Preview`}><div ref={viewportRef} className="spn-girder-drawing-viewport"><svg viewBox={`0 0 ${viewport.width} ${viewport.height}`} preserveAspectRatio="xMidYMid meet" data-viewport-width={viewport.width} data-viewport-height={viewport.height} data-fit-scale={fit.scale} data-geometry-width={geometry.bounds.width} data-geometry-height={geometry.bounds.height} data-rendered-width={geometry.bounds.width * fit.scale} data-rendered-height={geometry.bounds.height * fit.scale} role="img" aria-label={`${kind} pier section B = ${dimension(B, projectUnits)}, D = ${dimension(D, projectUnits)}`}><g className="section-geometry-layer">{shape(geometry, cx, cy, scale)}</g><g className="section-axis-layer"><line className="spn-family-technical-axis" x1={left - 20} y1={cy} x2={right + 20} y2={cy} /><line className="spn-family-technical-axis" x1={cx} y1={top - 20} x2={cx} y2={bottom + 20} /></g><g className="section-dimension-graphics-layer">{dimensions.map(definition => <DimensionGraphics key={definition.id} definition={definition} />)}</g><g className="section-dimension-text-layer">{dimensions.map(definition => <DimensionLabel key={definition.id} definition={definition} />)}</g></svg></div></section>
}

export function PierSectionProperties({ kind, candidate, projectUnits = readProjectState([]).project.units }: { kind: PierSectionKind; candidate: FamilyAlternative; projectUnits?: ProjectUnits }) {
  const properties = computePierSectionProperties(kind, geometryOf(candidate)); if (!properties) return <div className="spn-family-empty">Section properties are not available for this family.</div>
  const rows = [['A', 'Cross-sectional Area', properties.area, 'Area'], ['Ix', 'Moment of Inertia', properties.ix, 'Length^4'], ['Iy', 'Moment of Inertia', properties.iy, 'Length^4'], ['Wx', 'Section Modulus', properties.wx, 'Volume'], ['Wy', 'Section Modulus', properties.wy, 'Volume']] as const
  return <section className="spn-girder-preview-properties" data-testid="section-properties">{rows.map(([symbol, description, value, unit]) => { const formatted = formatDisplayValue(value, unit, projectUnits).split(' '); return <p key={symbol}><span className="property-symbol">{symbol}</span><span className="property-description">{description}</span><strong className="property-value">{formatted[0]}</strong><span className="property-unit">{formatted.slice(1).join(' ')}</span></p> })}</section>
}
