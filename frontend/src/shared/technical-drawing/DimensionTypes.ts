export type DimensionSide = 'left' | 'right' | 'top' | 'bottom' | 'inline'
export type DrawingPoint = { x: number; y: number }
export type DimensionDefinition = {
  id: string
  label: string
  from: DrawingPoint
  to: DrawingPoint
  side: DimensionSide
  lane?: number
  value?: number
  formattedValue?: string
  textOffset?: number
  dimensionOffset?: number
  extensionGap?: number
  extensionOverrun?: number
  extensionLines?: { from: DrawingPoint; to: DrawingPoint }[]
  arrows?: { point: DrawingPoint; direction: 'up' | 'down' | 'left' | 'right'; size?: number }[]
  text?: { point: DrawingPoint; anchor?: 'start' | 'middle' | 'end'; dominantBaseline?: 'middle' }
}
