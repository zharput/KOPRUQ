import { useState } from 'react'
import DecimalInput from '../../../shared/ui/DecimalInput'
import type { CrossSectionValues } from '../../superstructure-families'
import { carriagewayWidthM } from '../../superstructure-families'

/**
 * Loads > Self Weight & Permanent (2026-09-13, engineer's own
 * numbered spec, verbatim formulas - spec section 22, never invented):
 *
 * <pre>
 *   Concrete Self Weight = 25 kN/m3                                (passive)
 *   Asphalt      = thickness x carriageway x unit weight  kN/m
 *   Kaldirim     = thickness x (left+right walkway) x unit weight  kN/m
 *   Precast facia = count x width x thickness x unit weight        kN/m
 *   Guardrail          = count x unit load                         kN/m
 *   Pedestrian railing = count x unit load                         kN/m
 *   Protective fence   = count x unit load                         kN/m
 *   Sound panel        = count x unit load                         kN/m
 *   TOTAL = sum of the 7 line-load rows above (Concrete Self Weight
 *           is a kN/m3 material property, not a kN/m line load, so it
 *           is excluded from TOTAL).
 * </pre>
 *
 * Every numeric term is a live edit box except the three the engineer
 * explicitly called passive: the flat Concrete Self Weight row, the
 * Asphalt row's width term (now the Superstructure cross section's
 * computed Carriageway - "Asphalt yükünü hesaplarken 12.00 değerine
 * bunu vereceksin, edit yapılamayacak"), and the Kaldirim row's width
 * term (the sum of Superstructure's Left+Right walkway - "(1+1.50)
 * genişlik pasif olacak. superstructure menüsünden toplayıp buraya
 * yazılacak"). `crossSectionValues` is lifted state from `App.tsx`
 * (Superstructure Families' `PrecastCrossSection`), so editing a
 * walkway or platform width there updates these rows here with no
 * reload - the cross-feature reactivity the engineer asked for
 * ("herhangi bir değer edit yapılınca ... buradaki değerler update
 * olmalı").
 *
 * <p>**Formatting rule** (2026-09-13, follow-up - a marked-up
 * screenshot circling the "count" fields in red and the passive terms
 * in blue): every term shows 2 decimals EXCEPT the integer "count"
 * fields (facia/guardrail/pedestrian-railing/protective-fence/sound-
 * panel counts - `Term.kind === 'integer'`), which stay plain whole
 * numbers. Passive terms (`kind === 'passive'`) also get a visibly
 * grayed-out box (`.spn-input-passive`) so it reads as "computed, not
 * enterable" at a glance. `DecimalInput` (`shared/ui`) handles the
 * "show 2 decimals but don't fight the user mid-keystroke" formatting
 * for the editable decimal terms.
 */
interface SelfWeightInputs {
  asphaltThicknessM: number
  asphaltUnitWeightKNm3: number
  sidewalkThicknessM: number
  sidewalkUnitWeightKNm3: number
  faciaCount: number
  faciaWidthM: number
  faciaThicknessM: number
  faciaUnitWeightKNm3: number
  guardrailCount: number
  guardrailUnitLoadKNm: number
  pedestrianRailingCount: number
  pedestrianRailingUnitLoadKNm: number
  protectiveFenceCount: number
  protectiveFenceUnitLoadKNm: number
  soundPanelCount: number
  soundPanelUnitLoadKNm: number
}

const INITIAL_SELF_WEIGHT_INPUTS: SelfWeightInputs = {
  asphaltThicknessM: 0.1,
  asphaltUnitWeightKNm3: 24,
  sidewalkThicknessM: 0.25,
  sidewalkUnitWeightKNm3: 25,
  faciaCount: 2,
  faciaWidthM: 0.7,
  faciaThicknessM: 0.08,
  faciaUnitWeightKNm3: 25,
  guardrailCount: 2,
  guardrailUnitLoadKNm: 2.0,
  pedestrianRailingCount: 2,
  pedestrianRailingUnitLoadKNm: 1.5,
  protectiveFenceCount: 2,
  protectiveFenceUnitLoadKNm: 1.0,
  soundPanelCount: 1,
  soundPanelUnitLoadKNm: 1.0,
}

