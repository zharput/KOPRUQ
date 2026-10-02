import type { DimensionDefinition } from '../DimensionTypes'
import { DimensionArrow } from './DimensionArrow'
import { DimensionText } from './DimensionText'
import { ExtensionLine } from './ExtensionLine'
export function HorizontalDimension({ definition }: { definition: DimensionDefinition }) { const { from, to } = definition; return <g data-dimension={definition.id}>{definition.extensionLines?.map((line, i) => <ExtensionLine key={i} {...line} />)}<line data-dimension-line x1={from.x} y1={from.y} x2={to.x} y2={to.y} />{definition.arrows?.map((arrow, i) => <DimensionArrow key={i} x={arrow.point.x} y={arrow.point.y} direction={arrow.direction} size={arrow.size} />)}{definition.text && <DimensionText x={definition.text.point.x} y={definition.text.point.y} label={definition.label} value={definition.formattedValue} anchor={definition.text.anchor} />}</g> }
