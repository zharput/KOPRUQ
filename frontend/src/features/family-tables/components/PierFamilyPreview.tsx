import { readProjectState } from '../../project/model/projectWorkspace'
import type { FamilyAlternative } from '../../graph/family/familyResults'
import type { ProjectUnits } from '../../graph/domain/quantities'
import { formatDisplayValue, toDisplayValue } from '../../graph/domain/quantities'
import { computePierSectionProperties, type PierSectionKind } from '../../graph/domain/pierSectionProperties'
import { HorizontalDimension } from '../../../shared/technical-drawing/components/HorizontalDimension'
import { VerticalDimension } from '../../../shared/technical-drawing/components/VerticalDimension'
import { resolveHorizontalDimension, resolveVerticalDimension, dimensionExtensionLine } from '../../../shared/technical-drawing/DimensionGeometry'
import { formatTechnicalDimension } from '../../../shared/technical-drawing/DimensionFormatter'
import { makeBounds } from '../../../shared/technical-drawing/DrawingBounds'
import { computeTechnicalDrawingFit } from '../../../shared/technical-drawing/TechnicalDrawingFit'
import { useTechnicalDrawingViewport } from '../../../shared/technical-drawing/useTechnicalDrawingViewport'
import { useRef } from 'react'
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
  const engineeringGeometry = buildPierSectionGeometry(kind, { B, D, tw: numberOf(candidate, 'tw') ?? 0, tf: numberOf(candidate, 'tf') ?? 0 })
  if (!engineeringGeometry) return <p>Section preview is not available for this family.</p>
  const geometry = engineeringGeometry
  if (!viewport) return <section ref={viewportRef} className="spn-pier-family-preview" aria-label={`${kind} Pier Preview`} />
  const geometryBounds = makeBounds(geometry.bounds.minX, geometry.bounds.maxX, geometry.bounds.minY, geometry.bounds.maxY), drawingEnvelope = geometryBounds, fit = computeTechnicalDrawingFit({ geometryBounds, drawingEnvelope, viewport, fixedAnnotationPadding: { x: 56, y: 32 } }); if (!fit) return <p>Section preview is not available for this family.</p>
  const scale = fit.scale, cx = fit.translateX, cy = fit.translateY, offset = Math.max(8, Math.min(18, Math.max(geometry.bounds.width, geometry.bounds.height) * scale * 0.08))
  const left = cx + geometry.bounds.minX * scale, right = cx + geometry.bounds.maxX * scale, top = cy - geometry.bounds.maxY * scale, bottom = cy - geometry.bounds.minY * scale, dimY = top - offset, dimX = right + offset
  const horizontal = resolveHorizontalDimension('B', 'B', { x: left, y: dimY }, { x: right, y: dimY }, dimension(B, projectUnits)); horizontal.extensionLines = [dimensionExtensionLine({ x: left, y: top }, { x: left, y: dimY }), dimensionExtensionLine({ x: right, y: top }, { x: right, y: dimY })]; horizontal.text = { point: { x: cx, y: dimY - 6 }, anchor: 'middle' }
  const vertical = resolveVerticalDimension('D', 'D', { x: dimX, y: top }, { x: dimX, y: bottom }, dimension(D, projectUnits)); vertical.extensionLines = [dimensionExtensionLine({ x: right, y: top }, { x: dimX, y: top }), dimensionExtensionLine({ x: right, y: bottom }, { x: dimX, y: bottom })]; vertical.text = { point: { x: dimX + 8, y: cy }, anchor: 'start', dominantBaseline: 'middle' }
  return <section ref={viewportRef} className="spn-pier-family-preview" aria-label={`${kind} Pier Preview`}><svg viewBox={`0 0 ${viewport.width} ${viewport.height}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label={`${kind} pier section B = ${dimension(B, projectUnits)}, D = ${dimension(D, projectUnits)}`}><line className="spn-family-technical-axis" x1={left - 20} y1={cy} x2={right + 20} y2={cy} /><line className="spn-family-technical-axis" x1={cx} y1={top - 20} x2={cx} y2={bottom + 20} />{shape(geometry, cx, cy, scale)}<g className="spn-technical-dimension"><HorizontalDimension definition={horizontal} /><VerticalDimension definition={vertical} /></g></svg></section>
}

export function PierSectionProperties({ kind, candidate, projectUnits = readProjectState([]).project.units }: { kind: PierSectionKind; candidate: FamilyAlternative; projectUnits?: ProjectUnits }) {
  const properties = computePierSectionProperties(kind, geometryOf(candidate)); if (!properties) return <div className="spn-family-empty">Section properties are not available for this family.</div>
  const rows = [['A', 'Cross-sectional Area', properties.area, 'Area'], ['Ix', 'Moment of Inertia', properties.ix, 'Length^4'], ['Iy', 'Moment of Inertia', properties.iy, 'Length^4'], ['Wx', 'Section Modulus', properties.wx, 'Volume'], ['Wy', 'Section Modulus', properties.wy, 'Volume']] as const
  return <section className="spn-girder-preview-properties" data-testid="section-properties">{rows.map(([symbol, description, value, unit]) => { const formatted = formatDisplayValue(value, unit, projectUnits).split(' '); return <p key={symbol}><span className="property-symbol">{symbol}</span><span className="property-description">{description}</span><strong className="property-value">{formatted[0]}</strong><span className="property-unit">{formatted.slice(1).join(' ')}</span></p> })}</section>
}
