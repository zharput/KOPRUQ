import { MAX_NODE_CANDIDATES, normalizeCandidateInput, type LengthInput } from './pierCandidates'
import type { MaterialValue, PierCapCandidate } from './types'

export type PierCapType = PierCapCandidate['capType']
export type PierCapDimensions = Readonly<Record<string, LengthInput>>
export interface PierCapCandidateInput { readonly capType: PierCapType; readonly geometry: PierCapDimensions; readonly material: MaterialValue }
export interface PierCapGenerationResult { readonly candidates: PierCapCandidate[]; readonly generatedCombinations: number; readonly invalidCombinations: number }

const PARAMETERS: Record<PierCapType, readonly string[]> = {
  RECTANGULAR: ['length', 'width', 'height'],
  T: ['length', 'topWidth', 'stemWidth', 'totalHeight', 'flangeThickness'],
}

/** Deterministic Cartesian family generation. All geometry is stored in canonical metres. */
export function generatePierCapCandidates(input: PierCapCandidateInput, maxCandidates = MAX_NODE_CANDIDATES): PierCapCandidate[] {
  return generatePierCapCandidatesWithStats(input, maxCandidates).candidates
}

export function generatePierCapCandidatesWithStats(input: PierCapCandidateInput, maxCandidates = MAX_NODE_CANDIDATES): PierCapGenerationResult {
  if (input.material.domainType !== 'ConcreteMaterial' || !input.material.id) throw new Error('A valid ConcreteMaterial is required.')
  const keys = PARAMETERS[input.capType]
  if (!keys || Object.keys(input.geometry).length !== keys.length || keys.some(key => !(key in input.geometry))) throw new Error(`${input.capType} geometry requires parameters ${keys?.join(', ') ?? 'valid capType'}.`)
  const dimensions = keys.map(key => normalizeCandidateInput(input.geometry[key], key))
  const count = dimensions.reduce((product, values) => product * values.length, 1)
  if (!Number.isSafeInteger(count) || count > maxCandidates) throw new Error(`Pier Cap candidate generation would create ${Number.isFinite(count) ? count.toLocaleString('en-US') : 'an unsafe number of'} combinations. Maximum is ${maxCandidates.toLocaleString('en-US')}. Reduce input ranges.`)
  if (!Number.isInteger(maxCandidates) || maxCandidates < 1) throw new Error('Maximum candidates must be a positive integer.')

  const candidates: PierCapCandidate[] = []
  let invalidCombinations = 0
  const selected = Array<number>(keys.length)
  const append = (index: number) => {
    if (index < dimensions.length) {
      for (const value of dimensions[index]) { selected[index] = value; append(index + 1) }
      return
    }
    const geometry = Object.fromEntries(keys.map((key, i) => [key, selected[i]]))
    if (Object.values(geometry).some(value => value <= 0) || (input.capType === 'T' && (geometry.stemWidth >= geometry.topWidth || geometry.flangeThickness >= geometry.totalHeight))) {
      invalidCombinations++
      return
    }
    const stableValues = keys.map(key => geometry[key])
    const identity = stableValues.map(value => Number(value.toPrecision(12)).toString()).concat(encodeURIComponent(input.material.id)).join('_')
    candidates.push(Object.freeze({ id: `pier-cap-${input.capType.toLowerCase()}-${identity}`, capType: input.capType, geometry: Object.freeze(geometry), material: input.material }))
  }
  append(0)
  return { candidates, generatedCombinations: count, invalidCombinations }
}
