import type { FamilyCalculationSnapshot, FamilyCategory, FamilyAlternative } from '../../graph/family/familyResults'
import { formatDisplayValue, toDisplayValue, type ProjectUnits } from '../../graph/domain/quantities'

export const FAMILY_GROUPS: readonly FamilyCategory[] = ['SPAN_ARRANGEMENT', 'GIRDER', 'SUPERSTRUCTURE', 'PIER', 'PIER_CAP', 'FOUNDATION', 'BEARING', 'ABUTMENT']

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

export function candidateColumns(category: FamilyCategory, alternatives: readonly FamilyAlternative[], units: ProjectUnits = {}) {
  const rows = alternatives.map(item => item.candidateData as unknown as Record<string, unknown>)
  const columns: { key: string; label: string }[] = [{ key: 'candidateId', label: 'Candidate ID' }]
  if (category === 'SPAN_ARRANGEMENT') {
    columns.push({ key: 'spanCount', label: 'Span Count' }, { key: 'pierCount', label: 'Pier Count' }, { key: 'totalLengthM', label: `Total Length (${units.length ?? 'm'})` })
    const maxSpans = Math.max(0, ...rows.map(row => Array.isArray(row.spanLengthsM) ? row.spanLengthsM.length : 0))
    for (let index = 0; index < maxSpans; index += 1) columns.push({ key: `span:${index}`, label: `S${index + 1} (${units.length ?? 'm'})` })
  } else if (category === 'PIER') columns.push({ key: 'pierType', label: 'Pier Type' }, ...geometryColumns(rows), { key: 'heightM', label: `Height (${units.length ?? 'm'})` }, { key: 'material', label: 'Material' }, { key: 'columnCount', label: 'Columns' })
  else if (category === 'BEARING') columns.push({ key: 'bearingType', label: 'Bearing Type' }, ...['kx', 'ky', 'kz', 'krx', 'kry', 'krz'].map(key => ({ key: `stiffness.${key}`, label: key.toUpperCase() })))
  else if (category === 'PIER_CAP') columns.push({ key: 'capType', label: 'Cap Type' }, ...geometryColumns(rows), { key: 'material', label: 'Material' })
  else if (category === 'FOUNDATION') columns.push({ key: 'foundationType', label: 'Foundation Type' }, ...geometryColumns(rows), { key: 'material', label: 'Material' })
  else if (category === 'GIRDER') columns.push({ key: 'girderType', label: 'Girder Type' }, { key: 'sectionType', label: 'Section Type' }, ...geometryColumns(rows), { key: 'preferredSpan', label: 'Preferred Span (m)' }, { key: 'material', label: 'Material' })
  else if (category === 'SUPERSTRUCTURE') columns.push({ key: 'girderType', label: 'Girder Type' }, ...['deckWidth', 'deckSlabThickness', 'girderCount', 'girderSpacing', 'clearEdgeCantileverLeft'].map(key => ({ key, label: key })), { key: 'deckConcrete', label: 'Deck Concrete' })
  else if (category === 'ABUTMENT') columns.push(...geometryColumns(rows), { key: 'seismic.seiW', label: 'Seismic Block Width' })
  columns.push({ key: 'validation', label: 'Validation' })
  return columns
}

function geometryColumns(rows: Record<string, unknown>[]) {
  const keys = [...new Set(rows.flatMap(row => Object.keys((row.geometry as Record<string, unknown> | undefined) ?? {})))].filter(key => key !== 'derived')
  return keys.map(key => ({ key: `geometry.${key}`, label: key }))
}

export function cellValue(alternative: FamilyAlternative, key: string, units: ProjectUnits = {}): string {
  if (key === 'candidateId') return alternative.candidateId
  if (key === 'validation') return validationOf(alternative) ?? '—'
  const value = key.split('.').reduce<unknown>((current, part) => current && typeof current === 'object' ? (current as Record<string, unknown>)[part] : undefined, alternative.candidateData as unknown)
  if (key.startsWith('span:')) { const spans = (alternative.candidateData as unknown as Record<string, unknown>).spanLengthsM; return Array.isArray(spans) && typeof spans[Number(key.slice(5))] === 'number' ? formatDisplayValue(Number(spans[Number(key.slice(5))]), 'Length', units) : '—' }
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
  if (key.startsWith('stiffness.k')) return `${toDisplayValue(value, 'Translational Stiffness', units).toFixed(2)} ${units.force ?? 'kN'}/${units.length ?? 'm'}`
  if (key.startsWith('stiffness.kr')) return `${toDisplayValue(value, 'Rotational Stiffness', units).toFixed(2)} ${units.moment ?? 'kN·m'}/rad`
  return formatDisplayValue(value, 'Length', units)
}
