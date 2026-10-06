import type { FamilyAlternative } from '../../graph/family/familyResults'
import { formatDisplayValue, type ProjectUnits } from '../../graph/domain/quantities'
import { readProjectState } from '../../project/model/projectWorkspace'
import { precastSectionProperties } from '../../graph/domain/girderCandidates'
import { canonicalPrecastParameters } from './PrecastGirderFamilyPreview'

const definitions = {
  A: ['Cross-sectional Area', 'Area'],
  Ix: ['Moment of Inertia', 'Length^4'],
  Iy: ['Moment of Inertia', 'Length^4'],
  Wx: ['Section Modulus', 'Volume'],
  Wy: ['Section Modulus', 'Volume'],
} as const

export default function PrecastGirderSectionProperties({ candidate, projectUnits }: { candidate: FamilyAlternative; projectUnits?: ProjectUnits }) {
  const parameters = canonicalPrecastParameters(candidate)
  const derived = parameters ? precastSectionProperties(parameters) : undefined
  const units = projectUnits ?? readProjectState([]).project.units
  return <section className="spn-girder-preview-properties" data-testid="section-properties">{(['A', 'Ix', 'Iy', 'Wx', 'Wy'] as const).map((key) => { const [description, dimension] = definitions[key]; const value = derived?.[key]; const formatted = typeof value === 'number' && Number.isFinite(value) && value > 0 ? formatDisplayValue(value, dimension, units).split(' ') : []; return <p key={key}><span className="property-symbol">{key}</span><span className="property-description">{description}</span><strong className="property-value">{formatted[0] ?? '—'}</strong><span className="property-unit">{formatted.slice(1).join(' ')}</span></p> })}</section>
}
