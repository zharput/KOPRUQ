import type { Dispatch, SetStateAction } from 'react'
import { Boxes, Component, Layers } from 'lucide-react'
import TabDetailPanel, { type DetailCategory } from '../../../shared/ui/TabDetailPanel'
import PrecastCrossSection from './PrecastCrossSection'
import type { CrossSectionValues } from '../model/types'

/**
 * Design System > Superstructure Families (2026-09-11): same top-tab-row
 * pattern as Loads, per the engineer's own instruction ("loads
 * sekmesinde yaptığın üst menü revizyonunu burada yap").
 *
 * <p>Precast is real now (2026-09-13, engineer's own reference drawing)
 * - a deck cross-section diagram + parameters, see
 * `PrecastCrossSection.tsx`. PSC/Steel-Composite detail parameters
 * aren't provided yet.
 *
 * <p>`crossSectionValues`/`setCrossSectionValues` are lifted to
 * `App.tsx` (2026-09-13) so Loads' Self Weight & Permanent breakdown can
 * read the Precast cross section's walkway/carriageway values live.
 */
export default function SuperstructureFamiliesPanel({
  crossSectionValues,
  setCrossSectionValues,
}: {
  crossSectionValues: CrossSectionValues
  setCrossSectionValues: Dispatch<SetStateAction<CrossSectionValues>>
}) {
  const categories: DetailCategory[] = [
    { label: 'Precast', icon: Boxes, content: <PrecastCrossSection values={crossSectionValues} setValues={setCrossSectionValues} /> },
    { label: 'PSC', icon: Component, status: 'Not started. Detail parameters not provided yet.' },
    { label: 'Steel / Composite', icon: Layers, status: 'Span/girder-depth alternatives are entered per bridge in Project Information for now - a dedicated parametric editor here is not built yet.' },
  ]

  return <TabDetailPanel categories={categories} />
}
