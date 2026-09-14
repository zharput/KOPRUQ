/**
 * The single axis-swap point between SPANOVA's engineering convention
 * (x,y horizontal, z vertical - matches `spatial-core.Point3D`/
 * `alignment.ChainagePosition`) and Three.js's Y-up convention. Used
 * exclusively by this feature's mesh/alignment builders - never
 * duplicated elsewhere (docs/architecture.md's coordinate-architecture
 * note, TERRAIN-P01).
 */
export function toThreeVector(p: { x: number; y: number; z: number }): [number, number, number] {
  return [p.x, p.z, -p.y]
}

export function fromThreeVector(v: { x: number; y: number; z: number }): { x: number; y: number; z: number } {
  return { x: v.x, y: -v.z, z: v.y }
}
