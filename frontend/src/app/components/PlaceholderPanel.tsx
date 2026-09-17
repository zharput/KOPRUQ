import { Construction } from 'lucide-react'
import type { SectionId } from '../navigation/sections'
import { SECTION_LABELS } from '../navigation/sections'

/**
 * Honest "not built yet" state for every shell section that has no real
 * functionality behind it (spec section 22's spirit extended to
 * software: don't fake it). Says which milestone will fill it in, or
 * which existing real screen already covers part of it, rather than
 * showing empty/misleading content. Matches the full menu structure the
 * engineer specified (2026-09-10) - leaves listed in BIG_MENU_ITEMS
 * (app/navigation/sections.ts) route to BigMenuPanel instead and are not
 * listed here.
 *
 * <p>Lives under `app/` (not `shared/`), per the architecture migration
 * (2026-09-12) - same reasoning as BigMenuPanel.
 */
const MILESTONE_BY_SECTION: Partial<Record<SectionId, string>> = {
  'corridor-dashboard': 'needs a Corridor/multi-BridgeSite aggregate first (analysis document section L step 4) - not built yet',
  'preferred-span-families': 'not started',
  'abutment-families': 'not started',
  'foundation-families': 'only pile count/diameter are modelled in bridge-core today - no library screen yet',
  'bearing-families': 'elastomeric bearings via externally-supplied Kx/Ky/Kz are agreed (P07) and used in the SPANOVA Fast Solver - not modelled as a reusable library yet',
  'pier-cap-families': 'family concept is represented by System Assembly; engineering parameters are not configured yet',
  'standardization-rules': 'not started - this is the corridor-level standardization objective from the analysis document section I/17',
  'bridge-inventory': 'needs a Corridor/multi-BridgeSite aggregate (analysis document section L step 4) - not built yet, only a single BridgeSite exists today',
  'bridge-site': 'covered by the Layout Generator screen for now - a dedicated Bridge Site definition screen (separate from generation) is later',
  'layout-alternatives': "covered by the Layout Generator screen's own results table for now - a dedicated alternatives-only view is later",
  'selected-layout': 'not started - needs Layout Alternatives to support picking one first',
  'bridge-superstructure': 'covered by Bridge Alternatives for now (girder count/depth) - a dedicated superstructure-definition screen is later',
  'bridge-piers': 'pier shape is selected directly in Project Information\'s additional-details panel for now; cross-section dimension ranges (min/max/delta) are set per shape in Pier Families',
  'bridge-abutments': 'not started',
  'bridge-bearings': 'bearing stiffness (Kx/Ky/Kz/Krx/Kry/Krz) is entered directly on the SPANOVA Fast Solver form for now',
  'bridge-foundations': 'only pile count/diameter are modelled in bridge-core today',
  'model-reduction': 'not started',
  'analysis-queue': 'not started - SPANOVA Fast Solver runs synchronously to completion today, nothing to queue yet',
  'opensees-verification': 'the INTERMEDIATE solver tier named in the analysis document section B - not requested/started',
  'midas-nx-final-verification': 'MIDAS NX is kept as the post-selection, high-fidelity verification tier (addendum P) - not wired to a UI screen yet',
  results: 'P08-P09 (quantities, cost, CO2, Pareto results)',
  'layout-optimization': 'the first of three separate optimization levels (analysis document section B/16) - not started',
  'structural-optimization': 'P09 (generative multi-objective optimization)',
  'bridge-optimization': 'not started',
  'corridor-optimization': 'needs a real Corridor with multiple bridges first (analysis document section I) - not started',
  standardization: 'not started - the corridor-level standardization objective (analysis document section I/17)',
  'pareto-explorer': 'P09 (Pareto front)',
  reports: 'P08+ (once there are real results to report on)',
  settings: 'not scoped yet',
  help: 'not scoped yet',
}

export default function PlaceholderPanel({ section }: { section: SectionId }) {
  return (
    <div className="spn-placeholder">
      <Construction size={28} strokeWidth={1.5} />
      <h1>{SECTION_LABELS[section]}</h1>
      <p>Not built yet - {MILESTONE_BY_SECTION[section] ?? 'not scoped yet'}.</p>
    </div>
  )
}
