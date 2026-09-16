import type { ReactNode } from 'react'
import { GenerationTable } from './DesignSystemUi'
import type { Dimension } from './generation'

/**
 * Shared "checkbox + cross-section diagram + min/max/delta parameter
 * table" card, extracted 2026-09-11 once the pattern appeared a second
 * time (Pier Families, then Girder Library) - same convention this
 * session already follows for TabDetailPanel/BigMenuPanel. Domain-free
 * (no pier/girder knowledge - just dimensions, a diagram slot, and
 * callbacks), so it lives in `shared/ui` per the architecture migration
 * (2026-09-12) rather than in either feature.
 *
 * <p>Values-SPANOVA-will-use convention (spec section 22 - never invent
 * a spread): a dimension's min/max/delta all exactly 0 means "not
 * configured yet" (shown as such, not as a value list). Otherwise, if
 * min === max, that is a single confirmed value (not a fabricated
 * range) and is shown as exactly that one number, regardless of delta.
 * Only when min &lt; max does delta produce a real stepped sweep.
 */
export type { Dimension } from './generation'
export { generateValues } from './generation'

/** Horizontal dimension line with arrowheads, for cross-section SVG diagrams. */
export function HDim({ x1, x2, y, label }: { x1: number; x2: number; y: number; label: string }) {
  return (
    <g stroke="var(--text-secondary)" fill="var(--text-secondary)">
      <line x1={x1} y1={y} x2={x2} y2={y} strokeWidth={1} />
      <path d={`M${x1},${y} l7,-3 l0,6 Z`} />
      <path d={`M${x2},${y} l-7,-3 l0,6 Z`} />
      <text x={(x1 + x2) / 2} y={y - 5} textAnchor="middle" fontSize={10} stroke="none">
        {label}
      </text>
    </g>
  )
}

/** Vertical dimension line with arrowheads, for cross-section SVG diagrams. */
export function VDim({ y1, y2, x, label, labelX }: { y1: number; y2: number; x: number; label: string; labelX?: number }) {
  const lx = labelX ?? x - 10
  return (
    <g stroke="var(--text-secondary)" fill="var(--text-secondary)">
      <line x1={x} y1={y1} x2={x} y2={y2} strokeWidth={1} />
      <path d={`M${x},${y1} l-3,7 l6,0 Z`} />
      <path d={`M${x},${y2} l-3,-7 l6,0 Z`} />
      <text x={lx} y={(y1 + y2) / 2 + 3} textAnchor="middle" fontSize={10} stroke="none">
        {label}
      </text>
    </g>
  )
}

/**
 * One card: a header row (title + "use in SPANOVA analyses" checkbox),
 * a full-width diagram row, and a min/max/delta parameter table below
 * it (2026-09-13, engineer's own instruction: diagram as a full row on
 * top, parameters underneath - not side by side as before, which also
 * squeezed the table into a narrow column). The table uses a fixed
 * colgroup (spn-param-table) so the Dimension/Min/Max/Delta columns
 * line up at the same X position across every card using this
 * component, regardless of how wide each card's own label text or
 * "Values" list happens to be - table-layout:auto sizing columns
 * per-table was the cause of the reported misalignment across Pier
 * Families' shape cards.
 */
export function ParamSweepCard({
  title,
  enabled,
  onToggleEnabled,
  diagram,
  dimensions,
  onUpdateDimension,
  notConfiguredLabel = 'Not configured yet',
}: {
  title: string
  enabled: boolean
  onToggleEnabled?: (checked: boolean) => void
  diagram: ReactNode
  dimensions: Dimension[]
  onUpdateDimension: (key: string, patch: Partial<Dimension>) => void
  notConfiguredLabel?: string
}) {
  return (
    <div className="spn-card">
      <div className="spn-shape-card-header">
        <h3 className="spn-card-title">{title}</h3>
        <label className="spn-checklist-item">
          <input
            type="checkbox"
            checked={enabled}
            disabled={!onToggleEnabled}
            onChange={(e) => onToggleEnabled?.(e.target.checked)}
          />
          <span>Use in SPANOVA analyses</span>
        </label>
      </div>

      <div className="spn-shape-card-diagram">{diagram}</div>

      {enabled && <GenerationTable dimensions={dimensions} onUpdateDimension={onUpdateDimension} notConfiguredLabel={notConfiguredLabel} />}
    </div>
  )
}
