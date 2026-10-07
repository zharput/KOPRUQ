import type { DimensionDefinition } from '../DimensionTypes'
import { DimensionGraphics, DimensionLabel } from './DimensionLayers'
export function InlineDimension({ definition }: { definition: DimensionDefinition }) { return <g data-dimension={definition.id}><DimensionGraphics definition={definition} /><DimensionLabel definition={definition} /></g> }
