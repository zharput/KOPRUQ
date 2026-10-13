export interface Dimension { key: string; label: string; min: number; max: number; delta: number }
export function generateValues(min: number, max: number, delta: number): number[] {
  if (min === 0 && max === 0 && delta === 0) return []
  if (min === max) return [Math.round(min * 100) / 100]
  if (delta <= 0 || max < min) return []
  const values: number[] = []
  for (let value = min; value <= max + 1e-9; value += delta) values.push(Math.round(value * 100) / 100)
  return values
}
