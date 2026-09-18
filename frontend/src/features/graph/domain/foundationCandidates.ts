import { MAX_NODE_CANDIDATES, normalizeCandidateInput, type LengthInput } from './pierCandidates'
import type { FoundationCandidate, MaterialValue } from './types'

export interface FoundationGenerationResult {
  readonly candidates: FoundationCandidate[]
  readonly generatedCombinations: number
  readonly invalidCombinations: number
}
export type FoundationLengthInput = LengthInput

/** Generates deterministic geometric foundation alternatives. No design checks are performed. */
export function generateShallowFoundationCandidates(input: {
  readonly Lx: FoundationLengthInput
  readonly Ly: FoundationLengthInput
  readonly height: FoundationLengthInput
  readonly material: MaterialValue
}, maxCandidates = MAX_NODE_CANDIDATES): FoundationGenerationResult {
  const dimensions = [input.Lx, input.Ly, input.height].map((value, index) => normalizeCandidateInput(value, ['Lx', 'Ly', 'Height'][index]))
  return cartesian(dimensions, maxCandidates, values => {
    const [Lx, Ly, height] = values
    return Lx > 0 && Ly > 0 && height > 0
      ? { foundationType: 'SHALLOW' as const, geometry: Object.freeze({ Lx, Ly, height }), material: input.material }
      : undefined
  }, input.material, 'shallow')
}

export function generatePiledFoundationCandidates(input: {
  readonly pileDiameter: FoundationLengthInput
  readonly pileCountX: number | readonly number[]
  readonly pileSpacingX: FoundationLengthInput
  readonly pileCountY: number | readonly number[]
  readonly pileSpacingY: FoundationLengthInput
  readonly capHeight: FoundationLengthInput
  readonly material: MaterialValue
}, maxCandidates = MAX_NODE_CANDIDATES): FoundationGenerationResult {
  const dimensions = [
    normalizeCandidateInput(input.pileDiameter, 'Pile Diameter'),
    normalizeIntegerInput(input.pileCountX, 'Pile Count X'),
    normalizeCandidateInput(input.pileSpacingX, 'Pile Spacing X'),
    normalizeIntegerInput(input.pileCountY, 'Pile Count Y'),
    normalizeCandidateInput(input.pileSpacingY, 'Pile Spacing Y'),
    normalizeCandidateInput(input.capHeight, 'Cap Height'),
  ]
  return cartesian(dimensions, maxCandidates, values => {
    const [D, nx, ax, ny, ay, capHeight] = values
    if (![D, ax, ay, capHeight].every(value => Number.isFinite(value) && value > 0)
      || !Number.isFinite(nx) || !Number.isInteger(nx) || nx < 1
      || !Number.isFinite(ny) || !Number.isInteger(ny) || ny < 1) return undefined
    const Lx = Number((2 * D + (nx - 1) * ax).toPrecision(12))
    const Ly = Number((2 * D + (ny - 1) * ay).toPrecision(12))
    if (![Lx, Ly].every(Number.isFinite)) return undefined
    return { foundationType: 'PILED' as const, geometry: Object.freeze({ pileDiameter: D, pileCountX: nx, pileSpacingX: ax, pileCountY: ny, pileSpacingY: ay, capHeight, derived: Object.freeze({ Lx, Ly }) }), material: input.material }
  }, input.material, 'piled')
}

function normalizeIntegerInput(value: number | readonly number[], label: string): number[] {
  const values = Array.isArray(value) ? value : [value]
  if (!values.length) throw new Error(`${label} must contain at least one value.`)
  return values.map(item => {
    if (typeof item !== 'number' || !Number.isFinite(item)) throw new Error(`${label} requires finite dimensionless Integer values.`)
    return item
  })
}

function cartesian(
  dimensions: number[][],
  maxCandidates: number,
  create: (values: number[]) => Omit<FoundationCandidate, 'id'> | undefined,
  material: MaterialValue,
  type: 'shallow' | 'piled',
): FoundationGenerationResult {
  if (material.domainType !== 'ConcreteMaterial' || !material.id) throw new Error('A valid ConcreteMaterial is required.')
  if (!Number.isInteger(maxCandidates) || maxCandidates < 1) throw new Error('Maximum candidates must be a positive integer.')
  const raw = dimensions.reduce((product, values) => product * values.length, 1)
  if (!Number.isSafeInteger(raw) || raw > maxCandidates) throw new Error(`Foundation candidate generation would create ${Number.isFinite(raw) ? raw.toLocaleString('en-US') : 'an unsafe number of'} combinations. Maximum is ${maxCandidates.toLocaleString('en-US')}. Reduce input ranges.`)
  const candidates: FoundationCandidate[] = []
  let invalidCombinations = 0
  const selected: number[] = []
  const append = (index: number) => {
    if (index < dimensions.length) {
      for (const value of dimensions[index]) { selected[index] = value; append(index + 1) }
      return
    }
    const definition = create([...selected])
    if (!definition) { invalidCombinations++; return }
    const stable = [...selected, material.id].map(value => typeof value === 'number' ? Number(value.toPrecision(12)).toString() : encodeURIComponent(value)).join('_')
    candidates.push(Object.freeze({ id: `foundation-${type}-${stable}`, ...definition }))
  }
  append(0)
  return { candidates, generatedCombinations: raw, invalidCombinations }
}
