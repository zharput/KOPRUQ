import type { Dispatch, SetStateAction } from 'react'
import { HDim } from '../../../shared/ui/ParamSweepCard'
import { BulbTeeGirderShape } from '../../../shared/ui/BulbTeeGirderShape'
import DecimalInput from '../../../shared/ui/DecimalInput'
import { carriagewayWidthM, type CrossSectionValues } from '../model/types'

/**
 * Superstructure Families > Precast (2026-09-13, engineer's own
 * reference drawing): a schematic precast-girder deck cross section,
 * same "diagram on top, parameters below" pattern as Pier Families/
 * Girder Library (`shared/ui/ParamSweepCard.tsx`'s layout convention
 * and `HDim` helper, reused here).
 *
 * <p>**Overhang is computed, not entered** (the engineer's own given
 * formula, spec section 22 - used exactly as given, not adjusted to
 * match textbook girder-spacing convention which would normally use
 * `spaceOfGirder x (numberOfGirders - 1)`):
 * <pre>
 *   girderSpanWidth = spaceOfGirderM x numberOfGirders
 *   overhang = (platformWidthM - girderSpanWidth) / 2
 * </pre>
 * This is the cantilever distance beyond the outermost girder on each
 * side. The engineer's own check: overhang must be at least half the
 * girder spacing (`spaceOfGirderM / 2`) - shown live next to the
 * computed value as green "OK..." or red "NOT OK!", not just a number.
 *
 * <p>**The diagram is dynamic again** (2026-09-13, follow-up - reverses
 * this same day's earlier "keep it static" instruction: "kiriş adedine
 * göre şekli yine dinamik yap. kiriş sayısı artınca şekilde değişsin.").
 * Girder count/spacing, walkway widths, and platform width all redraw
 * the diagram live, using the exact same `overhangM`/girder-span
 * formula shown below the diagram - so the drawing and the numbers can
 * never disagree. Girder `i` (0-indexed) is centered at
 * `overhangM + spaceOfGirderM x (i + 0.5)` from the left platform edge -
 * derived from the engineer's own overhang formula (not a separate
 * invented layout rule), so the visible overhang each side matches the
 * computed value by construction.
 *
 * <p>Height of deck/asphalt/waterproofing and the prefabricated cap
 * dimensions were removed from this screen 2026-09-13 (engineer's own
 * instruction - "şekildeki bilgileri superstructuras menü'den kaldır").
 *
 * <p>**Carriageway** (2026-09-13, engineer's own instruction - "Carrigway
 * = kaldırım dibi yatay mesafeyi hesaplat yazdır. Editlenmeyecek"):
 * computed, non-editable, = platform width minus both walkways
 * (`carriagewayWidthM`, `shared` across features via `../model/types`).
 * This value feeds Loads' Self Weight & Permanent > Asphalt row's width
 * term, which is why the cross-section state now lives in `App.tsx`
 * (lifted, passed in as `values`/`setValues`) instead of local
 * `useState` - the same "lift shared state" pattern already used for
 * `bridges`/`designCode`.
 *
 * <p>**Formatting rule** (2026-09-13, same follow-up): every value here
 * (fields and diagram labels alike) shows 2 decimals except Number of
 * girders (a count, not a physical dimension - stays a plain whole
 * number). Carriageway/Overhang are read-only and visibly grayed out
 * (`.spn-input-passive`) so they read as computed, not enterable.
 */
