import { useState } from 'react'

export type ParameterProvenance = 'CODE_DEFAULT' | 'NATIONAL_ANNEX' | 'PROJECT_OVERRIDE'

export interface ProvenanceRow {
  label: string
  value: number | null
  provenance: ParameterProvenance
  unit: string
  effectiveValue?: number | null
  onChange?: (value: number) => void
  onRestore?: () => void
}

const PROVENANCE_LABEL: Record<ParameterProvenance, string> = {
  CODE_DEFAULT: 'Code',
  NATIONAL_ANNEX: 'Nat. Annex',
  PROJECT_OVERRIDE: 'Override',
}

const PROVENANCE_BADGE_CLASS: Record<ParameterProvenance, string> = {
  CODE_DEFAULT: 'spn-badge spn-badge-code',
  NATIONAL_ANNEX: 'spn-badge spn-badge-na',
  PROJECT_OVERRIDE: 'spn-badge spn-badge-override',
}

/**
 * Reusable Parameter/Value/Unit/Source/Effective/Restore table
 * (TRAFFIC-P01, plan section G) - built for LM1's Q/q characteristic
 * values and adjustment factors, generic enough for any future
 * code-value-with-provenance screen.
 *
 * <p>A `value` of `null` means "genuinely unconfirmed EN value" (spec
 * section 22 - never invent a placeholder number, never default to
 * 0). The editable cell (`NullableDecimalCell`) shows a blank input
 * with a "not confirmed" placeholder instead of a fake 0.00, mirroring
 * `DecimalInput`'s own "don't fight the user mid-keystroke" behavior
 * but supporting the null/empty case DecimalInput does not.
 */
export default function ParameterProvenanceTable({ rows }: { rows: ProvenanceRow[] }) {
  return (
    <div className="spn-param-table-wrap">
      <table className="spn-table spn-param-table">
        <colgroup>
          <col className="spn-col-label" />
          <col className="spn-col-value" />
          <col />
          <col />
          <col className="spn-col-value" />
          <col />
        </colgroup>
        <thead>
          <tr>
            <th>Parameter</th>
            <th>Value</th>
            <th>Unit</th>
            <th>Source</th>
            <th>Effective</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <td>{row.label}</td>
              <td>
                {row.onChange ? (
                  <NullableDecimalCell value={row.value} onChange={row.onChange} />
                ) : (
                  <input
                    className="spn-input spn-input-number spn-formula-input spn-input-passive"
                    value={row.value == null ? '' : row.value.toFixed(2)}
                    placeholder="not confirmed"
                    readOnly
                  />
                )}
                {row.value == null && (
                  <div style={{ fontSize: 11, color: '#ff9f0a', marginTop: 3 }}>not confirmed</div>
                )}
              </td>
              <td>{row.unit}</td>
              <td>
                <span className={PROVENANCE_BADGE_CLASS[row.provenance]}>{PROVENANCE_LABEL[row.provenance]}</span>
              </td>
              <td>{row.effectiveValue == null ? '—' : row.effectiveValue.toFixed(2)}</td>
              <td>
                {row.onRestore && row.provenance === 'PROJECT_OVERRIDE' && (
                  <button
                    type="button"
                    className="spn-button-secondary"
                    style={{ padding: '3px 10px', fontSize: 11.5 }}
                    onClick={row.onRestore}
                  >
                    Restore
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function NullableDecimalCell({ value, onChange }: { value: number | null; onChange: (value: number) => void }) {
  const [focused, setFocused] = useState(false)
  const [text, setText] = useState(value == null ? '' : value.toFixed(2))

  return (
    <input
      type="text"
      inputMode="decimal"
      className="spn-input spn-input-number spn-formula-input"
      placeholder="not confirmed"
      value={focused ? text : value == null ? '' : value.toFixed(2)}
      onFocus={() => {
        setText(value == null ? '' : value.toFixed(2))
        setFocused(true)
      }}
      onChange={(e) => {
        const raw = e.target.value
        setText(raw)
        const parsed = Number(raw)
        if (raw.trim() !== '' && !Number.isNaN(parsed)) onChange(parsed)
      }}
      onBlur={() => setFocused(false)}
    />
  )
}
