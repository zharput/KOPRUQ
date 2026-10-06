import { TECHNICAL_DRAWING_TOKENS } from '../TechnicalDrawingTokens'
type Props = { from: { x: number; y: number }; to: { x: number; y: number }; overrun?: number }
export function ExtensionLine({ from, to }: Props) { return <line data-extension-line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={TECHNICAL_DRAWING_TOKENS.technicalDimensionColor} strokeWidth={TECHNICAL_DRAWING_TOKENS.strokeWidth} vectorEffect="non-scaling-stroke" strokeLinecap="butt" /> }
