type Props = { x: number; y: number; label: string; value?: string; anchor?: 'start' | 'middle' | 'end'; dominantBaseline?: 'middle' }
import { TECHNICAL_DRAWING_TOKENS } from '../TechnicalDrawingTokens'

export function DimensionText({ x, y, label, value, anchor = 'start', dominantBaseline }: Props) { return <text data-dimension-text textAnchor={anchor} dominantBaseline={dominantBaseline} x={x} y={y} fill={TECHNICAL_DRAWING_TOKENS.textColor} style={{ fontFamily: TECHNICAL_DRAWING_TOKENS.fontFamily, fontSize: `${TECHNICAL_DRAWING_TOKENS.fontSize}px`, fontWeight: TECHNICAL_DRAWING_TOKENS.fontWeight }}>{value === undefined ? label : `${label} = ${value}`}</text> }
