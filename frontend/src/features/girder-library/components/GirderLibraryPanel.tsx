import { useState } from 'react'
import { Box, Component, Layers } from 'lucide-react'
import { ParamSweepCard, HDim, VDim, type Dimension } from '../../../shared/ui/ParamSweepCard'
import { BulbTeeGirderShape } from '../../../shared/ui/BulbTeeGirderShape'
import TabDetailPanel, { type DetailCategory } from '../../../shared/ui/TabDetailPanel'

/**
 * Design System > Girder Library (2026-09-11, restructured 2026-09-13
 * onto top tabs - "girder library'de 3 tip için 3 farklı üst menü olsun,
 * aynı supertructure familie'deki gibi" - same `TabDetailPanel` pattern
 * as Superstructure Families, one tab per girder type: Precast Girder,
 * Steel Girder, Box Girder). Per the engineer's own instruction: Precast
 * Girder is the first, fully-populated tab; Steel Girder and Box Girder
 * are placeholder tabs - position/layout only, no parameters yet, since
 * the engineer will provide their real cross-section data later
 * ("onların bilgisini sonra vereceğim, ama şimdiden yerini
 * düzenleyebilirsin"). Per spec section 22, Steel/Box Girder get no
 * invented parameter names either - an honest "awaiting engineer input"
 * placeholder instead of a table, until the engineer says what their
 * cross-sections look like.
 *
 * <p>Precast Girder is a parametric I/bulb-tee section, redrawn
 * 2026-09-11 to match the engineer's own clean labeled reference
 * diagram exactly (their first drawing only had scale/values, not
 * clearly labeled geometry - this second one nails down what each
 * name actually measures). 8 dimensions, the engineer's exact given
 * order:
 * <ul>
 *   <li>H - overall depth (left side, full height).
 *   <li>tf - <b>top flange width</b> (not a thickness - the full
 *       horizontal span of the top flange's flat cap).
 *   <li>bf - <b>bottom flange width</b> (same idea, at the bottom).
 *   <li>w - web width, at its narrowest point.
 *   <li>th1 - top flange flat-cap thickness (the short flat segment
 *       right at the top edge, full width tf).
 *   <li>th2 - top flange taper thickness (below th1, where the cap
 *       tapers inward down to the web).
 *   <li>bh2 - bottom flange taper thickness (right below the web,
 *       where it flares outward toward the bottom flange).
 *   <li>bh1 - bottom flange flat-block thickness (below bh2, down to
 *       the flat bottom edge, full width bf).
 * </ul>
 * Default values are the ones read directly off the engineer's first
 * (dimensioned) drawing (H=190, tf=150, bf=80, w=20, th1=12, th2=10,
 * bh1=28, bh2=15, all cm) - entered as min=max=that value, delta=0,
 * which {@link generateValues} (shared/ui/ParamSweepCard.tsx) shows as
 * that single confirmed value rather than "not configured", since it is
 * a real given number, not an invented range (spec section 22 - only
 * Circular pier had an actual given min/max/delta spread; this girder
 * only has one given value per dimension). The outline itself is now
 * `shared/ui/BulbTeeGirderShape.tsx` (extracted 2026-09-13 so
 * Superstructure Families' deck cross section can draw the exact same
 * shape, undistorted, at a small scale) - the dimension-line overlays
 * (tf/H/th1/th2/w/bh2/bh1/bf) stay local to this file, they're specific
 * to this fully-dimensioned reference drawing.
 */
const PRECAST_DIMENSIONS: Dimension[] = [
  { key: 'H', label: 'H (cm)', min: 190, max: 190, delta: 0 },
  { key: 'tf', label: 'tf (cm)', min: 150, max: 150, delta: 0 },
  { key: 'bf', label: 'bf (cm)', min: 80, max: 80, delta: 0 },
  { key: 'w', label: 'w (cm)', min: 20, max: 20, delta: 0 },
  { key: 'th1', label: 'th1 (cm)', min: 12, max: 12, delta: 0 },
  { key: 'th2', label: 'th2 (cm)', min: 10, max: 10, delta: 0 },
  { key: 'bh1', label: 'bh1 (cm)', min: 28, max: 28, delta: 0 },
  { key: 'bh2', label: 'bh2 (cm)', min: 15, max: 15, delta: 0 },
]

