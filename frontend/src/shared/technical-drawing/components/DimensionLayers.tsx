import type { DimensionDefinition } from '../DimensionTypes'
import { DimensionArrow } from './DimensionArrow'
import { DimensionText } from './DimensionText'
import { ExtensionLine } from './ExtensionLine'
import { TECHNICAL_DRAWING_TOKENS } from '../TechnicalDrawingTokens'

export function DimensionGraphics({ definition }: { definition: DimensionDefinition }) {
  const { from, to } = definition
  return <g data-dimension-graphics={definition.id}>
    {definition.extensionLines?.map((line, i) => <ExtensionLine key={`extension-${i}`} {...line} />)}
    <line data-dimension-line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={TECHNICAL_DRAWING_TOKENS.technicalDimensionColor} strokeWidth={TECHNICAL_DRAWING_TOKENS.strokeWidth} strokeLinecap="butt" vectorEffect="non-scaling-stroke" />
    {definition.arrows?.map((arrow, i) => <DimensionArrow key={`arrow-${i}`} x={arrow.point.x} y={arrow.point.y} direction={arrow.direction} size={arrow.size} />)}
  </g>
}

export function DimensionLabel({ definition }: { definition: DimensionDefinition }) {
  if (!definition.text) return null
  return <g data-dimension={definition.id} data-dimension-text-layer={definition.id}><DimensionText x={definition.text.point.x} y={definition.text.point.y} label={definition.label} value={definition.formattedValue} anchor={definition.text.anchor} /></g>
}
