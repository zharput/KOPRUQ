/** Candidate geometry uses these names; persisted Graph node ports may use tf/bf/w. */
export const PRECAST_GEOMETRY_KEYS = ['H', 'Btf', 'Bbf', 'tw', 'th1', 'bh1', 'bh2', 'th2'] as const
export type PrecastGeometryKey = typeof PRECAST_GEOMETRY_KEYS[number]
export type PrecastGeometry<T> = Record<PrecastGeometryKey, T>

const legacyKeys: Partial<Record<PrecastGeometryKey, string>> = { H: 'h', Btf: 'tf', Bbf: 'bf', tw: 'w' }
const canonicalKeys = Object.fromEntries(Object.entries(legacyKeys).map(([key, alias]) => [alias, key])) as Record<string, string>

export function canonicalPrecastKey(key: string): string { return canonicalKeys[key] ?? key }

export function precastGeometryValue<T>(source: Record<string, T | undefined>, key: PrecastGeometryKey): T | undefined {
  return source[key] ?? source[legacyKeys[key] ?? key]
}

export function canonicalPrecastGeometry<T>(source: Record<string, T | undefined>): PrecastGeometry<T> | undefined {
  const entries = PRECAST_GEOMETRY_KEYS.map((key) => [key, precastGeometryValue(source, key)] as const)
  if (entries.some(([, value]) => value === undefined)) return undefined
  return Object.fromEntries(entries) as PrecastGeometry<T>
}