function PrecastGirderTab() {
  const [enabled, setEnabled] = useState(false)
  const [dimensions, setDimensions] = useState<Dimension[]>(PRECAST_DIMENSIONS)

  function updateDimension(key: string, patch: Partial<Dimension>) {
    setDimensions((prev) => prev.map((d) => (d.key === key ? { ...d, ...patch } : d)))
  }

  return (
    <div className="spn-workflow">
      <p className="spn-hint">
        Min/max/delta define the cross-section values SPANOVA will step through during analysis/optimization, the
        same convention as Pier Families. Precast Girder's defaults below are single given values (min = max, delta
        = 0), not an invented range - only its own value is used until the engineer provides a real min/max sweep
        for this girder. tf/bf are the top/bottom flange widths, th1/th2/bh1/bh2 are the flat-cap/taper thickness
        segments of each flange, per the engineer's own labeled reference diagram.
      </p>

      <ParamSweepCard
        title="Precast Girder"
        enabled={enabled}
        onToggleEnabled={setEnabled}
        diagram={<PrecastGirderDiagram />}
        dimensions={dimensions}
        onUpdateDimension={updateDimension}
      />
    </div>
  )
}

function GirderPlaceholderTab({ title }: { title: string }) {
  return (
    <div className="spn-workflow">
      <div className="spn-card">
        <div className="spn-shape-card-header">
          <h3 className="spn-card-title">{title}</h3>
          <label className="spn-checklist-item">
            <input type="checkbox" checked={false} disabled />
            <span>Use in SPANOVA analyses</span>
          </label>
        </div>

        <div className="spn-shape-card-diagram">
          <svg viewBox="0 0 160 150" width="150" height="140">
            <rect x={30} y={30} width={100} height={90} rx={4} fill="none" stroke="var(--border)" strokeWidth={2} strokeDasharray="6 5" />
            <text x={80} y={80} textAnchor="middle" fontSize={11} fill="var(--text-secondary)">
              No drawing yet
            </text>
          </svg>
        </div>

        <p className="spn-hint">
          Not configured yet - awaiting the engineer's cross-section drawing and dimensions for {title}. Position
          reserved here in the library; no parameters are invented in the meantime.
        </p>
      </div>
    </div>
  )
}

const GIRDER_TYPE_CATEGORIES: DetailCategory[] = [
  { label: 'Precast Girder', icon: Component, content: <PrecastGirderTab /> },
  { label: 'Steel Girder', icon: Layers, content: <GirderPlaceholderTab title="Steel Girder" /> },
  { label: 'Box Girder', icon: Box, content: <GirderPlaceholderTab title="Box Girder" /> },
]

export default function GirderLibraryPanel() {
  return <TabDetailPanel categories={GIRDER_TYPE_CATEGORIES} />
}

/* ---- Precast girder (I / bulb-tee) cross-section diagram ----
   Matches the engineer's own labeled reference diagram (2026-09-11):
   a flat top cap (tf wide, th1 thick) tapering (th2) down into a thin
   web (w wide), then flaring back out (bh2) into a flat bottom block
   (bf wide, bh1 thick). Symmetric about the vertical centerline. */

function PrecastGirderDiagram() {
  return (
    <svg viewBox="0 0 250 260" width="178" height="185">
      <BulbTeeGirderShape x={120} y={20} scale={1} />
      <HDim x1={40} x2={200} y={8} label="tf" />
      <VDim y1={20} y2={225} x={18} label="H" />
      <VDim y1={20} y2={35} x={212} label="th1" labelX={228} />
      <VDim y1={35} y2={70} x={212} label="th2" labelX={228} />
      <HDim x1={105} x2={135} y={120} label="w" />
      <VDim y1={170} y2={195} x={197} label="bh2" labelX={216} />
      <VDim y1={195} y2={225} x={197} label="bh1" labelX={216} />
      <HDim x1={60} x2={180} y={240} label="bf" />
    </svg>
  )
}
