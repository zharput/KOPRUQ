export type SpanArrangementMode = 'FIXED_COUNT' | 'VARIABLE_COUNT'
export type SpanArrangementStatus = 'COMPLETE' | 'INCOMPLETE' | 'NO_FEASIBLE_ALTERNATIVE' | 'INVALID_INPUT'

export interface SpanArrangementCandidate {
  readonly id: string
  readonly spanCount: number
  readonly pierCount: number
  readonly totalLengthM: number
  readonly spanLengthsM: readonly number[]
  readonly supportStationsM: readonly number[]
  readonly validation: { readonly status: 'VALID'; readonly messages: readonly string[] }
  readonly generationMetadata: { readonly mode: SpanArrangementMode; readonly generationLimit: number }
}

export interface SpanArrangementGenerationInput {
  readonly mode: SpanArrangementMode
  readonly totalLengthM: number
  readonly spanCount?: number
  readonly minSpanCount?: number
  readonly maxSpanCount?: number
  readonly minSpanLengthM: number
  readonly maxSpanLengthM: number
  readonly spanIncrementM: number
  readonly generationLimit: number
}

export interface SpanArrangementGenerationResult {
  readonly candidates: readonly SpanArrangementCandidate[]
  readonly alternativeCount: number
  readonly status: SpanArrangementStatus
  readonly truncated: boolean
  readonly messages: readonly string[]
}

const SCALE = 1_000_000
const toInteger = (value: number): number | undefined => {
  if (!Number.isFinite(value)) return undefined
  const integer = Math.round(value * SCALE)
  return Math.abs(value - integer / SCALE) <= 1e-9 ? integer : undefined
}

export function generateSpanArrangements(input: SpanArrangementGenerationInput): SpanArrangementGenerationResult {
  const values = [input.totalLengthM, input.minSpanLengthM, input.maxSpanLengthM, input.spanIncrementM]
  const scaled = values.map(toInteger)
  if (scaled.some(value => value === undefined) || !Number.isInteger(input.generationLimit) || input.generationLimit < 1) {
    return invalid('Lengths must be finite canonical metre values and generationLimit must be positive.')
  }
  const [total, min, max, increment] = scaled as number[]
  if (total <= 0 || min <= 0 || max < min || increment <= 0) return invalid('Length bounds are invalid.')
  if (input.mode !== 'FIXED_COUNT' && input.mode !== 'VARIABLE_COUNT') return invalid('Mode is invalid.')
  const maxK = Math.floor((max - min) / increment)
  const minCount = input.mode === 'FIXED_COUNT' ? input.spanCount : input.minSpanCount
  const maxCount = input.mode === 'FIXED_COUNT' ? input.spanCount : input.maxSpanCount
  if (!Number.isInteger(minCount) || !Number.isInteger(maxCount) || minCount! < 1 || maxCount! < minCount!) return invalid('Span count bounds are invalid.')

  const candidates: SpanArrangementCandidate[] = []
  // Search one item beyond the public limit. This distinguishes an exactly
  // full result from a truncated result without materialising the full space.
  const searchLimit = input.generationLimit + 1
  for (let count = minCount!; count <= maxCount!; count += 1) {
    const remainder = total - count * min
    if (remainder < 0 || remainder % increment !== 0) continue
    const sumK = remainder / increment
    if (sumK < 0 || sumK > count * maxK) continue
    const ks: number[] = []
    const visit = (index: number, remaining: number) => {
      if (candidates.length >= searchLimit) return
      const left = count - index
      if (remaining < 0 || remaining > left * maxK) return
      if (index === count) {
        if (remaining !== 0) return
        const spanLengthsM = ks.map(k => (min + k * increment) / SCALE)
        const supportStationsM = [0]
        spanLengthsM.forEach(length => supportStationsM.push(supportStationsM[supportStationsM.length - 1] + length))
        candidates.push({
          id: `span-arrangement-${count}-${ks.join('-')}`,
          spanCount: count,
          pierCount: count - 1,
          totalLengthM: total / SCALE,
          spanLengthsM,
          supportStationsM,
          validation: { status: 'VALID', messages: [] },
          generationMetadata: { mode: input.mode, generationLimit: input.generationLimit },
        })
        return
      }
      for (let k = 0; k <= Math.min(maxK, remaining); k += 1) {
        ks.push(k); visit(index + 1, remaining - k); ks.pop()
        if (candidates.length >= searchLimit) return
      }
    }
    visit(0, sumK)
    if (candidates.length >= searchLimit) break
  }
  if (candidates.length === 0) return { candidates, alternativeCount: 0, status: 'NO_FEASIBLE_ALTERNATIVE', truncated: false, messages: ['No exact span arrangement satisfies the supplied rules.'] }
  const truncated = candidates.length > input.generationLimit
  const visible = truncated ? candidates.slice(0, input.generationLimit) : candidates
  return { candidates: visible, alternativeCount: visible.length, status: truncated ? 'INCOMPLETE' : 'COMPLETE', truncated, messages: truncated ? ['Generation limit reached; the result is a partial alternative set.'] : [] }
}

function invalid(message: string): SpanArrangementGenerationResult { return { candidates: [], alternativeCount: 0, status: 'INVALID_INPUT', truncated: false, messages: [message] } }
