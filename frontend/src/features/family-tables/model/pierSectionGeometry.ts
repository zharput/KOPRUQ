import type { PierSectionKind } from '../../graph/domain/pierSectionProperties'
export type PierGeometryKind = PierSectionKind | 'circular'

export type Point = { x: number; y: number }
export type PierSectionGeometry = {
  kind: PierGeometryKind
  polygons: readonly (readonly Point[])[]
  holes: readonly (readonly Point[])[]
  bounds: { minX: number; maxX: number; minY: number; maxY: number; width: number; height: number; centerX: number; centerY: number }
  centroid: Point
  circle?: { center: Point; radius: number }
  oval?: { radius: number; straightLength: number; topLeft: Point; topRight: Point; bottomRight: Point; bottomLeft: Point }
  dimensionAnchors: { horizontal: readonly [Point, Point]; vertical: readonly [Point, Point] }
}

function bounds(points: readonly Point[]) {
  const xs = points.map(point => point.x), ys = points.map(point => point.y)
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys)
  return { minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY, centerX: (minX + maxX) / 2, centerY: (minY + maxY) / 2 }
}

export function buildPierSectionGeometry(kind: PierGeometryKind, values: Readonly<Record<string, number>>): PierSectionGeometry | undefined {
  const B = values.B, D = values.D
  if (kind === 'circular') {
    if (!(D > 0)) return undefined
    const radius = D / 2, center = { x: 0, y: 0 }, all = [{ x: -radius, y: -radius }, { x: radius, y: radius }]
    return { kind, polygons: [], holes: [], bounds: bounds(all), centroid: center, circle: { center, radius }, dimensionAnchors: { horizontal: [{ x: -radius, y: 0 }, { x: radius, y: 0 }], vertical: [{ x: radius, y: -radius }, { x: radius, y: radius }] } }
  }
  if (!(B > 0 && D > 0)) return undefined
  const left = -D / 2, right = D / 2, top = B / 2, bottom = -B / 2
  const outer = [{ x: left, y: top }, { x: right, y: top }, { x: right, y: bottom }, { x: left, y: bottom }]
  let polygons: readonly (readonly Point[])[] = [outer], holes: readonly (readonly Point[])[] = []
  if (kind === 'oval') {
    // Graph's rounded-rectangle convention: D is horizontal and B is the overall height.
    const radius = D / 2, middle = Math.max(0, B - D), points: Point[] = []
    for (let i = 0; i <= 16; i++) { const a = Math.PI - Math.PI * i / 16; points.push({ x: radius * Math.cos(a), y: middle / 2 + radius * Math.sin(a) }) }
    for (let i = 0; i <= 16; i++) { const a = -Math.PI * i / 16; points.push({ x: radius * Math.cos(a), y: -middle / 2 + radius * Math.sin(a) }) }
    polygons = [points]
    return { kind, polygons, holes, bounds: bounds(outer), centroid: { x: 0, y: 0 }, oval: { radius, straightLength: middle, topLeft: { x: -radius, y: middle / 2 }, topRight: { x: radius, y: middle / 2 }, bottomRight: { x: radius, y: -middle / 2 }, bottomLeft: { x: -radius, y: -middle / 2 } }, dimensionAnchors: { horizontal: [{ x: left, y: top }, { x: right, y: top }], vertical: [{ x: right, y: top }, { x: right, y: bottom }] } }
  } else if (kind === 'box') {
    const wall = Math.min(values.tw ?? 0, B / 2, D / 2)
    if (!(wall > 0) || 2 * wall >= B || 2 * wall >= D) return undefined
    holes = [[{ x: left + wall, y: top - wall }, { x: right - wall, y: top - wall }, { x: right - wall, y: bottom + wall }, { x: left + wall, y: bottom + wall }]]
  } else if (kind === 'h_section') {
    const web = values.tw, flange = values.tf
    if (!(web > 0 && flange > 0 && web <= D && 2 * flange < B)) return undefined
    polygons = [[{ x: left, y: top }, { x: right, y: top }, { x: right, y: top - flange }, { x: web / 2, y: top - flange }, { x: web / 2, y: bottom + flange }, { x: right, y: bottom + flange }, { x: right, y: bottom }, { x: left, y: bottom }, { x: left, y: bottom + flange }, { x: -web / 2, y: bottom + flange }, { x: -web / 2, y: top - flange }, { x: left, y: top - flange }]]
  }
  const envelope = bounds(outer)
  return { kind, polygons, holes, bounds: envelope, centroid: { x: envelope.centerX, y: envelope.centerY }, dimensionAnchors: { horizontal: [{ x: left, y: top }, { x: right, y: top }], vertical: [{ x: right, y: top }, { x: right, y: bottom }] } }
}
