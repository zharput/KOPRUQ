import { readProjectState } from '../../project/model/projectWorkspace'
import type { FamilyAlternative } from '../../graph/family/familyResults'
import type { ProjectUnits } from '../../graph/domain/quantities'
import { formatDisplayValue, toDisplayValue } from '../../graph/domain/quantities'
import { computeCircularSectionProperties } from '../../graph/domain/circularSectionProperties'
import { HorizontalDimension } from '../../../shared/technical-drawing/components/HorizontalDimension'
import { resolveHorizontalDimension, dimensionExtensionLine } from '../../../shared/technical-drawing/DimensionGeometry'
import { formatTechnicalDimension } from '../../../shared/technical-drawing/DimensionFormatter'
import { structuralSectionPreviewLayout } from '../../../shared/technical-drawing/StructuralSectionPreviewLayout'

function diameterOf(candidate: FamilyAlternative) { const geometry = (candidate.candidateData as Record<string, unknown>).geometry as Record<string, unknown> | undefined; return typeof geometry?.D === 'number' ? geometry.D : undefined }
function displayDimension(value: number, units: ProjectUnits) { return formatTechnicalDimension(value, item => toDisplayValue(item, 'Length', units)) }
export function circularDimensionGeometry(cx: number, cy: number, radius: number, offset: number) {
  const left = cx - radius, right = cx + radius, bottom = cy + radius, dimensionY = bottom + offset
  return { left, right, bottom, dimensionY }
}

export default function CircularPierFamilyPreview({ candidate, familyCandidates = [], projectUnits = readProjectState([]).project.units }: { candidate: FamilyAlternative; familyCandidates?: readonly FamilyAlternative[]; projectUnits?: ProjectUnits }) {
  const diameter = diameterOf(candidate)
  if (diameter === undefined) return <p>Section preview is not available for this family.</p>
  const referenceDiameter = Math.max(diameter, ...familyCandidates.map(item => diameterOf(item) ?? 0)), layout = structuralSectionPreviewLayout(300, 270, { width: referenceDiameter, height: referenceDiameter }, { width: diameter, height: diameter }, { bottom: 42 }), radius = diameter * layout.referenceScale / 2, cx = layout.sectionOrigin.x, cy = layout.sectionOrigin.y, spacing = circularDimensionGeometry(cx, cy, radius, layout.dimensionOffset(radius * 2)), dimensionY = spacing.dimensionY
  const dimension = resolveHorizontalDimension('D', 'D', { x: spacing.left, y: dimensionY }, { x: spacing.right, y: dimensionY }, displayDimension(diameter, projectUnits))
  dimension.extensionLines = [dimensionExtensionLine({ x: spacing.left, y: spacing.bottom }, { x: spacing.left, y: dimensionY }), dimensionExtensionLine({ x: spacing.right, y: spacing.bottom }, { x: spacing.right, y: dimensionY })]
  dimension.text = { point: { x: cx, y: dimensionY + 15 }, anchor: 'middle' }
  return <section className="spn-circular-pier-preview" aria-label="Circular Pier Preview"><svg viewBox="0 0 300 270" preserveAspectRatio="xMidYMid meet" role="img" aria-label={`Circular pier section D = ${displayDimension(diameter, projectUnits)}`}><line className="spn-family-technical-axis" x1={layout.xAxis.x1} y1={layout.xAxis.y} x2={layout.xAxis.x2} y2={layout.xAxis.y} /><line className="spn-family-technical-axis" x1={layout.yAxis.x} y1={layout.yAxis.y1} x2={layout.yAxis.x} y2={layout.yAxis.y2} /><circle className="spn-preview-section-fill" cx={cx} cy={cy} r={radius} /><g className="spn-technical-dimension"><HorizontalDimension definition={dimension} /></g><text className="spn-family-technical-axis-label" x={layout.xLabel.x} y={layout.xLabel.y} textAnchor={layout.xLabel.anchor}>X</text><text className="spn-family-technical-axis-label" x={layout.yLabel.x} y={layout.yLabel.y} textAnchor={layout.yLabel.anchor}>Y</text></svg></section>
}

export function CircularPierSectionProperties({ candidate, projectUnits = readProjectState([]).project.units }: { candidate: FamilyAlternative; projectUnits?: ProjectUnits }) {
  const diameter = diameterOf(candidate)
  if (diameter === undefined) return <div className="spn-family-empty">Section properties are not available for this family.</div>
  const p = computeCircularSectionProperties(diameter)
  const rows = [['A', 'Cross-sectional Area', p.area, 'Area'], ['Ix', 'Moment of Inertia (X)', p.ix, 'Length^4'], ['Iy', 'Moment of Inertia (Y)', p.iy, 'Length^4'], ['Wx', 'Section Modulus (X)', p.wx, 'Volume'], ['Wy', 'Section Modulus (Y)', p.wy, 'Volume']] as const
  return <section className="spn-girder-preview-properties" data-testid="section-properties">{rows.map(([symbol, description, value, dimension]) => { const formatted = formatDisplayValue(value, dimension, projectUnits).split(' '); return <p key={symbol}><span className="property-symbol">{symbol}</span><span className="property-description">{description}</span><strong className="property-value">{formatted[0]}</strong><span className="property-unit">{formatted.slice(1).join(' ')}</span></p>})}</section>
}
