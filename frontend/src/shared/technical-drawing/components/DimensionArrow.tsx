type Props = { x: number; y: number; direction: 'up' | 'down' | 'left' | 'right'; size?: number }
export function DimensionArrow({ x, y, direction, size = 3 }: Props) {
  const points = direction === 'up' ? `${x},${y} ${x-size},${y+size*2} ${x+size},${y+size*2}` : direction === 'down' ? `${x},${y} ${x-size},${y-size*2} ${x+size},${y-size*2}` : direction === 'left' ? `${x},${y} ${x+size*2},${y-size} ${x+size*2},${y+size}` : `${x},${y} ${x-size*2},${y-size} ${x-size*2},${y+size}`
  return <polygon data-dimension-arrow points={points} />
}
