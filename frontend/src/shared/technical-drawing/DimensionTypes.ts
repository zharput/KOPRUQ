export type DimensionSide = 'left' | 'right' | 'top' | 'bottom' | 'inline'
export type DrawingPoint = { x: number; y: number }
export type ExtensionLineGeometry = {
  from: DrawingPoint
  to: DrawingPoint
  /** The exact point where the extension line meets the dimension axis. */
  dimensionIntersection?: DrawingPoint
}
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
  extensionLines?: ExtensionLineGeometry[]
  arrows?: { point: DrawingPoint; direction: 'up' | 'down' | 'left' | 'right'; size?: number }[]
  text?: { point: DrawingPoint; anchor?: 'start' | 'middle' | 'end'; dominantBaseline?: 'middle' }
}
