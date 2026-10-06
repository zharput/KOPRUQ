import type { FamilyAlternative } from '../../graph/family/familyResults'
import type { ProjectUnits } from '../../graph/domain/quantities'
import { formatTechnicalDimension } from '../../../shared/technical-drawing/DimensionFormatter'
import { toDisplayValue } from '../../graph/domain/quantities'

type DimensionMetadata = { key: string; label: string }

export type FamilyInformationMetadata = {
  primaryDimensions: readonly DimensionMetadata[]
}

type Props = {
  familyLabel: string
  displayId: string
  candidate: FamilyAlternative
  metadata: FamilyInformationMetadata
  projectUnits: ProjectUnits
  area?: string
}

function geometryOf(candidate: FamilyAlternative) {
  return ((candidate.candidateData as Record<string, unknown>).geometry ?? {}) as Record<string, unknown>
}

function dimensions(candidate: FamilyAlternative, metadata: FamilyInformationMetadata, units: ProjectUnits) {
  const geometry = geometryOf(candidate)
  const values = metadata.primaryDimensions.map(({ key }) => Number(geometry[key])).filter(Number.isFinite)
  return values.length === metadata.primaryDimensions.length
    ? values.map(value => formatTechnicalDimension(value, item => toDisplayValue(item, 'Length', units))).join(' × ') + ` ${units.length ?? 'm'}`
    : '—'
}

export default function SectionInformationPanel({ familyLabel, displayId, candidate, metadata, projectUnits, area }: Props) {
  const data = candidate.candidateData as Record<string, unknown>
  const material = typeof data.material === 'string' ? data.material : typeof data.materialName === 'string' ? data.materialName : '—'
  const unitWeight = typeof data.unitWeight === 'string' || typeof data.unitWeight === 'number' ? String(data.unitWeight) : '—'
  const fields = [['Family', familyLabel], ['Candidate ID', displayId], ['Primary Dimensions', dimensions(candidate, metadata, projectUnits)], ['Area', area ?? '—'], ['Material', material], ['Unit Weight', unitWeight]] as const
  return <section className="family-information-summary" data-testid="family-information-panel">{fields.map(([label, value]) => <div className="family-information-field" key={label}><span>{label}</span><strong>{value}</strong></div>)}</section>
}
