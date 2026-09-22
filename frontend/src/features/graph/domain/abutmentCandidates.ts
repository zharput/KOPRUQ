import type { BearingCandidate, GraphValue } from './types'
import type { GirderCandidate } from './girderCandidates'
import type { SuperstructureCandidate } from './superstructureCandidates'

export type AbutmentValidationStatus = 'VALID' | 'WARNING' | 'ERROR' | 'INCOMPLETE'
export interface AbutmentCandidate {
  readonly id: string
  readonly geometry: Readonly<Record<string, number | number[]>>
  readonly upstream: Readonly<{ girderH: number; girderA: number; girderE: number; girderCount: number; girderBottomFlangeW: number; deckH: number; deckW: number; bearingH: number; girderAxes: number[] }>
  readonly seismic: Readonly<{ seiU: number; seiW: number; seiWClear: number; status: AbutmentValidationStatus; message?: string }>
  readonly validationStatus: AbutmentValidationStatus
  readonly validationMessages: readonly string[]
}
export interface AbutmentGenerationResult { candidates: AbutmentCandidate[]; generatedCombinations: number; invalidCombinations: number }

const finitePositive = (value: number) => Number.isFinite(value) && value > 0
const values = (value: number | number[] | { value: number } | undefined, fallback: number) => {
  const result = Array.isArray(value) ? value : value === undefined ? [fallback] : [value]
  return result.map(item => typeof item === 'object' ? Number(item.value) : Number(item))
}
function first<T>(value: GraphValue | undefined): T | undefined { return Array.isArray(value) ? value[0] as T | undefined : value as T | undefined }

export function generateAbutmentCandidates(input: {
  geometry: Record<string, number | number[] | { value: number }>
  seiU?: number | number[] | { value: number }
  girder?: GraphValue
  superstructure?: GraphValue
  bearing?: GraphValue
  maxCandidates?: number
}): AbutmentGenerationResult {
  const girder = first<GirderCandidate>(input.girder)
  const superstructure = first<SuperstructureCandidate>(input.superstructure)
  const bearing = first<BearingCandidate>(input.bearing)
  const geometry = { ...input.geometry, front_h: input.geometry.front_h ?? input.geometry.Front_fh, found_th: input.geometry.found_th ?? input.geometry.Foun_fh }
  delete (geometry as Record<string, unknown>).Front_fh
  delete (geometry as Record<string, unknown>).Foun_fh
  const maxCandidates = input.maxCandidates ?? 10000
  const combinations = Object.entries({ ...geometry, seiU: input.seiU ?? .03 }).map(([key, value]) => ({ key, values: values(value, 0) }))
  const total = combinations.reduce((count, item) => count * item.values.length, 1)
  if (total > maxCandidates) throw new Error(`Maximum is ${maxCandidates} abutment combinations.`)
  const rows: Record<string, number>[] = []
  const walk = (index: number, row: Record<string, number>) => { if (index === combinations.length) { rows.push({ ...row }); return }; for (const value of combinations[index].values) walk(index + 1, { ...row, [combinations[index].key]: value }) }
  walk(0, {})
  let invalid = 0
  const candidates = rows.flatMap(row => {
    const girderH = girder?.geometry.H ?? superstructure?.girderHeight
    const girderBottomFlangeW = girder?.girderType === 'STEEL' ? girder.geometry.Bbf : girder?.geometry.bf ?? superstructure?.girderTopFlangeWidth ?? 0
    const axes = superstructure?.girderAxisPositions ?? []
    const girderCount = superstructure?.girderCount ?? axes.length
    const deckW = superstructure?.deckWidth
    const girderA = axes.length > 1 && axes.every((axis, i) => i === 0 || Math.abs(axis - axes[i - 1] - (axes[1] - axes[0])) < 1e-9) ? axes[1] - axes[0] : superstructure?.girderSpacing
    const girderE = axes.length ? Math.min(axes[0], deckW! - axes[axes.length - 1]) : deckW !== undefined && girderCount > 1 && girderA !== undefined ? (deckW - (girderCount - 1) * girderA) / 2 : undefined
    const deckH = superstructure?.deckSlabThickness
    const bearingH = bearing?.geometry.totalHeight
    const messages: string[] = []
    for (const [key, value] of Object.entries(row)) if (!finitePositive(value)) messages.push(`${key} must be finite and greater than zero.`)
    if (![girderH, girderA, girderE, deckW, deckH, bearingH].every(value => typeof value === 'number' && Number.isFinite(value))) messages.push('Required upstream girder, superstructure or bearing geometry is missing.')
    if (girderCount < 1 || !Number.isInteger(girderCount)) messages.push('girder_count must be a positive integer.')
    if (messages.length) { invalid++; return [] }
    const foundW = row.Back_w + row.Front_w + row.Onp_Amp
    const bodyD = deckW!
    const offset = (row.found_d - bodyD) / 2
    const seiW = (deckW! - (girderCount - 1) * girderA! - 2 * row.seiU) / 2
    const seiWClear = Math.min(girderE! - girderBottomFlangeW / 2 - row.seiU, girderE! - girderBottomFlangeW / 2 - row.seiU)
    const seismicStatus: AbutmentValidationStatus = seiW < .2 ? 'ERROR' : seiW < .3 ? 'WARNING' : 'VALID'
    const seismicMessage = seismicStatus === 'ERROR' ? 'ERROR : Seismic Block width < 20cm' : seismicStatus === 'WARNING' ? 'WARNING : Seismic Block width < 30cm' : undefined
    const status: AbutmentValidationStatus = seismicStatus === 'ERROR' || offset < 0 ? 'ERROR' : seismicStatus === 'WARNING' ? 'WARNING' : 'VALID'
    const id = `abutment-${Object.values(row).map(value => value.toFixed(6)).join('-')}`
    return [{ id, geometry: { ...row, foundW, totalH: row.found_th + row.front_h + bearingH! + girderH! + deckH!, abutmentBodyD: bodyD, foundationLeftOffset: offset, foundationRightOffset: offset, foundationArea: foundW * row.found_d, foundationVolume: foundW * row.found_d * row.found_th }, upstream: { girderH: girderH!, girderA: girderA!, girderE: girderE!, girderCount, girderBottomFlangeW, deckH: deckH!, deckW: deckW!, bearingH: bearingH!, girderAxes: axes }, seismic: { seiU: row.seiU, seiW, seiWClear, status: seismicStatus, message: seismicMessage }, validationStatus: status, validationMessages: [...(seismicMessage ? [seismicMessage] : []), ...(offset < 0 ? ['Foundation width is smaller than abutment body width.'] : [])] }]
  })
  return { candidates, generatedCombinations: rows.length, invalidCombinations: invalid }
}
