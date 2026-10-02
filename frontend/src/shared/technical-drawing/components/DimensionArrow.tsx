import { TECHNICAL_DRAWING_TOKENS } from '../TechnicalDrawingTokens'
type Props = { x: number; y: number; direction: 'up' | 'down' | 'left' | 'right'; size?: number }

export function dimensionArrowPoints(x: number, y: number, direction: Props['direction'], size = 3) {
  const length = size === 3 ? TECHNICAL_DRAWING_TOKENS.arrowLength : size * 2
  const width = size === 3 ? TECHNICAL_DRAWING_TOKENS.arrowWidth : size
  if (direction === 'right') return `${x},${y} ${x-length},${y-width} ${x-length},${y+width}`
  if (direction === 'left') return `${x},${y} ${x+length},${y-width} ${x+length},${y+width}`
  if (direction === 'down') return `${x},${y} ${x-width},${y-length} ${x+width},${y-length}`
  return `${x},${y} ${x-width},${y+length} ${x+width},${y+length}`
}

export function DimensionArrow({ x, y, direction, size = 3 }: Props) {
  return <polygon data-dimension-arrow points={dimensionArrowPoints(x, y, direction, size)} />
}
