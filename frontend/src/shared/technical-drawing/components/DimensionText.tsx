type Props = { x: number; y: number; label: string; value?: string; anchor?: 'start' | 'middle' | 'end' }
export function DimensionText({ x, y, label, value, anchor = 'start' }: Props) { return <text data-dimension-text textAnchor={anchor} x={x} y={y}>{value === undefined ? label : `${label} = ${value}`}</text> }
