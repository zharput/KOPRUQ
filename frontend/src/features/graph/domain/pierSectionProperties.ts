export type PierSectionKind = 'rectangular' | 'oval' | 'box' | 'h_section'
export type PierSectionProperties = { area: number; ix: number; iy: number; wx: number; wy: number }

const valid = (...values: number[]) => values.every(value => Number.isFinite(value) && value > 0)
const modulus = (inertia: number, depth: number) => depth > 0 ? inertia / (depth / 2) : 0

export function computePierSectionProperties(kind: PierSectionKind, geometry: Record<string, unknown>): PierSectionProperties | undefined {
  const B = Number(geometry.B), D = Number(geometry.D), tw = Number(geometry.tw), tf = Number(geometry.tf)
  if (kind === 'rectangular' && valid(B, D)) {
    const ix = B * D ** 3 / 12, iy = D * B ** 3 / 12
    return { area: B * D, ix, iy, wx: modulus(ix, D), wy: modulus(iy, B) }
  }
  if (kind === 'oval' && valid(B, D) && B >= D) {
    const radius = D / 2, straight = B - D
    const area = D * straight + Math.PI * radius ** 2
    const ix = D * straight ** 3 / 12 + Math.PI * radius ** 4 / 4 + 4 * straight * radius ** 3 / 3 + Math.PI * straight ** 2 * radius ** 2 / 4
    const iy = straight * D ** 3 / 12 + Math.PI * radius ** 4 / 4
    return { area, ix, iy, wx: modulus(ix, B), wy: modulus(iy, D) }
  }
  if (kind === 'box' && valid(B, D, tw) && 2 * tw < Math.min(B, D)) {
    const innerB = B - 2 * tw, innerD = D - 2 * tw
    const ix = (B * D ** 3 - innerB * innerD ** 3) / 12, iy = (D * B ** 3 - innerD * innerB ** 3) / 12
    return { area: B * D - innerB * innerD, ix, iy, wx: modulus(ix, D), wy: modulus(iy, B) }
  }
  if (kind === 'h_section' && valid(B, D, tw, tf) && 2 * tf < D && tw < B) {
    const webDepth = D - 2 * tf
    const ix = 2 * (B * tf ** 3 / 12 + B * tf * (D / 2 - tf / 2) ** 2) + tw * webDepth ** 3 / 12
    const iy = 2 * (tf * B ** 3 / 12) + webDepth * tw ** 3 / 12
    return { area: 2 * B * tf + tw * webDepth, ix, iy, wx: modulus(ix, D), wy: modulus(iy, B) }
  }
  return undefined
}
