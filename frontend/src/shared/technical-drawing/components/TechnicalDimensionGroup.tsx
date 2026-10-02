import type { DimensionDefinition } from '../DimensionTypes'

export type TechnicalDimension = DimensionDefinition & {
  orientation: 'horizontal' | 'vertical' | 'inline'
  extensionStarts?: Array<{ x: number; y: number }>
  extensionEnds?: Array<{ x: number; y: number }>
  textX: number
  textY: number
  textAnchor?: 'start' | 'middle' | 'end'
  arrowSize?: number
}

function arrow(x: number, y: number, orientation: TechnicalDimension['orientation'], atStart: boolean, size: number) {
  if (orientation === 'horizontal' || orientation === 'inline') {
    const direction = atStart ? 1 : -1
    return `${x},${y} ${x + direction * size * 2},${y - size} ${x + direction * size * 2},${y + size}`
  }
  const direction = atStart ? 1 : -1
  return `${x},${y} ${x - size},${y + direction * size * 2} ${x + size},${y + direction * size * 2}`
}

export function TechnicalDimensionGroup({ dimensions }: { dimensions: readonly TechnicalDimension[] }) {
  return <g className="technical-dimension-group">{dimensions.map((d) => { const size = d.arrowSize ?? 3; return <g key={d.id} data-dimension-group={d.id}>
    {d.extensionStarts?.map((from, i) => <line key={`extension-${i}`} className="spn-family-dimension-extension" data-extension={`${d.id}-${i}`} x1={from.x} y1={from.y} x2={d.extensionEnds?.[i]?.x ?? d.to.x} y2={d.extensionEnds?.[i]?.y ?? d.to.y} />)}
    <polygon data-arrow={`${d.id}-start`} points={arrow(d.from.x, d.from.y, d.orientation, true, size)} />
    <polygon data-arrow={`${d.id}-end`} points={arrow(d.to.x, d.to.y, d.orientation, false, size)} />
    <line data-dimension={d.id} x1={d.from.x} y1={d.from.y} x2={d.to.x} y2={d.to.y} />
    <text data-dimension-label={d.id} x={d.textX} y={d.textY} textAnchor={d.textAnchor}>{d.formattedValue ?? d.label}</text>
  </g>})}</g>
}
