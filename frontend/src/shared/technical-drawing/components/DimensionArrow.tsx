import { TECHNICAL_DRAWING_TOKENS } from '../TechnicalDrawingTokens'
type Props = { x: number; y: number; direction: 'up' | 'down' | 'left' | 'right'; size?: number }

export function dimensionArrowPoints(x: number, y: number, direction: Props['direction'], size = 3) {
  const local = dimensionArrowLocalPoints(direction, size)
  return local.split(' ').map(point => {
    const [px, py] = point.split(',').map(Number)
    return `${x + px},${y + py}`
  }).join(' ')
}

export function dimensionArrowLocalPoints(direction: Props['direction'], size: number = TECHNICAL_DRAWING_TOKENS.arrowSize) {
  const length = size === TECHNICAL_DRAWING_TOKENS.arrowSize ? TECHNICAL_DRAWING_TOKENS.arrowLength : size * 2
  const width = size === TECHNICAL_DRAWING_TOKENS.arrowSize ? TECHNICAL_DRAWING_TOKENS.arrowWidth : size
  if (direction === 'right') return `0,0 ${-length},${-width} ${-length},${width}`
  if (direction === 'left') return `0,0 ${length},${-width} ${length},${width}`
  if (direction === 'down') return `0,0 ${-width},${-length} ${width},${-length}`
  return `0,0 ${-width},${length} ${width},${length}`
}

export function DimensionArrow({ x, y, direction, size = TECHNICAL_DRAWING_TOKENS.arrowSize }: Props) {
  return <polygon data-dimension-arrow points={dimensionArrowLocalPoints(direction, size)} transform={`translate(${x} ${y})`} fill={TECHNICAL_DRAWING_TOKENS.technicalDimensionColor} stroke="none" />
}
