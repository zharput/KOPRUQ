import type { LucideIcon } from 'lucide-react'

/**
 * A screen that is just one disabled "import" action - used by Site &
 * Corridor's Alignment and 3D Terrain / DTM leaves (2026-09-12,
 * engineer's own instruction: "import aligment/terrain, site
 * coridordaki menüye gitsin" - moved off the old Home page's Quick
 * Actions list, which was removed entirely). Domain-free (title, one
 * action, an icon, a milestone caption), so it lives in `shared/ui`.
 */
export default function ImportActionScreen({
  title,
  note,
  actionLabel,
  icon: Icon,
  availableFrom,
}: {
  title: string
  note?: string
  actionLabel: string
  icon: LucideIcon
  availableFrom: string
}) {
  return (
    <div className="spn-home">
      <h1>{title}</h1>
      {note && <p className="spn-home-intro">{note}</p>}
      <div className="spn-quick-actions spn-quick-actions-single">
        <button type="button" className="spn-quick-action" disabled title={`Not built yet - ${availableFrom}`}>
          <Icon size={18} strokeWidth={1.75} />
          <span>{actionLabel}</span>
        </button>
      </div>
    </div>
  )
}
