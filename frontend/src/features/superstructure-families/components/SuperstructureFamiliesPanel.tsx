import { Boxes, Component, Layers } from 'lucide-react'
import TabDetailPanel, { type DetailCategory } from '../../../shared/ui/TabDetailPanel'
import PrecastCrossSection from './PrecastCrossSection'

/**
 * Design System > Superstructure Families (2026-09-11): same top-tab-row
 * pattern as Loads, per the engineer's own instruction ("loads
 * sekmesinde yaptığın üst menü revizyonunu burada yap").
 *
 * <p>Precast is real now (2026-09-13, engineer's own reference drawing)
 * - a deck cross-section diagram + parameters, see
 * `PrecastCrossSection.tsx`. PSC/Steel-Composite detail parameters
 * aren't provided yet.
 */
const SUPERSTRUCTURE_CATEGORIES: DetailCategory[] = [
  { label: 'Precast', icon: Boxes, content: <PrecastCrossSection /> },
  { label: 'PSC', icon: Component, status: 'Not started. Detail parameters not provided yet.' },
  { label: 'Steel / Composite', icon: Layers, status: 'Span/girder-depth alternatives are entered per bridge in Project Information for now - a dedicated parametric editor here is not built yet.' },
]

export default function SuperstructureFamiliesPanel() {
  return <TabDetailPanel categories={SUPERSTRUCTURE_CATEGORIES} />
}