export default function SelfWeightPermanent({ crossSectionValues }: { crossSectionValues: CrossSectionValues }) {
  const [inputs, setInputs] = useState<SelfWeightInputs>(INITIAL_SELF_WEIGHT_INPUTS)

  function update<K extends keyof SelfWeightInputs>(key: K, value: number) {
    setInputs((prev) => ({ ...prev, [key]: value }))
  }

  const carriagewayM = carriagewayWidthM(crossSectionValues)
  const sidewalkWidthM = crossSectionValues.leftWalkwayM + crossSectionValues.rightWalkwayM

  const asphaltResult = inputs.asphaltThicknessM * carriagewayM * inputs.asphaltUnitWeightKNm3
  const sidewalkResult = inputs.sidewalkThicknessM * sidewalkWidthM * inputs.sidewalkUnitWeightKNm3
  const faciaResult = inputs.faciaCount * inputs.faciaWidthM * inputs.faciaThicknessM * inputs.faciaUnitWeightKNm3
  const guardrailResult = inputs.guardrailCount * inputs.guardrailUnitLoadKNm
  const pedestrianRailingResult = inputs.pedestrianRailingCount * inputs.pedestrianRailingUnitLoadKNm
  const protectiveFenceResult = inputs.protectiveFenceCount * inputs.protectiveFenceUnitLoadKNm
  const soundPanelResult = inputs.soundPanelCount * inputs.soundPanelUnitLoadKNm

  const total =
    asphaltResult + sidewalkResult + faciaResult + guardrailResult + pedestrianRailingResult + protectiveFenceResult + soundPanelResult

  return (
    <div className="spn-card">
      <h2 className="spn-card-title">Self Weight & Permanent</h2>
      <p className="spn-card-subtitle">
        Permanent-load breakdown, kN/m. Grayed-out fields (Concrete Self Weight, and the width terms in Asphalt/
        Kaldırım) are computed live from Superstructure Families &gt; Precast - editing a walkway or platform width
        there updates the results here.
      </p>

      <div className="spn-formula-rows">
        <div className="spn-formula-row">
          <span className="spn-formula-label">Concrete Self Weight</span>
          <span className="spn-formula-eq">=</span>
          <input className="spn-input spn-input-number spn-formula-input spn-input-passive" value="25.00" readOnly />
          <span className="spn-formula-unit">kN/m&sup3;</span>
        </div>

        <FormulaRow
          label="Asphalt"
          terms={[
            { value: inputs.asphaltThicknessM, kind: 'decimal', onChange: (v) => update('asphaltThicknessM', v), unit: 'm' },
            { value: carriagewayM, kind: 'passive', unit: 'm' },
            { value: inputs.asphaltUnitWeightKNm3, kind: 'decimal', onChange: (v) => update('asphaltUnitWeightKNm3', v), unit: 'kN/m³' },
          ]}
          result={asphaltResult}
        />

        <FormulaRow
          label="Kaldırım (Sidewalk)"
          terms={[
            { value: inputs.sidewalkThicknessM, kind: 'decimal', onChange: (v) => update('sidewalkThicknessM', v), unit: 'm' },
            {
              value: sidewalkWidthM,
              kind: 'passive',
              unit: 'm',
              display: `${crossSectionValues.leftWalkwayM.toFixed(2)} + ${crossSectionValues.rightWalkwayM.toFixed(2)}`,
            },
            { value: inputs.sidewalkUnitWeightKNm3, kind: 'decimal', onChange: (v) => update('sidewalkUnitWeightKNm3', v), unit: 'kN/m³' },
          ]}
          result={sidewalkResult}
        />

        <FormulaRow
          label="Precast facia"
          terms={[
            { value: inputs.faciaCount, kind: 'integer', onChange: (v) => update('faciaCount', v), unit: '' },
            { value: inputs.faciaWidthM, kind: 'decimal', onChange: (v) => update('faciaWidthM', v), unit: 'm' },
            { value: inputs.faciaThicknessM, kind: 'decimal', onChange: (v) => update('faciaThicknessM', v), unit: 'm' },
            { value: inputs.faciaUnitWeightKNm3, kind: 'decimal', onChange: (v) => update('faciaUnitWeightKNm3', v), unit: 'kN/m³' },
          ]}
          result={faciaResult}
        />

        <FormulaRow
          label="Guardrail"
          terms={[
            { value: inputs.guardrailCount, kind: 'integer', onChange: (v) => update('guardrailCount', v), unit: '' },
            { value: inputs.guardrailUnitLoadKNm, kind: 'decimal', onChange: (v) => update('guardrailUnitLoadKNm', v), unit: 'kN/m' },
          ]}
          result={guardrailResult}
        />

        <FormulaRow
          label="Pedestrian railing"
          terms={[
            { value: inputs.pedestrianRailingCount, kind: 'integer', onChange: (v) => update('pedestrianRailingCount', v), unit: '' },
            {
              value: inputs.pedestrianRailingUnitLoadKNm,
              kind: 'decimal',
              onChange: (v) => update('pedestrianRailingUnitLoadKNm', v),
              unit: 'kN/m',
            },
          ]}
          result={pedestrianRailingResult}
        />

        <FormulaRow
          label="Protective fence"
          terms={[
            { value: inputs.protectiveFenceCount, kind: 'integer', onChange: (v) => update('protectiveFenceCount', v), unit: '' },
            {
              value: inputs.protectiveFenceUnitLoadKNm,
              kind: 'decimal',
              onChange: (v) => update('protectiveFenceUnitLoadKNm', v),
              unit: 'kN/m',
            },
          ]}
          result={protectiveFenceResult}
        />

        <FormulaRow
          label="Sound panel"
          terms={[
            { value: inputs.soundPanelCount, kind: 'integer', onChange: (v) => update('soundPanelCount', v), unit: '' },
            { value: inputs.soundPanelUnitLoadKNm, kind: 'decimal', onChange: (v) => update('soundPanelUnitLoadKNm', v), unit: 'kN/m' },
          ]}
          result={soundPanelResult}
        />

        <div className="spn-formula-row spn-formula-total">
          <span className="spn-formula-label">TOTAL</span>
          <span className="spn-formula-eq">=</span>
          <span className="spn-formula-result">{total.toFixed(2)} kN/m</span>
        </div>
      </div>
    </div>
  )
}

