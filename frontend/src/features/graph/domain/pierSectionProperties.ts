export type PierSectionKind = 'rectangular' | 'oval' | 'box' | 'h_section'
export type PierSectionProperties = { area: number; ix: number; iy: number; wx: number; wy: number }

const valid = (...values: number[]) => values.every(value => Number.isFinite(value) && value > 0)
const modulus = (inertia: number, depth: number) => depth > 0 ? inertia / (depth / 2) : 0

export function computePierSectionProperties(kind: PierSectionKind, geometry: Record<string, unknown>): PierSectionProperties | undefined {
  const B = Number(geometry.B), D = Number(geometry.D), w = Number(geometry.w), ft = Number(geometry.ft)
  const wx = Number(geometry.wx), wy = Number(geometry.wy)
  if (kind === 'rectangular' && valid(B, D)) {
    const ix = B * D ** 3 / 12, iy = D * B ** 3 / 12
    return { area: B * D, ix, iy, wx: modulus(ix, D), wy: modulus(iy, B) }
  }
  if (kind === 'oval' && valid(B, D) && D >= B) {
    const radius = B / 2, straight = D - B, semiArea = Math.PI * radius ** 2 / 2, semiCentroid = 4 * radius / (3 * Math.PI), offset = straight / 2 + semiCentroid
    const area = B * straight + Math.PI * radius ** 2
    const ix = B * straight ** 3 / 12 + 2 * (Math.PI * radius ** 4 / 8 - semiArea * semiCentroid ** 2 + semiArea * offset ** 2)
    const iy = straight * B ** 3 / 12 + Math.PI * radius ** 4 / 4
    return { area, ix, iy, wx: modulus(ix, B), wy: modulus(iy, D) }
  }
  if (kind === 'box' && valid(B, D, wx, wy) && 2 * wx < D && 2 * wy < B) {
    const innerB = B - 2 * wy, innerD = D - 2 * wx
    const ix = (B * D ** 3 - innerB * innerD ** 3) / 12, iy = (D * B ** 3 - innerD * innerB ** 3) / 12
    return { area: B * D - innerB * innerD, ix, iy, wx: modulus(ix, D), wy: modulus(iy, B) }
  }
  if (kind === 'h_section' && valid(B, D, w, ft) && 2 * ft < B && w < D) {
    const flangeArea = ft * D, wallWidth = B - 2 * ft
    const ix = 2 * (ft * D ** 3 / 12) + wallWidth * w ** 3 / 12
    const flangeOffset = (B - ft) / 2
    const iy = 2 * (D * ft ** 3 / 12 + flangeArea * flangeOffset ** 2) + w * wallWidth ** 3 / 12
    return { area: 2 * flangeArea + wallWidth * w, ix, iy, wx: modulus(ix, D), wy: modulus(iy, B) }
  }
  return undefined
}
