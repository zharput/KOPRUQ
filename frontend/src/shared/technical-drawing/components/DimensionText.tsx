type Props = { x: number; y: number; label: string; value?: string; anchor?: 'start' | 'middle' | 'end'; dominantBaseline?: 'middle' }
export function DimensionText({ x, y, label, value, anchor = 'start', dominantBaseline }: Props) { return <text data-dimension-text textAnchor={anchor} dominantBaseline={dominantBaseline} x={x} y={y}>{value === undefined ? label : `${label} = ${value}`}</text> }
