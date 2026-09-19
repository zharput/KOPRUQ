export type BoxRect = { left: number; top: number; right: number; bottom: number }
export type BoxSelectionMode = 'window' | 'crossing'

export function selectionMode(startX: number, currentX: number): BoxSelectionMode {
  return currentX < startX ? 'crossing' : 'window'
}

export function normalizedBox(a: { x: number; y: number }, b: { x: number; y: number }): BoxRect {
  return { left: Math.min(a.x, b.x), top: Math.min(a.y, b.y), right: Math.max(a.x, b.x), bottom: Math.max(a.y, b.y) }
}

export function transformBox(bounds: BoxRect, toFlow: (point: { x: number; y: number }) => { x: number; y: number }): BoxRect {
  return normalizedBox(toFlow({ x: bounds.left, y: bounds.top }), toFlow({ x: bounds.right, y: bounds.bottom }))
}

export function mergeBoxSelection(previous: readonly string[], hit: readonly string[], shift: boolean): string[] {
  return shift ? [...new Set([...previous, ...hit])] : [...new Set(hit)]
}

export function selectNodeIdsByBox<T extends { id: string; bounds: BoxRect }>(
  nodes: readonly T[], box: BoxRect, mode: BoxSelectionMode,
): string[] {
  return nodes.filter(({ bounds }) => mode === 'window'
    ? bounds.left >= box.left && bounds.right <= box.right && bounds.top >= box.top && bounds.bottom <= box.bottom
    : bounds.right >= box.left && bounds.left <= box.right && bounds.bottom >= box.top && bounds.top <= box.bottom,
  ).map(({ id }) => id)
}
