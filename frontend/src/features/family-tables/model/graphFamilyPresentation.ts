import type { FamilyCalculationSnapshot, FamilyCategory, FamilyAlternative } from '../../graph/family/familyResults'
import { toDisplayValue, type ProjectUnits } from '../../graph/domain/quantities'

export const FAMILY_GROUPS: readonly FamilyCategory[] = ['SPAN_ARRANGEMENT', 'GIRDER', 'SUPERSTRUCTURE', 'PIER', 'PIER_CAP', 'FOUNDATION', 'BEARING', 'ABUTMENT']
export const FAMILY_CANDIDATE_PREFIXES = { GIRDER: 'PG', PIER: 'RP', PIER_CAP: 'RC', FOUNDATION: 'SF', BEARING: 'EB', SUPERSTRUCTURE: 'SS', ABUTMENT: 'AB', SPAN_ARRANGEMENT: 'SA' } as const
export function formatFamilyCandidateId(prefix: string, index: number): string { return `${prefix}-${String(index + 1).padStart(3, '0')}` }
export function getPrecastGirderDisplayId(index: number): string { return formatFamilyCandidateId('PG', index) }
function candidatePrefix(category: FamilyCategory, data: Record<string, unknown>) { if (category === 'GIRDER') return data.girderType === 'STEEL' ? 'SG' : 'PG'; if (category === 'PIER') return ({ RECTANGULAR: 'RP', CIRCULAR: 'CP', OVAL: 'OP', BOX: 'BP', H: 'HP' } as Record<string, string>)[String(data.pierType ?? '')] ?? 'RP'; if (category === 'PIER_CAP') return ({ RECTANGULAR: 'RC', T: 'TC' } as Record<string, string>)[String(data.capType ?? '')] ?? 'RC'; if (category === 'FOUNDATION') return ({ SHALLOW: 'SF', PILED: 'PF' } as Record<string, string>)[String(data.foundationType ?? '')] ?? 'SF'; return FAMILY_CANDIDATE_PREFIXES[category] }
export function familyCandidateDisplayIds(category: FamilyCategory, alternatives: readonly FamilyAlternative[]) { return new Map(alternatives.map((item, index) => [item.candidateId, formatFamilyCandidateId(candidatePrefix(category, item.candidateData as Record<string, unknown>), index)])) }
let activeDisplayIds: ReadonlyMap<string, string> | undefined
export function getCandidateDisplayId(candidateId: string): string { return activeDisplayIds?.get(candidateId) ?? candidateId }

export type FamilySourceGroup = {
  category: FamilyCategory
  snapshots: readonly FamilyCalculationSnapshot[]
  candidateCount: number
  validCount: number
  invalidCount: number
  freshness: FamilyCalculationSnapshot['freshness'] | 'NO_RESULT'
}

export function familyGroups(snapshots: readonly FamilyCalculationSnapshot[]): FamilySourceGroup[] {
  return FAMILY_GROUPS.map(category => {
    const items = snapshots.filter(item => item.familyCategory === category)
    const candidates = items.flatMap(item => item.candidates)
    return {
      category,
      snapshots: items,
      candidateCount: candidates.length,
      validCount: candidates.filter(isValid).length,
      invalidCount: candidates.filter(item => !isValid(item)).length,
      freshness: items.length ? worstFreshness(items.map(item => item.freshness)) : 'NO_RESULT',
    }
  })
}

export function sourceSnapshots(group: FamilySourceGroup) { return group.snapshots }

export function paginateAlternatives<T>(items: readonly T[], page: number, pageSize: number) {
  const size = pageSize === 50 || pageSize === 100 ? pageSize : 25
  const pageCount = Math.ceil(items.length / size)
  const safePage = pageCount ? Math.min(Math.max(1, page), pageCount) : 1
  return { page: safePage, pageCount, items: items.slice((safePage - 1) * size, safePage * size), total: items.length, start: items.length ? (safePage - 1) * size + 1 : 0, end: Math.min(safePage * size, items.length) }
}

export function filterFamilyCandidates(alternatives: readonly FamilyAlternative[], columns: readonly { key: string }[], query: string, units: ProjectUnits = {}, displayIds?: ReadonlyMap<string, string>) {
  const normalized = query.trim().toLocaleLowerCase()
  if (!normalized) return [...alternatives]
  return alternatives.filter(alternative => columns.some(column => cellValue(alternative, column.key, units, displayIds).toLocaleLowerCase().includes(normalized)))
}

