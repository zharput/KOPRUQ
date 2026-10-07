import type { GraphGroup, KopruqNode } from '../domain/types'

export const GRAPH_GROUP_TOKENS = {
  paddingX: 20,
  paddingTop: 34,
  paddingBottom: 20,
  borderWidth: 1,
  radius: 8,
  titleInsetX: 10,
  titleInsetY: 22,
  titleFontSize: 14,
  portVisualExtent: 6,
  colors: ['#5C7C99', '#6F8F72', '#8A6F91', '#9A7658', '#7A8796', '#8C6D6D', '#6F8790', '#857A5C'] as const,
} as const

export type NodeMeasurement = { width?: number; height?: number; visualExtent?: number }
export type GraphGroupBounds = { x: number; y: number; width: number; height: number }

export function computeGraphGroupBounds(nodeIds: readonly string[], nodes: readonly Pick<KopruqNode, 'id' | 'position'>[], measurements: Readonly<Record<string, NodeMeasurement>> = {}, padding = GRAPH_GROUP_TOKENS) : GraphGroupBounds | undefined {
  const members = nodes.filter(node => nodeIds.includes(node.id))
  if (!members.length) return undefined
  const memberLeft = Math.min(...members.map(node => node.position.x - (measurements[node.id]?.visualExtent ?? padding.portVisualExtent)))
  const memberTop = Math.min(...members.map(node => node.position.y - (measurements[node.id]?.visualExtent ?? padding.portVisualExtent)))
  const memberRight = Math.max(...members.map(node => node.position.x + (measurements[node.id]?.width ?? 220) + (measurements[node.id]?.visualExtent ?? padding.portVisualExtent)))
  const memberBottom = Math.max(...members.map(node => node.position.y + (measurements[node.id]?.height ?? 120) + (measurements[node.id]?.visualExtent ?? padding.portVisualExtent)))
  return { x: memberLeft - padding.paddingX, y: memberTop - padding.paddingTop, width: memberRight - memberLeft + padding.paddingX * 2, height: memberBottom - memberTop + padding.paddingTop + padding.paddingBottom }
}

export function groupColor(index: number) { return GRAPH_GROUP_TOKENS.colors[index % GRAPH_GROUP_TOKENS.colors.length] }
export function normalizeGroups(groups: readonly GraphGroup[] | undefined, nodeIds: ReadonlySet<string>) { return (groups ?? []).map(group => ({ ...group, nodeIds: group.nodeIds.filter(id => nodeIds.has(id)) })).filter(group => group.nodeIds.length >= 2) }
