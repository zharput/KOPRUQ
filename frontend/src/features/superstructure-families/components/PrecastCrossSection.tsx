import { useState } from 'react'
import { HDim } from '../../../shared/ui/ParamSweepCard'
import { BulbTeeGirderShape } from '../../../shared/ui/BulbTeeGirderShape'

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
 * <p>**The diagram itself is static** (2026-09-13, engineer's own
 * instruction - "aralık ve kiriş sayısına göre şekli değiştirme, sadece
 * hesap yap, uyar"): it always draws the same fixed, undistorted
 * arrangement of girders (the real bulb-tee outline from Girder
 * Library, via `shared/ui/BulbTeeGirderShape.tsx` - not a different
 * simplified shape), regardless of what `Number of girders`/`Space of
 * girder` are set to. Only the dimension-line *labels* (platform width,
 * walkways, space of girder) read the live entered values as text - the
 * geometry they're drawn on stays fixed. Only the numeric
 * calculation/warning is live, exactly as asked.
 *
 * <p>Height of deck/asphalt/waterproofing and the prefabricated cap
 * dimensions were removed from this screen 2026-09-13 (engineer's own
 * instruction - "şekildeki bilgileri superstructuras menü'den kaldır").
 */
interface CrossSectionValues {
  platformWidthM: number
  leftWalkwayM: number
  rightWalkwayM: number
  spaceOfGirderM: number
  numberOfGirders: number
}

const INITIAL_VALUES: CrossSectionValues = {
  platformWidthM: 13.8,
  leftWalkwayM: 1.0,
  rightWalkwayM: 1.5,
  spaceOfGirderM: 2.0,
  numberOfGirders: 5,
}

export default function PrecastCrossSection() {
  const [values, setValues] = useState<CrossSectionValues>(INITIAL_VALUES)

  function update<K extends keyof CrossSectionValues>(key: K, raw: string) {
    setValues((prev) => ({ ...prev, [key]: Number(raw) }))
  }

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
        girders) / 2 - must be at least half the girder spacing. The diagram is a fixed schematic - it does not
        redraw itself as girder count/spacing change, only the numbers below do.
      </p>

      <div className="spn-shape-card-diagram">
        <DeckCrossSectionDiagram values={values} />
      </div>

      <div className="spn-field-grid">
        <Field label="Platform width (m)" value={values.platformWidthM} onChange={(v) => update('platformWidthM', v)} />
        <Field label="Left walkway (m)" value={values.leftWalkwayM} onChange={(v) => update('leftWalkwayM', v)} />
        <Field label="Right walkway (m)" value={values.rightWalkwayM} onChange={(v) => update('rightWalkwayM', v)} />
        <Field label="Space of girder (m)" value={values.spaceOfGirderM} onChange={(v) => update('spaceOfGirderM', v)} />
        <Field label="Number of girders" value={values.numberOfGirders} onChange={(v) => update('numberOfGirders', v)} />
        <div className="spn-field">
          <span>Overhang - computed (m)</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
            <input className="spn-input spn-input-number" value={overhangM.toFixed(2)} readOnly />
            <span style={{ color: overhangOk ? '#34c759' : '#f87171', fontWeight: 700, fontSize: 12.5, whiteSpace: 'nowrap' }}>
              {overhangOk ? 'OK...' : 'NOT OK!'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({ label, value, onChange }: { label: string; value: number; onChange: (value: string) => void }) {
  return (
    <label className="spn-field">
      <span>{label}</span>
      <input type="number" className="spn-input spn-input-number" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  )
}

/**
 * Fixed, schematic illustration - 5 representative girders at fixed
 * positions, undistorted. Only the HDim labels read live values from
 * `values` (as text); none of the drawn geometry is derived from them.
 */
function DeckCrossSectionDiagram({ values }: { values: CrossSectionValues }) {
  const fill = 'var(--accent)'
  const fillOpacity = 0.22
  const x0 = 40
  const x1 = 600
  const deckTopY = 70
  const deckBottomY = 92
  const girderTopY = deckBottomY
  const girderCenters = [140, 235, 330, 425, 520]

  return (
    <svg viewBox="0 0 640 210" width="100%" style={{ maxWidth: 640 }}>
      <HDim x1={x0} x2={x1} y={16} label={`Platform width: ${values.platformWidthM} m`} />
      <HDim x1={x0} x2={190} y={32} label={`Left walkway: ${values.leftWalkwayM} m`} />
      <HDim x1={450} x2={x1} y={32} label={`Right walkway: ${values.rightWalkwayM} m`} />

      {/* Deck slab */}
      <rect x={x0} y={deckTopY} width={x1 - x0} height={deckBottomY - deckTopY} fill={fill} fillOpacity={fillOpacity} stroke={fill} strokeWidth={1.5} />

      {/* Walkway zones (raised, at the platform edges) + guardrail posts */}
      <rect x={x0} y={deckTopY - 12} width={150} height={12} fill="var(--surface-2)" stroke="var(--border-strong)" strokeWidth={1} />
      <rect x={x1 - 150} y={deckTopY - 12} width={150} height={12} fill="var(--surface-2)" stroke="var(--border-strong)" strokeWidth={1} />
      <line x1={x0 + 2} y1={deckTopY - 12} x2={x0 + 2} y2={deckTopY - 28} stroke="var(--text-secondary)" strokeWidth={2} />
      <line x1={x1 - 2} y1={deckTopY - 12} x2={x1 - 2} y2={deckTopY - 28} stroke="var(--text-secondary)" strokeWidth={2} />

      {/* Girders - fixed representative shapes, same outline as Girder Library's Precast Girder */}
      {girderCenters.map((cx, i) => (
        <BulbTeeGirderShape key={i} x={cx} y={girderTopY} scale={0.28} />
      ))}

      <HDim x1={girderCenters[0]} x2={girderCenters[1]} y={girderTopY - 4} label={`Space of girder: ${values.spaceOfGirderM} m`} />
      <text x={x0} y={195} fontSize={10} fill="var(--text-secondary)">
        Number of girders (entered): {values.numberOfGirders} - schematic shows a fixed representative count.
      </text>
    </svg>
  )
}
