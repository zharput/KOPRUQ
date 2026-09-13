import { SECTION_LABELS, type SectionId } from '../navigation/sections'
import DisabledItemGrid from '../../shared/ui/DisabledItemGrid'

/**
 * Generic "click a sidebar leaf, its sub-items show as a card grid in
 * the main content area" panel (per the engineer's own instruction,
 * 2026-09-10: "Loads'a basınca sağdaki büyük menüde yük çeşitleri
 * çıkacak" - never a nested sidebar tree). Reused for every leaf listed
 * in {@code BIG_MENU_ITEMS} (app/navigation/sections.ts) - Alignment,
 * GIS & Satellite, Geotechnical, Hydrology & Hydraulic, Constraints.
 * Same honest-placeholder discipline as HomePanel's old Quick Actions -
 * none of these sub-items have real functionality yet, each card just
 * names itself.
 *
 * <p>Lives under `app/` (not `shared/`), per the architecture migration
 * (2026-09-12): it depends on this app's own `SectionId`/`SECTION_LABELS`
 * taxonomy, which `shared/` is not allowed to know about. The card grid
 * itself is `shared/ui/DisabledItemGrid.tsx` (extracted 2026-09-13).
 */
export default function BigMenuPanel({ section, items }: { section: SectionId; items: string[] }) {
  return (
    <div className="spn-home">
      <h1>{SECTION_LABELS[section]}</h1>
      <DisabledItemGrid items={items} />
    </div>
  )
}
