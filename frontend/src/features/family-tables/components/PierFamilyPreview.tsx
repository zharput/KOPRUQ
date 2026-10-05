import { readProjectState } from '../../project/model/projectWorkspace'
import type { FamilyAlternative } from '../../graph/family/familyResults'
import type { ProjectUnits } from '../../graph/domain/quantities'
import { formatDisplayValue, toDisplayValue } from '../../graph/domain/quantities'
import { computePierSectionProperties, type PierSectionKind } from '../../graph/domain/pierSectionProperties'
import { HorizontalDimension } from '../../../shared/technical-drawing/components/HorizontalDimension'
import { VerticalDimension } from '../../../shared/technical-drawing/components/VerticalDimension'
import { resolveHorizontalDimension, resolveVerticalDimension, dimensionExtensionLine } from '../../../shared/technical-drawing/DimensionGeometry'
import { formatTechnicalDimension } from '../../../shared/technical-drawing/DimensionFormatter'
import { structuralSectionPreviewLayout } from '../../../shared/technical-drawing/StructuralSectionPreviewLayout'
import { buildPierSectionGeometry } from '../model/pierSectionGeometry'

const geometryOf = (candidate: FamilyAlternative) => ((candidate.candidateData as Record<string, unknown>).geometry ?? {}) as Record<string, unknown>
const numberOf = (candidate: FamilyAlternative, key: string) => { const value = Number(geometryOf(candidate)[key]); return Number.isFinite(value) ? value : undefined }
const dimension = (value: number, units: ProjectUnits) => formatTechnicalDimension(value, item => toDisplayValue(item, 'Length', units))
function maximumEnvelope(kind: PierSectionKind, candidates: readonly FamilyAlternative[], fallback: NonNullable<ReturnType<typeof buildPierSectionGeometry>>) {
  const geometries = candidates.map(item => { const B = numberOf(item, 'B'), D = numberOf(item, 'D'); return B !== undefined && D !== undefined ? buildPierSectionGeometry(kind, { B, D, tw: numberOf(item, 'tw') ?? 0, tf: numberOf(item, 'tf') ?? 0 }) : undefined }).filter((item): item is NonNullable<typeof fallback> => item !== undefined)
  const all = geometries.length ? geometries : [fallback]
  return { width: Math.max(...all.map(item => item.bounds.width)), height: Math.max(...all.map(item => item.bounds.height)) }
}

function shape(geometry: ReturnType<typeof buildPierSectionGeometry>, cx: number, cy: number, scale: number) {
  if (!geometry) return null
  const point = (item: { x: number; y: number }) => `${cx + item.x * scale},${cy - item.y * scale}`
  return <>{geometry.polygons.map((polygon, index) => <polygon key={index} className="spn-preview-section-fill spn-pier-section-shape" points={polygon.map(point).join(' ')} />)}{geometry.holes.map((hole, index) => <polygon key={`hole-${index}`} className="spn-pier-section-shape" fill="var(--spn-family-preview-background, #111820)" points={hole.map(point).join(' ')} />)}</>
}

export default function PierFamilyPreview({ kind, candidate, familyCandidates = [], projectUnits = readProjectState([]).project.units }: { kind: PierSectionKind; candidate: FamilyAlternative; familyCandidates?: readonly FamilyAlternative[]; projectUnits?: ProjectUnits }) {
  const B = numberOf(candidate, 'B'), D = numberOf(candidate, 'D')
  if (B === undefined || D === undefined) return <p>Section preview is not available for this family.</p>
  const geometry = buildPierSectionGeometry(kind, { B, D, tw: numberOf(candidate, 'tw') ?? 0, tf: numberOf(candidate, 'tf') ?? 0 })
  if (!geometry) return <p>Section preview is not available for this family.</p>
  const layout = structuralSectionPreviewLayout(300, 270, maximumEnvelope(kind, familyCandidates, geometry), geometry.bounds), scale = layout.referenceScale, cx = layout.sectionOrigin.x, cy = layout.sectionOrigin.y
  const left = cx + geometry.bounds.minX * scale, right = cx + geometry.bounds.maxX * scale, top = cy - geometry.bounds.maxY * scale, bottom = cy - geometry.bounds.minY * scale, dimY = top - layout.dimensionOffset(geometry.bounds.height * scale), dimX = right + layout.dimensionOffset(geometry.bounds.width * scale)
  const horizontal = resolveHorizontalDimension('D', 'D', { x: left, y: dimY }, { x: right, y: dimY }, dimension(D, projectUnits)); horizontal.extensionLines = [dimensionExtensionLine({ x: left, y: top }, { x: left, y: dimY }), dimensionExtensionLine({ x: right, y: top }, { x: right, y: dimY })]; horizontal.text = { point: { x: cx, y: dimY - 6 }, anchor: 'middle' }
  const vertical = resolveVerticalDimension('B', 'B', { x: dimX, y: top }, { x: dimX, y: bottom }, dimension(B, projectUnits)); vertical.extensionLines = [dimensionExtensionLine({ x: right, y: top }, { x: dimX, y: top }), dimensionExtensionLine({ x: right, y: bottom }, { x: dimX, y: bottom })]; vertical.text = { point: { x: dimX + 8, y: cy }, anchor: 'start', dominantBaseline: 'middle' }
  return <section className="spn-pier-family-preview" aria-label={`${kind} Pier Preview`}><svg viewBox="0 0 300 270" preserveAspectRatio="xMidYMid meet" role="img" aria-label={`${kind} pier section B = ${dimension(B, projectUnits)}, D = ${dimension(D, projectUnits)}`}><line className="spn-family-technical-axis" x1={layout.xAxis.x1} y1={layout.xAxis.y} x2={layout.xAxis.x2} y2={layout.xAxis.y} /><line className="spn-family-technical-axis" x1={layout.yAxis.x} y1={layout.yAxis.y1} x2={layout.yAxis.x} y2={layout.yAxis.y2} />{shape(geometry, cx, cy, scale)}<g className="spn-technical-dimension"><HorizontalDimension definition={horizontal} /><VerticalDimension definition={vertical} /></g><text className="spn-family-technical-axis-label" x={layout.xLabel.x} y={layout.xLabel.y} textAnchor={layout.xLabel.anchor}>X</text><text className="spn-family-technical-axis-label" x={layout.yLabel.x} y={layout.yLabel.y} textAnchor={layout.yLabel.anchor}>Y</text></svg></section>
}

export function PierSectionProperties({ kind, candidate, projectUnits = readProjectState([]).project.units }: { kind: PierSectionKind; candidate: FamilyAlternative; projectUnits?: ProjectUnits }) {
  const properties = computePierSectionProperties(kind, geometryOf(candidate)); if (!properties) return <div className="spn-family-empty">Section properties are not available for this family.</div>
  const rows = [['A', 'Cross-sectional Area', properties.area, 'Area'], ['Ix', 'Moment of Inertia (X)', properties.ix, 'Length^4'], ['Iy', 'Moment of Inertia (Y)', properties.iy, 'Length^4'], ['Wx', 'Section Modulus (X)', properties.wx, 'Volume'], ['Wy', 'Section Modulus (Y)', properties.wy, 'Volume']] as const
  return <section className="spn-girder-preview-properties" data-testid="section-properties">{rows.map(([symbol, description, value, unit]) => { const formatted = formatDisplayValue(value, unit, projectUnits).split(' '); return <p key={symbol}><span className="property-symbol">{symbol}</span><span className="property-description">{description}</span><strong className="property-value">{formatted[0]}</strong><span className="property-unit">{formatted.slice(1).join(' ')}</span></p> })}</section>
}
