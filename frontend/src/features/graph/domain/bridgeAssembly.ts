import type { EngineeringQuantity } from './quantities'
import type { BearingCandidate, FoundationCandidate, PierCandidate, PierCapCandidate } from './types'
import type { AbutmentCandidate } from './abutmentCandidates'
import type { SuperstructureCandidate } from './superstructureCandidates'

export type AssemblyStatus = 'VALID' | 'INCOMPLETE' | 'INVALID'
export interface AssemblyCoordinate { xM: number; yM: number; zM: number }
export interface AssemblySupport { id: string; name: string; role: 'abutment' | 'pier'; axisIndex: number; stationM: number; coordinate?: AssemblyCoordinate; familyId?: string; pierCapFamilyId?: string; bearingFamilyId?: string; foundationFamilyId?: string; abutment?: AbutmentCandidate; direction: 'FORWARD' | 'REVERSE' }
export interface AssemblySpan { id: string; name: string; startSupportId: string; endSupportId: string; startStationM: number; endStationM: number; lengthM: number; familyId?: string }
export interface BridgeAssembly { id: string; status: AssemblyStatus; messages: string[]; totalLengthM: number; supports: AssemblySupport[]; spans: AssemblySpan[]; superstructureCandidateId?: string; familyAssignments: { abutmentFamilyId?: string; pierFamilyId?: string; pierCapFamilyId?: string; bearingFamilyId?: string; foundationFamilyId?: string; girderFamilyId?: string }; alignmentResolved: boolean }

export interface AssemblyFamilyInputs { abutmentFamilyId?: string; abutmentA1?: AbutmentCandidate; abutmentA2?: AbutmentCandidate; pier?: PierCandidate; pierCap?: PierCapCandidate; bearing?: BearingCandidate; foundation?: FoundationCandidate; superstructure?: SuperstructureCandidate }
export interface AssemblyAlignment { getPointAtChainage?: (stationM: number) => AssemblyCoordinate | undefined }

export function resolveBridgeAssembly(lengths: readonly (number | EngineeringQuantity)[], superstructureCandidateId?: string, families: AssemblyFamilyInputs = {}, alignment?: AssemblyAlignment): BridgeAssembly {
  const values = lengths.map(value => typeof value === 'number' ? value : value.quantityKind === 'length' ? value.value : Number.NaN)
  const messages: string[] = []
  if (!values.length) messages.push('At least one span is required.')
  if (values.some(value => !Number.isFinite(value) || value <= 0)) messages.push('All span lengths must be positive finite lengths.')
  if (!superstructureCandidateId) messages.push('A Superstructure candidate is required.')
  const superstructureId = superstructureCandidateId ?? families.superstructure?.id
  if (families.superstructure && families.superstructure.validationStatus !== 'VALID') messages.push('Superstructure family assignment is invalid.')
  const alignmentPoint = (stationM: number) => { const point = alignment?.getPointAtChainage?.(stationM); return point && Object.values(point).every(Number.isFinite) ? point : undefined }
  const supports: AssemblySupport[] = [{ id: 'support-a1', name: 'A1', role: 'abutment', axisIndex: 0, stationM: 0, coordinate: alignmentPoint(0), familyId: families.abutmentFamilyId, abutment: families.abutmentA1, direction: 'FORWARD' }]
  const spans: AssemblySpan[] = []
  let station = 0
  values.forEach((lengthM, index) => {
    const end = index === values.length - 1 ? { id: 'support-a2', name: 'A2', role: 'abutment' as const } : { id: `support-p${index + 1}`, name: `P${index + 1}`, role: 'pier' as const }
    const start = supports[supports.length - 1]
    station += Number.isFinite(lengthM) ? lengthM : 0
    if (index < values.length - 1) supports.push({ ...end, axisIndex: index + 1, stationM: station, coordinate: alignmentPoint(station), familyId: families.pier?.id, pierCapFamilyId: families.pierCap?.id, bearingFamilyId: families.bearing?.id, foundationFamilyId: families.foundation?.id, direction: 'FORWARD' })
    spans.push({ id: `span-${index + 1}`, name: `S${index + 1}`, startSupportId: start.id, endSupportId: end.id, startStationM: start.stationM, endStationM: station, lengthM, familyId: superstructureId ?? families.superstructure?.girderCandidateId })
  })
  supports.push({ id: 'support-a2', name: 'A2', role: 'abutment', axisIndex: values.length, stationM: station, coordinate: alignmentPoint(station), familyId: families.abutmentFamilyId, abutment: families.abutmentA2 ?? families.abutmentA1, direction: 'REVERSE' })
  const totalLengthM = values.reduce((sum, value) => sum + (Number.isFinite(value) ? value : 0), 0)
  return { id: `assembly-${values.length}-${values.map(value => Number.isFinite(value) ? value.toFixed(6) : 'invalid').join('-')}`, status: messages.length ? 'INCOMPLETE' : 'VALID', messages, totalLengthM, supports, spans, superstructureCandidateId: superstructureId, familyAssignments: { abutmentFamilyId: families.abutmentFamilyId, pierFamilyId: families.pier?.id, pierCapFamilyId: families.pierCap?.id, bearingFamilyId: families.bearing?.id, foundationFamilyId: families.foundation?.id, girderFamilyId: families.superstructure?.girderCandidateId }, alignmentResolved: Boolean(alignment?.getPointAtChainage) }
}