export default function PrecastCrossSection({
  values,
  setValues,
}: {
  values: CrossSectionValues
  setValues: Dispatch<SetStateAction<CrossSectionValues>>
}) {
  function update<K extends keyof CrossSectionValues>(key: K, value: number) {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  const carriagewayM = carriagewayWidthM(values)

  const girderSpanWidthM = values.spaceOfGirderM * values.numberOfGirders
  const overhangM = (values.platformWidthM - girderSpanWidthM) / 2
  const minOverhangM = values.spaceOfGirderM / 2
  const overhangOk = overhangM >= minOverhangM

  return (
    <div className="spn-card">
      <div className="spn-shape-card-header">
        <h3 className="spn-card-title">Precast Girder - Deck Cross Section</h3>
      </div>
      <p className="spn-card-subtitle">
        Overhang (cantilever beyond the outermost girder) = (Platform width - Space of girder &times; Number of
        girders) / 2 - must be at least half the girder spacing. The diagram redraws live as any of these change.
      </p>

      <div className="spn-shape-card-diagram">
        <DeckCrossSectionDiagram values={values} carriagewayM={carriagewayM} overhangM={overhangM} />
      </div>

      <div className="spn-field-grid">
        <DecimalField label="Platform width (m)" value={values.platformWidthM} onChange={(v) => update('platformWidthM', v)} />
        <DecimalField label="Left walkway (m)" value={values.leftWalkwayM} onChange={(v) => update('leftWalkwayM', v)} />
        <DecimalField label="Right walkway (m)" value={values.rightWalkwayM} onChange={(v) => update('rightWalkwayM', v)} />
        <DecimalField label="Space of girder (m)" value={values.spaceOfGirderM} onChange={(v) => update('spaceOfGirderM', v)} />
        <label className="spn-field">
          <span>Number of girders</span>
          <input
            type="number"
            className="spn-input spn-input-number"
            value={values.numberOfGirders}
            onChange={(e) => update('numberOfGirders', Number(e.target.value))}
          />
        </label>
        <div className="spn-field">
          <span>Carriageway - computed (m)</span>
          <input className="spn-input spn-input-number spn-input-passive" value={carriagewayM.toFixed(2)} readOnly style={{ marginTop: 4 }} />
        </div>
        <div className="spn-field">
          <span>Overhang - computed (m)</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
            <input className="spn-input spn-input-number spn-input-passive" value={overhangM.toFixed(2)} readOnly />
            <span style={{ color: overhangOk ? '#34c759' : '#f87171', fontWeight: 700, fontSize: 12.5, whiteSpace: 'nowrap' }}>
              {overhangOk ? 'OK...' : 'NOT OK!'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function DecimalField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="spn-field">
      <span>{label}</span>
      <DecimalInput value={value} onChange={onChange} />
    </label>
  )
}

const WALKWAY_FILL = '#1f6f40'
const WALKWAY_STROKE = '#14502c'

/**
 * Live schematic: girder count/positions, walkway widths, and every
 * dimension-line label are all derived from `values` - see this file's
 * top javadoc for the girder-centering formula (reuses the same
 * overhang math shown numerically below the diagram, so drawing and
 * numbers can't disagree).
 */
function DeckCrossSectionDiagram({
  values,
  carriagewayM,
  overhangM,
}: {
  values: CrossSectionValues
  carriagewayM: number
  overhangM: number
}) {
  const fill = 'var(--accent)'
  const fillOpacity = 0.22
  const x0 = 40
  const x1 = 600
  const deckTopY = 70
  const deckBottomY = 92
  const girderTopY = deckBottomY
  const overhangDimY = 175

  const pixelsPerMeter = values.platformWidthM > 0 ? (x1 - x0) / values.platformWidthM : 0
  const leftWalkwayPx = Math.max(0, values.leftWalkwayM * pixelsPerMeter)
  const rightWalkwayPx = Math.max(0, values.rightWalkwayM * pixelsPerMeter)
  const carriagewayStartX = x0 + leftWalkwayPx
  const carriagewayEndX = x1 - rightWalkwayPx

  const girderCount = Number.isFinite(values.numberOfGirders) ? Math.max(0, Math.round(values.numberOfGirders)) : 0
  const girderCentersPx = Array.from({ length: girderCount }, (_, i) => {
    const centerM = overhangM + values.spaceOfGirderM * (i + 0.5)
    return x0 + centerM * pixelsPerMeter
  })
  const spacingPx = values.spaceOfGirderM * pixelsPerMeter
  const girderScale = Math.min(0.28, Math.max(0.08, (spacingPx / 160) * 0.9))

  return (
    <svg viewBox="0 0 640 195" width="100%" style={{ maxWidth: 640 }}>
      <HDim x1={x0} x2={x1} y={16} label={`Platform width: ${values.platformWidthM.toFixed(2)} m`} />
      <HDim x1={x0} x2={carriagewayStartX} y={32} label={`Left walkway: ${values.leftWalkwayM.toFixed(2)} m`} />
      <HDim x1={carriagewayEndX} x2={x1} y={32} label={`Right walkway: ${values.rightWalkwayM.toFixed(2)} m`} />
      <HDim x1={carriagewayStartX} x2={carriagewayEndX} y={48} label={`Carriageway: ${carriagewayM.toFixed(2)} m`} />

      {/* Deck slab */}
      <rect x={x0} y={deckTopY} width={x1 - x0} height={deckBottomY - deckTopY} fill={fill} fillOpacity={fillOpacity} stroke={fill} strokeWidth={1.5} />

      {/* Walkway zones (dark green, sized live from Left/Right walkway - "içe doğru uzayacak yada kısalacak") + guardrail posts */}
      <rect x={x0} y={deckTopY - 12} width={leftWalkwayPx} height={12} fill={WALKWAY_FILL} stroke={WALKWAY_STROKE} strokeWidth={1} />
      <rect x={x1 - rightWalkwayPx} y={deckTopY - 12} width={rightWalkwayPx} height={12} fill={WALKWAY_FILL} stroke={WALKWAY_STROKE} strokeWidth={1} />
      <line x1={x0 + 2} y1={deckTopY - 12} x2={x0 + 2} y2={deckTopY - 28} stroke="var(--text-secondary)" strokeWidth={2} />
      <line x1={x1 - 2} y1={deckTopY - 12} x2={x1 - 2} y2={deckTopY - 28} stroke="var(--text-secondary)" strokeWidth={2} />

      {/* Girders - live count/position, same outline as Girder Library's Precast Girder */}
      {girderCentersPx.map((cx, i) => (
        <BulbTeeGirderShape key={i} x={cx} y={girderTopY} scale={girderScale} />
      ))}

      {girderCentersPx.length >= 1 && (
        <>
          <HDim x1={x0} x2={girderCentersPx[0]} y={overhangDimY} label={`Overhang: ${overhangM.toFixed(2)} m`} />
          <HDim x1={girderCentersPx[girderCentersPx.length - 1]} x2={x1} y={overhangDimY} label={`Overhang: ${overhangM.toFixed(2)} m`} />
        </>
      )}

      {girderCentersPx.length >= 3 && (
        <HDim x1={girderCentersPx[1]} x2={girderCentersPx[2]} y={overhangDimY} label={`Space of girder: ${values.spaceOfGirderM.toFixed(2)} m`} />
      )}
    </svg>
  )
}
