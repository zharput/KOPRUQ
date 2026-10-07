import { readProjectState } from '../../project/model/projectWorkspace'
import type { FamilyAlternative } from '../../graph/family/familyResults'
import type { ProjectUnits } from '../../graph/domain/quantities'
import { formatDisplayValue, toDisplayValue } from '../../graph/domain/quantities'
import { computeCircularSectionProperties } from '../../graph/domain/circularSectionProperties'
import { HorizontalDimension } from '../../../shared/technical-drawing/components/HorizontalDimension'
import { resolveHorizontalDimension, dimensionExtensionLine } from '../../../shared/technical-drawing/DimensionGeometry'
import { formatTechnicalDimension } from '../../../shared/technical-drawing/DimensionFormatter'
import { makeBounds } from '../../../shared/technical-drawing/DrawingBounds'
import { computeTechnicalDrawingFit } from '../../../shared/technical-drawing/TechnicalDrawingFit'
import { useTechnicalDrawingViewport } from '../../../shared/technical-drawing/useTechnicalDrawingViewport'
import { useRef } from 'react'

function diameterOf(candidate: FamilyAlternative) { const geometry = (candidate.candidateData as Record<string, unknown>).geometry as Record<string, unknown> | undefined; return typeof geometry?.D === 'number' ? geometry.D : undefined }
function displayDimension(value: number, units: ProjectUnits) { return formatTechnicalDimension(value, item => toDisplayValue(item, 'Length', units)) }
export function circularDimensionGeometry(cx: number, cy: number, radius: number, offset: number) {
  const left = cx - radius, right = cx + radius, bottom = cy + radius, dimensionY = bottom + offset
  return { left, right, bottom, dimensionY }
}

export default function CircularPierFamilyPreview({ candidate, projectUnits = readProjectState([]).project.units }: { candidate: FamilyAlternative; familyCandidates?: readonly FamilyAlternative[]; projectUnits?: ProjectUnits }) {
  const viewportRef = useRef<HTMLDivElement>(null), viewport = useTechnicalDrawingViewport(viewportRef)
  const diameter = diameterOf(candidate)
  if (diameter === undefined) return <p>Section preview is not available for this family.</p>
  if (!viewport) return <section ref={viewportRef} className="spn-circular-pier-preview" aria-label="Circular Pier Preview" />
  const engineeringBounds = makeBounds(-diameter / 2, diameter / 2, -diameter / 2, diameter / 2), drawingEnvelope = engineeringBounds, fit = computeTechnicalDrawingFit({ geometryBounds: engineeringBounds, drawingEnvelope, viewport, fixedAnnotationPadding: { x: 56, y: 32 } }); if (!fit) return <p>Section preview is not available for this family.</p>
  const radius = diameter * fit.scale / 2, cx = fit.translateX, cy = fit.translateY, spacing = circularDimensionGeometry(cx, cy, radius, Math.max(8, Math.min(18, radius * 0.08))), dimensionY = spacing.dimensionY
  const dimension = resolveHorizontalDimension('D', 'D', { x: spacing.left, y: dimensionY }, { x: spacing.right, y: dimensionY }, displayDimension(diameter, projectUnits))
  dimension.extensionLines = [dimensionExtensionLine({ x: spacing.left, y: spacing.bottom }, { x: spacing.left, y: dimensionY }), dimensionExtensionLine({ x: spacing.right, y: spacing.bottom }, { x: spacing.right, y: dimensionY })]
  dimension.text = { point: { x: cx, y: dimensionY + 15 }, anchor: 'middle' }
  return <section ref={viewportRef} className="spn-circular-pier-preview" aria-label="Circular Pier Preview"><svg viewBox={`0 0 ${viewport.width} ${viewport.height}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label={`Circular pier section D = ${displayDimension(diameter, projectUnits)}`}><line className="spn-family-technical-axis" x1={cx - radius - 20} y1={cy} x2={cx + radius + 20} y2={cy} /><line className="spn-family-technical-axis" x1={cx} y1={cy - radius - 20} x2={cx} y2={cy + radius + 20} /><circle className="spn-preview-section-fill" cx={cx} cy={cy} r={radius} /><g className="spn-technical-dimension"><HorizontalDimension definition={dimension} /></g></svg></section>
}

export function CircularPierSectionProperties({ candidate, projectUnits = readProjectState([]).project.units }: { candidate: FamilyAlternative; projectUnits?: ProjectUnits }) {
  const diameter = diameterOf(candidate)
  if (diameter === undefined) return <div className="spn-family-empty">Section properties are not available for this family.</div>
  const p = computeCircularSectionProperties(diameter)
  const rows = [['A', 'Cross-sectional Area', p.area, 'Area'], ['Ix', 'Moment of Inertia', p.ix, 'Length^4'], ['Iy', 'Moment of Inertia', p.iy, 'Length^4'], ['Wx', 'Section Modulus', p.wx, 'Volume'], ['Wy', 'Section Modulus', p.wy, 'Volume']] as const
  return <section className="spn-girder-preview-properties" data-testid="section-properties">{rows.map(([symbol, description, value, dimension]) => { const formatted = formatDisplayValue(value, dimension, projectUnits).split(' '); return <p key={symbol}><span className="property-symbol">{symbol}</span><span className="property-description">{description}</span><strong className="property-value">{formatted[0]}</strong><span className="property-unit">{formatted.slice(1).join(' ')}</span></p>})}</section>
}
