import {
  AlertTriangle,
  Anchor,
  Car,
  ListChecks,
  Thermometer,
  Waves,
  Wind,
} from 'lucide-react'
import TabDetailPanel, { type DetailCategory } from '../../../shared/ui/TabDetailPanel'
import DisabledItemGrid from '../../../shared/ui/DisabledItemGrid'
import SelfWeightPermanent from './SelfWeightPermanent'
import type { CrossSectionValues } from '../../superstructure-families'

/**
 * PROJECT > Loads (revised 2026-09-11): a top row of tabs, one per load
 * category - "Loads alanında üstte bir satır menüsü olsun... hangisine
 * basınca onunla ilgili detay parametreler menü alanında gözükür" (the
 * engineer's own instruction). Clicking a tab shows that category's
 * detail-parameter area below; most parameters aren't provided yet
 * ("Detay parametreleri daha sonra vereceğim" - the engineer will give
 * them later), so each one is an honest placeholder naming what's real
 * elsewhere (self-weight, SDL) or what's still needed, not invented
 * content. Uses the shared `TabDetailPanel` (see that file).
 *
 * <p>Seismic's tab (2026-09-13, engineer's own instruction - "'SITE
 * CORRIDOR' daki seismic bölümü, LOADS'daki seismic içine gelecek")
 * absorbed Site & Corridor's former standalone "Seismic" leaf - its 4
 * items (Hazard Data/PGA-Spectral Data/Site Class/Design Spectrum,
 * previously a `BigMenuPanel` card grid) now render here instead, via
 * the shared `DisabledItemGrid`. `meteorology` was removed outright
 * (not merged anywhere) - the engineer's own reasoning: Loads already
 * has Temperature/Wind, so a separate Meteorology leaf was redundant.
 *
 * <p>"Permanent" -> "Self Weight & Permanent" (2026-09-13, engineer's
 * own numbered spec) is now a real load-breakdown calculator, see
 * `SelfWeightPermanent.tsx`. It reads `crossSectionValues` - lifted
 * state from `App.tsx` (Superstructure Families' Precast cross
 * section) - so it stays live when the engineer edits a walkway/
 * platform width there.
 */
const SEISMIC_ITEMS = ['Hazard Data', 'PGA / Spectral Data', 'Site Class', 'Design Spectrum']

export default function LoadsPanel({ crossSectionValues }: { crossSectionValues: CrossSectionValues }) {
  const categories: DetailCategory[] = [
    { label: 'Self Weight & Permanent', icon: Anchor, content: <SelfWeightPermanent crossSectionValues={crossSectionValues} /> },
    { label: 'Traffic', icon: Car, status: 'EN 1991-2 LM1 - method for simplifying it onto the 1D-frame model not decided yet (addendum P). Detail parameters not provided yet.' },
    { label: 'Temperature', icon: Thermometer, status: 'Not started. Detail parameters not provided yet.' },
    { label: 'Wind', icon: Wind, status: 'Not started. Detail parameters not provided yet.' },
    {
      label: 'Seismic',
      icon: Waves,
      content: (
        <div className="spn-card">
          <h2 className="spn-card-title">Seismic</h2>
          <p className="spn-card-subtitle">
            Not started - needs an approved design-code method first. Detail parameters not provided yet.
          </p>
          <DisabledItemGrid items={SEISMIC_ITEMS} />
        </div>
      ),
    },
    { label: 'Accidental', icon: AlertTriangle, status: 'Not started. Detail parameters not provided yet.' },
    { label: 'Load Cases & Combinations', icon: ListChecks, status: 'Not started - no combination model exists yet. Detail parameters not provided yet.' },
  ]

  return <TabDetailPanel categories={categories} />
}
