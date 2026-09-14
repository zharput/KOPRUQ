import type { Lm1Parameters, NotionalLaneResult, TrafficValidationResult } from '../../api/trafficLoadsService'

/**
 * Traffic > Preview & Validation - a read-only summary of the resolved
 * Traffic Loads state. Deliberately has no "Generate ULS Combinations"
 * or similar action (non-negotiable #10) - EN 1990 load combinations
 * are a separate, future Combination Engine module, out of scope here.
 */
export default function TrafficPreviewValidation({
  carriagewayM,
  notionalLanes,
  lm1,
  validation,
}: {
  carriagewayM: number
  notionalLanes: NotionalLaneResult | undefined
  lm1: Lm1Parameters
  validation: TrafficValidationResult | undefined
}) {
  const allFactors = [...lm1.tandemSystem, ...lm1.udl, lm1.remainingAreaUdl]
  const overridesCount = allFactors.reduce(
    (count, f) =>
      count + (f.characteristicValue.provenance === 'PROJECT_OVERRIDE' ? 1 : 0) + (f.adjustmentFactor.provenance === 'PROJECT_OVERRIDE' ? 1 : 0),
    0,
  )

  return (
    <div className="spn-card">
      <h2 className="spn-card-title">Preview & Validation</h2>
      <p className="spn-card-subtitle">
        Summary only - no combination or export action here. EN 1990 load combinations are a separate module.
      </p>

      <table className="spn-table">
        <tbody>
          <tr>
            <td>Standard</td>
            <td>EN 1991-2, EN Base (no National Annex adjustment)</td>
          </tr>
          <tr>
            <td>Carriageway width</td>
            <td>{carriagewayM.toFixed(2)} m</td>
          </tr>
          <tr>
            <td>Notional lanes</td>
            <td>{notionalLanes ? `${notionalLanes.lanes.length} lane(s), remaining area ${notionalLanes.remainingAreaWidthM.toFixed(2)} m` : '—'}</td>
          </tr>
          <tr>
            <td>Active load models</td>
            <td>LM1</td>
          </tr>
          <tr>
            <td>LM2</td>
            <td>
              <span className="spn-badge spn-badge-code">NOT IMPLEMENTED</span>
            </td>
          </tr>
          <tr>
            <td>Load groups</td>
            <td>
              <span className="spn-badge spn-badge-code">NOT_DEFINED</span>
            </td>
          </tr>
          <tr>
            <td>Project overrides (LM1)</td>
            <td>{overridesCount}</td>
          </tr>
        </tbody>
      </table>

      {validation && (
        <>
          <h3 style={{ margin: '18px 0 8px', fontSize: 13.5 }}>Validation</h3>
          <table className="spn-table">
            <tbody>
              <tr>
                <td>Carriageway defined</td>
                <td>{validation.carriagewayDefined ? 'Yes' : 'No'}</td>
              </tr>
              <tr>
                <td>Notional lanes generated</td>
                <td>{validation.notionalLanesGenerated ? 'Yes' : 'No'}</td>
              </tr>
              <tr>
                <td>LM1 resolved</td>
                <td>{validation.lm1Resolved ? 'Yes' : 'No'}</td>
              </tr>
            </tbody>
          </table>
          {validation.warnings.length > 0 && (
            <ul style={{ marginTop: 10, paddingLeft: 18, color: '#ff9f0a', fontSize: 12.5 }}>
              {validation.warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
