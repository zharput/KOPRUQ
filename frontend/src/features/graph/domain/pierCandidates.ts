import { getUnit, type EngineeringQuantity, type UnitId } from './quantities'
import type { MaterialValue, PierCandidate } from './types'

export const MAX_NODE_CANDIDATES = 10_000
export type PierType = PierCandidate['pierType']
export type LengthInput = number | EngineeringQuantity | readonly (number | EngineeringQuantity)[]
export interface PierCandidateInput { readonly pierType: PierType; readonly geometry: Readonly<Record<string, LengthInput>>; readonly height: LengthInput; readonly columnCount: number; readonly material: MaterialValue }
export interface PierGenerationResult { readonly candidates: PierCandidate[]; readonly generatedCombinations: number; readonly invalidCombinations: number }

/** Convert scalar inputs to a single-value list and preserve the given list order. */
export function normalizeCandidateInput(value: LengthInput, label: string): number[] {
  const values = Array.isArray(value) ? value : [value]
  if (!values.length) throw new Error(`${label} must contain at least one value.`)
  return values.map((item) => {
    if (typeof item === 'number') {
      if (!Number.isFinite(item)) throw new Error(`${label} values must be finite.`)
      return item
    }
    if (item.quantityKind !== 'length' || !Number.isFinite(item.value)) throw new Error(`${label} requires finite Length quantities.`)
    const unit = getUnit(item.unit)
    if (!unit || unit.kind !== 'length') throw new Error(`${label} has an invalid length unit.`)
    // EngineeringQuantity.value is already stored in the canonical unit.
    return item.value
  })
}

/** Cartesian product with the last geometry key varying fastest; height varies fastest. */
export function generatePierCandidates(input: PierCandidateInput, maxCandidates = MAX_NODE_CANDIDATES): PierCandidate[] {
  return generatePierCandidatesWithStats(input, maxCandidates).candidates
}

export function generatePierCandidatesWithStats(input: PierCandidateInput, maxCandidates = MAX_NODE_CANDIDATES): PierGenerationResult {
  if (!Number.isInteger(input.columnCount) || input.columnCount < 1 || input.columnCount > 2) throw new Error('Column Count must be 1 or 2.')
  if (input.material.domainType !== 'ConcreteMaterial' || !input.material.id) throw new Error('A valid ConcreteMaterial is required.')
  const keys = Object.keys(input.geometry)
  const requiredKeys: Record<PierType, string[]> = { CIRCULAR: ['D'], RECTANGULAR: ['B', 'D'], OVAL: ['B', 'D'], BOX: ['B', 'D', 'tw'], H_SECTION: ['B', 'D', 'tw', 'tf'] }
  if (keys.length !== requiredKeys[input.pierType].length || requiredKeys[input.pierType].some(key => !keys.includes(key))) throw new Error(`${input.pierType} geometry requires parameters ${requiredKeys[input.pierType].join(', ')}.`)
  // Fixed key order is part of the candidate ordering and identity contract.
  keys.splice(0, keys.length, ...requiredKeys[input.pierType])
  const dimensions = keys.map(key => normalizeCandidateInput(input.geometry[key], key))
  const heights = normalizeCandidateInput(input.height, 'Height')
  const count = [...dimensions, heights].reduce((product, values) => product * values.length, 1)
  if (!Number.isSafeInteger(count) || count > maxCandidates) throw new Error(`Pier candidate generation would create ${count.toLocaleString('en-US')} combinations. Reduce input ranges.`)
  for (const [index, values] of [...dimensions, heights].entries()) if (values.some(value => value <= 0)) throw new Error(`${index === dimensions.length ? 'Height' : keys[index]} values must be greater than zero.`)
  const result: PierCandidate[] = []
  let invalidCombinations = 0
  const geometryValues: number[] = Array(keys.length)
  const append = (dimensionIndex: number, height: number) => {
    if (dimensionIndex < dimensions.length) {
      for (const value of dimensions[dimensionIndex]) { geometryValues[dimensionIndex] = value; append(dimensionIndex + 1, height) }
      return
    }
    for (const resolvedHeight of heights) {
      const values = Object.fromEntries(keys.map((key, index) => [key, geometryValues[index]])) as Record<string, number>
      if (!isValidGeometry(input.pierType, values)) { invalidCombinations++; continue }
      const geometry = Object.freeze(values)
      const id = `${input.pierType.toLowerCase()}-${stableKey([...keys.map(key => geometry[key]), resolvedHeight, input.columnCount, input.material.id])}`
      result.push(Object.freeze({ id, pierType: input.pierType, geometry, columnCount: input.columnCount as 1 | 2, heightM: resolvedHeight, material: input.material }))
    }
  }
  append(0, 0)
  return { candidates: result, generatedCombinations: count, invalidCombinations }
}

function isValidGeometry(type: PierType, g: Readonly<Record<string, number>>) {
  if (type === 'BOX') return 2 * g.tw < g.B && 2 * g.tw < g.D
  if (type === 'H_SECTION') return g.tw < g.B && 2 * g.tf < g.D
  return true
}

function stableKey(values: readonly (number | string)[]) { return values.map(value => typeof value === 'number' ? Number(value.toPrecision(12)).toString() : encodeURIComponent(value)).join('_') }

export function localLength(value: number, unit: UnitId): EngineeringQuantity { return { value: getUnit(unit)!.toCanonical(value), quantityKind: 'length', unit } }