export function candidateColumns(category: FamilyCategory, alternatives: readonly FamilyAlternative[], units: ProjectUnits = {}, displayIds?: ReadonlyMap<string, string>) {
  activeDisplayIds = displayIds
  const rows = alternatives.map(item => item.candidateData as unknown as Record<string, unknown>)
  const columns: { key: string; label: string }[] = [{ key: 'candidateId', label: 'Candidate ID' }]
  if (category === 'SPAN_ARRANGEMENT') {
    columns.push({ key: 'spanCount', label: 'Span Count' }, { key: 'pierCount', label: 'Pier Count' }, { key: 'totalLengthM', label: `Total Length (${units.length ?? 'm'})` })
    const maxSpans = Math.max(0, ...rows.map(row => Array.isArray(row.spanLengthsM) ? row.spanLengthsM.length : 0))
    for (let index = 0; index < maxSpans; index += 1) columns.push({ key: `span:${index}`, label: `S${index + 1} (${units.length ?? 'm'})` })
  } else if (category === 'PIER') columns.push(...geometryColumns(rows), { key: 'heightM', label: `Height (${units.length ?? 'm'})` }, { key: 'columnCount', label: 'Columns' })
  else if (category === 'BEARING') columns.push(...['kx', 'ky', 'kz', 'krx', 'kry', 'krz'].map(key => ({ key: `stiffness.${key}`, label: key.toUpperCase() })))
  else if (category === 'PIER_CAP') columns.push(...geometryColumns(rows))
  else if (category === 'FOUNDATION') columns.push(...geometryColumns(rows))
  else if (category === 'GIRDER') columns.push(...(['H', 'tf', 'bf', 'w', 'th1', 'bh1', 'th2', 'bh2'] as const).filter((key) => rows.some((row) => typeof (row.geometry as Record<string, unknown> | undefined)?.[key] === 'number')).map((key) => ({ key: `geometry.${key}`, label: ({ H: 'H', tf: 'Btf', bf: 'Bbf', w: 'tw', th1: 'th1', bh1: 'bh1', th2: 'th2', bh2: 'bh2' } as Record<string, string>)[key] + ` (${units.length ?? 'm'})` })), { key: 'preferredSpan', label: `Pref. Span (${units.length ?? 'm'})` })
  else if (category === 'SUPERSTRUCTURE') columns.push(...['deckWidth', 'deckSlabThickness', 'girderCount', 'girderSpacing', 'clearEdgeCantileverLeft'].map(key => ({ key, label: key })))
  else if (category === 'ABUTMENT') columns.push(...geometryColumns(rows), { key: 'seismic.seiW', label: 'Seismic Block Width' })
  columns.push({ key: 'validation', label: 'Validation' })
  return columns
}

function geometryColumns(rows: Record<string, unknown>[]) {
  const keys = [...new Set(rows.flatMap(row => Object.keys((row.geometry as Record<string, unknown> | undefined) ?? {})))].filter(key => key !== 'derived')
  return keys.map(key => ({ key: `geometry.${key}`, label: key }))
}

export function cellValue(alternative: FamilyAlternative, key: string, units: ProjectUnits = {}, displayIds?: ReadonlyMap<string, string>): string {
  if (key === 'candidateId') return displayIds?.get(alternative.candidateId) ?? getCandidateDisplayId(alternative.candidateId)
  if (key === 'validation') return validationOf(alternative) ?? '—'
  const value = key.split('.').reduce<unknown>((current, part) => current && typeof current === 'object' ? (current as Record<string, unknown>)[part] : undefined, alternative.candidateData as unknown)
  if (key.startsWith('span:')) { const spans = (alternative.candidateData as unknown as Record<string, unknown>).spanLengthsM; return Array.isArray(spans) && typeof spans[Number(key.slice(5))] === 'number' ? toDisplayValue(Number(spans[Number(key.slice(5))]), 'Length', units).toFixed(2) : '—' }
  if (value && typeof value === 'object' && 'id' in value && 'name' in value) return String((value as { name: string }).name)
  if (typeof value === 'number') return formatNumber(value, key, units)
  if (typeof value === 'string' || typeof value === 'boolean') return String(value)
  return value == null ? '—' : JSON.stringify(value)
}

function validationOf(item: FamilyAlternative) { const data = item.candidateData as unknown as Record<string, unknown>; const value = data.validationStatus ?? (data.validation as Record<string, unknown> | undefined)?.status; return typeof value === 'string' ? value : undefined }
function isValid(item: FamilyAlternative) { return validationOf(item) === 'VALID' || validationOf(item) === undefined }
function worstFreshness(values: FamilyCalculationSnapshot['freshness'][]): FamilyCalculationSnapshot['freshness'] { return values.includes('FAILED') ? 'FAILED' : values.includes('STALE') ? 'STALE' : values.includes('INCOMPLETE') ? 'INCOMPLETE' : values.includes('VALID') ? 'VALID' : 'NO_RESULT' }
function formatNumber(value: number, key: string, units: ProjectUnits) {
  if (['spanCount', 'pierCount', 'girderCount', 'columnCount', 'pileCountX', 'pileCountY'].some(item => key.toLowerCase().includes(item.toLowerCase()))) return String(value)
  if (key.startsWith('stiffness.k')) return toDisplayValue(value, 'Translational Stiffness', units).toFixed(2)
  if (key.startsWith('stiffness.kr')) return toDisplayValue(value, 'Rotational Stiffness', units).toFixed(2)
  return toDisplayValue(value, 'Length', units).toFixed(2)
}
