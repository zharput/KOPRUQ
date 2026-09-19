import { CANONICAL_UNITS, getUnit, type EngineeringQuantity, type QuantityKind } from './quantities'
import { MAX_NODE_CANDIDATES } from './pierCandidates'
import type { BearingCandidate } from './types'

export type BearingInput = number | EngineeringQuantity | readonly (number | EngineeringQuantity)[]
export interface BearingGenerationInput {
  readonly lengthX: BearingInput
  readonly widthY: BearingInput
  readonly totalHeight: BearingInput
  readonly kx: BearingInput
  readonly ky: BearingInput
  readonly kz: BearingInput
  readonly krx: BearingInput
  readonly kry: BearingInput
  readonly krz: BearingInput
}
export interface BearingGenerationResult { readonly candidates: BearingCandidate[]; readonly generatedCombinations: number; readonly invalidCombinations: number }

const FIELDS: readonly { key: keyof BearingGenerationInput; kind: QuantityKind }[] = [
  { key: 'lengthX', kind: 'length' }, { key: 'widthY', kind: 'length' }, { key: 'totalHeight', kind: 'length' },
  { key: 'kx', kind: 'translationalStiffness' }, { key: 'ky', kind: 'translationalStiffness' }, { key: 'kz', kind: 'translationalStiffness' },
  { key: 'krx', kind: 'rotationalStiffness' }, { key: 'kry', kind: 'rotationalStiffness' }, { key: 'krz', kind: 'rotationalStiffness' },
]

/** Generates family-level elastomeric bearing alternatives in canonical units. No design checks or location data are included. */
export function generateElastomericBearingCandidates(input: BearingGenerationInput, maxCandidates = MAX_NODE_CANDIDATES): BearingGenerationResult {
  if (!Number.isInteger(maxCandidates) || maxCandidates < 1) throw new Error('Maximum candidates must be a positive integer.')
  const dimensions = FIELDS.map(field => normalizeBearingInput(input[field.key], field.kind, field.key))
  const raw = dimensions.reduce((count, values) => count * values.length, 1)
  if (!Number.isSafeInteger(raw) || raw > maxCandidates) throw new Error(`Elastomeric Bearing candidate generation would create ${Number.isFinite(raw) ? raw.toLocaleString('en-US') : 'an unsafe number of'} combinations. Maximum is ${maxCandidates.toLocaleString('en-US')}. Reduce input ranges.`)
  const candidates: BearingCandidate[] = []
  let invalidCombinations = 0
  const selected = Array<number>(FIELDS.length)
  const append = (index: number) => {
    if (index < dimensions.length) {
      for (const value of dimensions[index]) { selected[index] = value; append(index + 1) }
      return
    }
    const [lengthX, widthY, totalHeight, kx, ky, kz, krx, kry, krz] = selected
    if (![lengthX, widthY, totalHeight].every(value => value > 0) || ![kx, ky, kz, krx, kry, krz].every(value => value >= 0)) { invalidCombinations++; return }
    const stable = selected.map(value => Number(value.toPrecision(12)).toString()).join('_')
    candidates.push(Object.freeze({
      id: `elastomeric-${stable}`,
      bearingType: 'ELASTOMERIC',
      geometry: Object.freeze({ lengthX, widthY, totalHeight }),
      stiffness: Object.freeze({ kx, ky, kz, krx, kry, krz }),
    }))
  }
  append(0)
  return { candidates, generatedCombinations: raw, invalidCombinations }
}

export function normalizeBearingInput(value: BearingInput, kind: QuantityKind, label: string): number[] {
  const values = Array.isArray(value) ? value : [value]
  if (!values.length) throw new Error(`${label} must contain at least one value.`)
  return values.map(item => {
    if (typeof item === 'number') {
      if (!Number.isFinite(item)) throw new Error(`${label} values must be finite.`)
      return item
    }
    const unit = getUnit(item.unit)
    if (item.quantityKind !== kind || !unit || unit.kind !== kind || !Number.isFinite(item.value)) throw new Error(`${label} requires finite ${kind} quantities.`)
    return item.value
  })
}

export function countBearingValues(value: BearingInput, kind: QuantityKind, label: string) { return normalizeBearingInput(value, kind, label).length }

export const BEARING_CANONICAL_UNITS = {
  length: CANONICAL_UNITS.length,
  translationalStiffness: CANONICAL_UNITS.translationalStiffness,
  rotationalStiffness: CANONICAL_UNITS.rotationalStiffness,
} as const
