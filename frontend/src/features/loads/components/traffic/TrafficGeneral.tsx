/**
 * Traffic > General - standard/National Annex identification and an
 * honest status list of which load models are actually active in this
 * milestone. Road bridges only (pedestrian bridges explicitly out of
 * scope, per the engineer's instruction). The National Annex field has
 * exactly one option, "EN Base (no National Annex adjustment)" - the
 * standing decision from the P07 scope round (docs/roadmap.md) - not a
 * fabricated country list (plan section F).
 *
 * <p>Load-model status is shown as a read-only list, not togglable
 * checkboxes: nothing downstream actually reacts to a toggle yet
 * (LM2/LM3/LM4/Braking/Centrifugal have no calculation to turn on),
 * so a checkbox that did nothing would misrepresent the model's real
 * state.
 */
const LOAD_MODEL_STATUS: { label: string; active: boolean; note: string }[] = [
  { label: 'LM1 - Tandem system + UDL', active: true, note: 'active' },
  { label: 'LM2 - Single axle', active: false, note: 'not implemented' },
  { label: 'LM3 - Special vehicles', active: false, note: 'not implemented' },
  { label: 'LM4 - Crowd loading', active: false, note: 'not implemented' },
  { label: 'Braking & acceleration', active: false, note: 'not implemented' },
  { label: 'Centrifugal forces', active: false, note: 'not implemented' },
]

export default function TrafficGeneral() {
  return (
    <div className="spn-card">
      <h2 className="spn-card-title">General</h2>
      <p className="spn-card-subtitle">EN 1991-2 - Actions on structures, Traffic loads on bridges. Road bridges only.</p>

      <div className="spn-field-grid">
        <div className="spn-field">
          <span>Standard</span>
          <input className="spn-input spn-input-passive" value="EN 1991-2" readOnly style={{ marginTop: 4 }} />
        </div>
        <div className="spn-field">
          <span>National Annex</span>
          <input
            className="spn-input spn-input-passive"
            value="EN Base (no National Annex adjustment)"
            readOnly
            style={{ marginTop: 4 }}
          />
        </div>
        <div className="spn-field">
          <span>Bridge category</span>
          <input className="spn-input spn-input-passive" value="Road bridge" readOnly style={{ marginTop: 4 }} />
        </div>
      </div>

      <h3 style={{ marginTop: 22, marginBottom: 8, fontSize: 13.5 }}>Load models</h3>
      <table className="spn-table">
        <thead>
          <tr>
            <th>Load model</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {LOAD_MODEL_STATUS.map((m) => (
            <tr key={m.label}>
              <td>{m.label}</td>
              <td>
                <span className={m.active ? 'spn-badge' : 'spn-badge spn-badge-code'}>{m.note}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
