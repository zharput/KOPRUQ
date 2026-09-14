import type { Dispatch, SetStateAction } from 'react'
import ParameterProvenanceTable from '../../../../shared/ui/ParameterProvenanceTable'
import type { ProvenanceRow } from '../../../../shared/ui/ParameterProvenanceTable'
import type { LaneFactor, Lm1Parameters } from '../../api/trafficLoadsService'

/**
 * Traffic > LM1 (EN 1991-2 4.3.2 - tandem system + UDL). Characteristic
 * Q/q values start unconfirmed (`value: null`, `CODE_DEFAULT`) - never
 * invented - and adjustment factors start at the confirmed αQi=αqi=1.0
 * (`NATIONAL_ANNEX`, the P07 scope-round decision). Editing either
 * flips that row's provenance to `PROJECT_OVERRIDE` client-side; a
 * "Restore" action puts it back. Effective values and validation come
 * from the backend's `/resolve` call (`resolved`) - this component
 * only edits raw state (`lm1`/`onChange`), never computes (plan
 * principle #18).
 */
export default function Lm1Panel({
  lm1,
  onChange,
  resolved,
}: {
  lm1: Lm1Parameters
  onChange: Dispatch<SetStateAction<Lm1Parameters | null>>
  resolved: Lm1Parameters | undefined
}) {
  function updateCharacteristic(section: 'tandemSystem' | 'udl', index: number, value: number) {
    onChange((prev) => {
      if (!prev) return prev
      const list = prev[section].map((factor, i) =>
        i === index ? { ...factor, characteristicValue: { ...factor.characteristicValue, value, provenance: 'PROJECT_OVERRIDE' as const } } : factor,
      )
      return { ...prev, [section]: list }
    })
  }

  function updateFactor(section: 'tandemSystem' | 'udl', index: number, value: number) {
    onChange((prev) => {
      if (!prev) return prev
      const list = prev[section].map((factor, i) =>
        i === index ? { ...factor, adjustmentFactor: { ...factor.adjustmentFactor, value, provenance: 'PROJECT_OVERRIDE' as const } } : factor,
      )
      return { ...prev, [section]: list }
    })
  }

  function restoreCharacteristic(section: 'tandemSystem' | 'udl', index: number) {
    onChange((prev) => {
      if (!prev) return prev
      const list = prev[section].map((factor, i) =>
        i === index
          ? { ...factor, characteristicValue: { ...factor.characteristicValue, value: factor.characteristicValue.codeDefaultValue, provenance: 'CODE_DEFAULT' as const } }
          : factor,
      )
      return { ...prev, [section]: list }
    })
  }

  function restoreFactor(section: 'tandemSystem' | 'udl', index: number) {
    onChange((prev) => {
      if (!prev) return prev
      const list = prev[section].map((factor, i) =>
        i === index
          ? { ...factor, adjustmentFactor: { ...factor.adjustmentFactor, value: factor.adjustmentFactor.codeDefaultValue, provenance: 'NATIONAL_ANNEX' as const } }
          : factor,
      )
      return { ...prev, [section]: list }
    })
  }

  function updateRemainingAreaCharacteristic(value: number) {
    onChange((prev) =>
      prev
        ? { ...prev, remainingAreaUdl: { ...prev.remainingAreaUdl, characteristicValue: { ...prev.remainingAreaUdl.characteristicValue, value, provenance: 'PROJECT_OVERRIDE' as const } } }
        : prev,
    )
  }

  function updateRemainingAreaFactor(value: number) {
    onChange((prev) =>
      prev
        ? { ...prev, remainingAreaUdl: { ...prev.remainingAreaUdl, adjustmentFactor: { ...prev.remainingAreaUdl.adjustmentFactor, value, provenance: 'PROJECT_OVERRIDE' as const } } }
        : prev,
    )
  }

  function restoreRemainingAreaCharacteristic() {
    onChange((prev) =>
      prev
        ? { ...prev, remainingAreaUdl: { ...prev.remainingAreaUdl, characteristicValue: { ...prev.remainingAreaUdl.characteristicValue, value: prev.remainingAreaUdl.characteristicValue.codeDefaultValue, provenance: 'CODE_DEFAULT' as const } } }
        : prev,
    )
  }

  function restoreRemainingAreaFactor() {
    onChange((prev) =>
      prev
        ? { ...prev, remainingAreaUdl: { ...prev.remainingAreaUdl, adjustmentFactor: { ...prev.remainingAreaUdl.adjustmentFactor, value: prev.remainingAreaUdl.adjustmentFactor.codeDefaultValue, provenance: 'NATIONAL_ANNEX' as const } } }
        : prev,
    )
  }

  function buildRows(
    section: 'tandemSystem' | 'udl',
    factors: LaneFactor[],
    resolvedFactors: LaneFactor[] | undefined,
    valueUnit: string,
  ): ProvenanceRow[] {
    return factors.flatMap((factor, i) => {
      const effective = resolvedFactors?.[i]
      return [
        {
          label: factor.label,
          value: factor.characteristicValue.value,
          provenance: factor.characteristicValue.provenance,
          unit: valueUnit,
          onChange: (v: number) => updateCharacteristic(section, i, v),
          onRestore: () => restoreCharacteristic(section, i),
        },
        {
          label: `${factor.label} - adjustment factor`,
          value: factor.adjustmentFactor.value,
          provenance: factor.adjustmentFactor.provenance,
          unit: '-',
          effectiveValue: effective ? (effective.characteristicValue.value == null || effective.adjustmentFactor.value == null ? null : effective.characteristicValue.value * effective.adjustmentFactor.value) : undefined,
          onChange: (v: number) => updateFactor(section, i, v),
          onRestore: () => restoreFactor(section, i),
        },
      ]
    })
  }

  const remainingAreaEffective = resolved?.remainingAreaUdl
    ? resolved.remainingAreaUdl.characteristicValue.value == null || resolved.remainingAreaUdl.adjustmentFactor.value == null
      ? null
      : resolved.remainingAreaUdl.characteristicValue.value * resolved.remainingAreaUdl.adjustmentFactor.value
    : undefined

  return (
    <div className="spn-card">
      <h2 className="spn-card-title">LM1 - Tandem System & UDL</h2>
      <p className="spn-card-subtitle">
        EN 1991-2 4.3.2. Characteristic Q/q values are not pre-filled - they must be confirmed by the engineer.
        Adjustment factors default to α = 1.00 (EN base, no National Annex adjustment - P07 scope decision).
      </p>

      <h3 style={{ marginBottom: 8, fontSize: 13.5 }}>Tandem System (Qik)</h3>
      <ParameterProvenanceTable rows={buildRows('tandemSystem', lm1.tandemSystem, resolved?.tandemSystem, 'kN')} />

      <h3 style={{ margin: '18px 0 8px', fontSize: 13.5 }}>UDL (qik)</h3>
      <ParameterProvenanceTable rows={buildRows('udl', lm1.udl, resolved?.udl, 'kN/m²')} />

      <h3 style={{ margin: '18px 0 8px', fontSize: 13.5 }}>Remaining Area (qrk)</h3>
      <ParameterProvenanceTable
        rows={[
          {
            label: lm1.remainingAreaUdl.label,
            value: lm1.remainingAreaUdl.characteristicValue.value,
            provenance: lm1.remainingAreaUdl.characteristicValue.provenance,
            unit: 'kN/m²',
            onChange: updateRemainingAreaCharacteristic,
            onRestore: restoreRemainingAreaCharacteristic,
          },
          {
            label: `${lm1.remainingAreaUdl.label} - adjustment factor`,
            value: lm1.remainingAreaUdl.adjustmentFactor.value,
            provenance: lm1.remainingAreaUdl.adjustmentFactor.provenance,
            unit: '-',
            effectiveValue: remainingAreaEffective,
            onChange: updateRemainingAreaFactor,
            onRestore: restoreRemainingAreaFactor,
          },
        ]}
      />
    </div>
  )
}