interface Term {
  value: number
  kind: 'decimal' | 'integer' | 'passive'
  onChange?: (value: number) => void
  unit: string
  display?: string
}

function FormulaRow({ label, terms, result }: { label: string; terms: Term[]; result: number }) {
  return (
    <div className="spn-formula-row">
      <span className="spn-formula-label">{label}</span>
      <span className="spn-formula-eq">=</span>
      {terms.map((term, i) => (
        <span key={i} className="spn-formula-term">
          {i > 0 && <span className="spn-formula-op">&times;</span>}
          {term.kind === 'decimal' && (
            <DecimalInput
              className="spn-input spn-input-number spn-formula-input"
              value={term.value}
              onChange={(v) => term.onChange?.(v)}
            />
          )}
          {term.kind === 'integer' && (
            <input
              type="number"
              className="spn-input spn-input-number spn-formula-input"
              value={term.value}
              onChange={(e) => term.onChange?.(Number(e.target.value))}
            />
          )}
          {term.kind === 'passive' && (
            <input
              className="spn-input spn-input-number spn-formula-input spn-input-passive"
              style={term.display ? { width: 104 } : undefined}
              value={term.display ?? term.value.toFixed(2)}
              readOnly
            />
          )}
          {term.unit && <span className="spn-formula-unit">{term.unit}</span>}
        </span>
      ))}
      <span className="spn-formula-eq">=</span>
      <span className="spn-formula-result">{result.toFixed(2)} kN/m</span>
    </div>
  )
}
