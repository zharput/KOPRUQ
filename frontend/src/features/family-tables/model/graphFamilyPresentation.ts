import type { FamilyCalculationSnapshot, FamilyCategory, FamilyAlternative } from '../../graph/family/familyResults'
import { getDisplayUnit, getUnit, quantityFromCanonical, toDisplayValue, type PhysicalDimension, type ProjectUnits, type QuantityKind } from '../../graph/domain/quantities'

export const FAMILY_GROUPS: readonly FamilyCategory[] = ['SPAN_ARRANGEMENT', 'GIRDER', 'SUPERSTRUCTURE', 'PIER', 'PIER_CAP', 'FOUNDATION', 'BEARING', 'ABUTMENT']
export const FAMILY_CANDIDATE_PREFIXES = { GIRDER: 'PG', PIER: 'RP', PIER_CAP: 'RC', FOUNDATION: 'SF', BEARING: 'EB', SUPERSTRUCTURE: 'SS', ABUTMENT: 'AB', SPAN_ARRANGEMENT: 'SA' } as const
export const FAMILY_PRIMARY_DIMENSIONS: Partial<Record<FamilyCategory, readonly { key: string; label: string }[]>> = {
  GIRDER: [{ key: 'H', label: 'H' }, { key: 'Btf', label: 'Btf' }, { key: 'Bbf', label: 'Bbf' }],
  PIER: [{ key: 'B', label: 'B' }, { key: 'D', label: 'D' }],
}
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
  } else if (category === 'PIER') columns.push(...geometryColumns(rows, units), { key: 'heightM', label: `Height (${units.length ?? 'm'})` }, { key: 'columnCount', label: 'Columns' })
  else if (category === 'BEARING') columns.push(...['kx', 'ky', 'kz', 'krx', 'kry', 'krz'].map(key => ({ key: `stiffness.${key}`, label: key.toUpperCase() })))
  else if (category === 'PIER_CAP') columns.push(...geometryColumns(rows))
  else if (category === 'FOUNDATION') columns.push(...geometryColumns(rows))
  else if (category === 'GIRDER') columns.push(...(['H', 'tf', 'bf', 'w', 'th1', 'bh1', 'th2', 'bh2'] as const).filter((key) => rows.some((row) => typeof (row.geometry as Record<string, unknown> | undefined)?.[key] === 'number')).map((key) => ({ key: `geometry.${key}`, label: ({ H: 'H', tf: 'Btf', bf: 'Bbf', w: 'tw', th1: 'th1', bh1: 'bh1', th2: 'th2', bh2: 'bh2' } as Record<string, string>)[key] + ` (${units.length ?? 'm'})` })), { key: 'preferredSpan', label: `Pref. Span (${units.length ?? 'm'})` })
  else if (category === 'SUPERSTRUCTURE') columns.push(...['deckWidth', 'deckSlabThickness', 'girderCount', 'girderSpacing', 'clearEdgeCantileverLeft'].map(key => ({ key, label: key })))
  else if (category === 'ABUTMENT') columns.push(...geometryColumns(rows), { key: 'seismic.seiW', label: 'Seismic Block Width' })
  columns.push({ key: 'validation', label: 'Validation' })
  return columns
}

function geometryColumns(rows: Record<string, unknown>[], units?: ProjectUnits) {
  const keys = [...new Set(rows.flatMap(row => Object.keys((row.geometry as Record<string, unknown> | undefined) ?? {})))].filter(key => key !== 'derived')
  return keys.map(key => ({ key: `geometry.${key}`, label: units ? `${key} (${units.length ?? 'm'})` : key }))
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
  if (key.startsWith('stiffness.kr')) return toDisplayValue(value, 'Rotational Stiffness', units).toFixed(2)
  if (key.startsWith('stiffness.k')) return toDisplayValue(value, 'Translational Stiffness', units).toFixed(2)
  return toDisplayValue(value, 'Length', units).toFixed(2)
}

const KIND_DIMENSION: Partial<Record<QuantityKind, PhysicalDimension>> = { length: 'Length', area: 'Area', volume: 'Volume', length4: 'Length^4', force: 'Force', moment: 'Moment', stress: 'Stress', mass: 'Mass', temperature: 'Absolute Temperature', temperatureDifference: 'Temperature Difference', translationalStiffness: 'Translational Stiffness', rotationalStiffness: 'Rotational Stiffness' }
export type ParameterRangeDisplay = { min: string; max: string; step: string; unit: string }
/**
 * Min/Max/Step of a family parameter in the Project display unit. `canonicalValues` are the candidates' canonical (SI) values;
 * when there are none, `localValue` (in `localUnit`, the node's own unit) is converted instead. The unit label is the unit the numbers are shown in.
 */
export function parameterRangeDisplay(canonicalValues: readonly number[], localUnit: string | undefined, units: ProjectUnits, localValue?: unknown): ParameterRangeDisplay {
  const dash = '—'
  const local = getUnit(localUnit ?? 'm')
  if (!local) return { min: localValue == null ? dash : String(localValue), max: localValue == null ? dash : String(localValue), step: dash, unit: localUnit ?? '' }
  const dimension = KIND_DIMENSION[local.kind]
  const target = dimension ? getDisplayUnit(dimension, units) : local
  const fromCanonical = (value: number) => dimension ? toDisplayValue(value, dimension, units) : quantityFromCanonical(value, local.kind, local.id)
  const canonical = canonicalValues.length ? [...canonicalValues] : typeof localValue === 'number' && Number.isFinite(localValue) ? [local.toCanonical(localValue)] : []
  if (!canonical.length) return { min: typeof localValue === 'string' && localValue ? localValue : dash, max: typeof localValue === 'string' && localValue ? localValue : dash, step: dash, unit: target.label }
  const display = canonical.map(fromCanonical).sort((a, b) => a - b), unique = [...new Set(display)]
  return { min: display[0].toFixed(2), max: display.at(-1)!.toFixed(2), step: unique.length > 1 ? Math.min(...unique.slice(1).map((value, index) => value - unique[index])).toFixed(2) : dash, unit: target.label }
}
