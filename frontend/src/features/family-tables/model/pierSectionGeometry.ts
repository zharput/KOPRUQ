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
  const left = -B / 2, right = B / 2, top = D / 2, bottom = -D / 2
  const outer = [{ x: left, y: top }, { x: right, y: top }, { x: right, y: bottom }, { x: left, y: bottom }]
  let polygons: readonly (readonly Point[])[] = [outer], holes: readonly (readonly Point[])[] = []
  if (kind === 'oval') {
    if (D < B) return undefined
    const radius = B / 2, horizontalStraight = 0, verticalStraight = D - B, points: Point[] = []
    if (verticalStraight > 0) {
      for (let i = 0; i <= 16; i++) { const a = Math.PI - Math.PI * i / 16; points.push({ x: radius * Math.cos(a), y: verticalStraight / 2 + radius * Math.sin(a) }) }
      for (let i = 0; i <= 16; i++) { const a = -Math.PI * i / 16; points.push({ x: radius * Math.cos(a), y: -verticalStraight / 2 + radius * Math.sin(a) }) }
    }
    polygons = [points]
    return { kind, polygons, holes, bounds: bounds(outer), centroid: { x: 0, y: 0 }, oval: { radius, straightLength: Math.max(horizontalStraight, verticalStraight), topLeft: { x: left, y: top }, topRight: { x: right, y: top }, bottomRight: { x: right, y: bottom }, bottomLeft: { x: left, y: bottom } }, dimensionAnchors: { horizontal: [{ x: left, y: top }, { x: right, y: top }], vertical: [{ x: right, y: top }, { x: right, y: bottom }] } }
  } else if (kind === 'box') {
    const wx = values.wx ?? 0, wy = values.wy ?? 0
    if (!(wx > 0 && wy > 0) || 2 * wx >= D || 2 * wy >= B) return undefined
    holes = [[{ x: left + wy, y: top - wx }, { x: right - wy, y: top - wx }, { x: right - wy, y: bottom + wx }, { x: left + wy, y: bottom + wx }]]
  } else if (kind === 'h_section') {
    const gap = values.w, flange = values.ft
    if (!(gap > 0 && flange > 0 && gap < D && 2 * flange < B)) return undefined
    const innerLeft = left + flange, innerRight = right - flange, webTop = gap / 2, webBottom = -gap / 2
    polygons = [[{ x: left, y: top }, { x: innerLeft, y: top }, { x: innerLeft, y: webTop }, { x: innerRight, y: webTop }, { x: innerRight, y: top }, { x: right, y: top }, { x: right, y: bottom }, { x: innerRight, y: bottom }, { x: innerRight, y: webBottom }, { x: innerLeft, y: webBottom }, { x: innerLeft, y: bottom }, { x: left, y: bottom }]]
  }
  const envelope = bounds(outer)
  return { kind, polygons, holes, bounds: envelope, centroid: { x: envelope.centerX, y: envelope.centerY }, dimensionAnchors: { horizontal: [{ x: left, y: top }, { x: right, y: top }], vertical: [{ x: right, y: top }, { x: right, y: bottom }] } }
}
