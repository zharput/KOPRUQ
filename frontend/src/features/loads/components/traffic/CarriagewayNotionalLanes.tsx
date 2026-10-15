import type { CrossSectionValues } from '../../../superstructure-families'
import { HDim } from '../../../../shared/ui/ParamSweepCard'
import type { NotionalLaneResult } from '../../api/trafficLoadsService'
import type { ProjectUnits } from '../../../graph/domain/quantities'
import { formatLoad, formatLoadValue, loadUnit } from '../../model/loadUnits'

/**
 * Traffic > Carriageway & Notional Lanes - deck width and walkways are
 * read live from Superstructure Families' cross section
 * (`crossSectionValues`, already lifted to `App.tsx`), never re-entered
 * here (plan principle #14/#15 - avoid duplicate geometry input).
 * Notional lane count/width comes from the backend
 * (`NotionalLaneGenerator`, EN 1991-2 Table 4.1's engineer-confirmed
 * 3.00 m/lane rule) via the single `/api/traffic-loads/resolve` call
 * `TrafficLoadsPanel` makes - never computed in this component.
 */
export default function CarriagewayNotionalLanes({
  crossSectionValues,
  carriagewayM,
  notionalLanes,
  isLoading,
  projectUnits,
}: {
  crossSectionValues: CrossSectionValues
  carriagewayM: number
  notionalLanes: NotionalLaneResult | undefined
  isLoading: boolean
  projectUnits?: ProjectUnits
}) {
  const lengthLabel = loadUnit('length', projectUnits).label
  const len = (m: number) => formatLoadValue(m, 'length', projectUnits)
  return (
    <div className="spn-card">
      <h2 className="spn-card-title">Carriageway & Notional Lanes</h2>
      <p className="spn-card-subtitle">
        Deck width and walkways are read live from Superstructure Families &gt; Precast - no duplicate entry.
        Notional lanes follow EN 1991-2 Table 4.1's confirmed 3.00 m/lane rule (base carriageway width, floor
        division).
      </p>

      <div className="spn-field-grid">
        <div className="spn-field">
          <span>Deck (platform) width ({lengthLabel})</span>
          <input className="spn-input spn-input-passive" value={len(crossSectionValues.platformWidthM)} readOnly style={{ marginTop: 4 }} />
        </div>
        <div className="spn-field">
          <span>Left walkway ({lengthLabel})</span>
          <input className="spn-input spn-input-passive" value={len(crossSectionValues.leftWalkwayM)} readOnly style={{ marginTop: 4 }} />
        </div>
        <div className="spn-field">
          <span>Right walkway ({lengthLabel})</span>
          <input className="spn-input spn-input-passive" value={len(crossSectionValues.rightWalkwayM)} readOnly style={{ marginTop: 4 }} />
        </div>
        <div className="spn-field">
          <span>Carriageway width - computed ({lengthLabel})</span>
          <input className="spn-input spn-input-passive" value={len(carriagewayM)} readOnly style={{ marginTop: 4 }} />
        </div>
      </div>

      <CarriagewayDiagram carriagewayM={carriagewayM} notionalLanes={notionalLanes} projectUnits={projectUnits} />

      <h3 style={{ marginTop: 18, marginBottom: 8, fontSize: 13.5 }}>Notional lanes</h3>
      {isLoading && <p className="spn-card-subtitle">Resolving...</p>}
      {!isLoading && notionalLanes && (
        <table className="spn-table">
          <thead>
            <tr>
              <th>Lane</th>
              <th>Width ({lengthLabel})</th>
            </tr>
          </thead>
          <tbody>
            {notionalLanes.lanes.map((lane) => (
              <tr key={lane.number}>
                <td>Lane {lane.number}</td>
                <td>{len(lane.widthM)}</td>
              </tr>
            ))}
            <tr>
              <td>Remaining area</td>
              <td>{len(notionalLanes.remainingAreaWidthM)}</td>
            </tr>
          </tbody>
        </table>
      )}
    </div>
  )
}

function CarriagewayDiagram({
  carriagewayM,
  notionalLanes,
  projectUnits,
}: {
  carriagewayM: number
  notionalLanes: NotionalLaneResult | undefined
  projectUnits?: ProjectUnits
}) {
  const x0 = 40
  const x1 = 600
  const laneTopY = 60
  const laneBottomY = 100
  const pixelsPerMeter = carriagewayM > 0 ? (x1 - x0) / carriagewayM : 0

  const { boxes: laneBoxes, cursorX } = (notionalLanes?.lanes ?? []).reduce<{
    boxes: { x: number; width: number; label: string }[]
    cursorX: number
  }>(
    (acc, lane) => {
      const widthPx = lane.widthM * pixelsPerMeter
      acc.boxes.push({ x: acc.cursorX, width: widthPx, label: `Lane ${lane.number}: ${formatLoad(lane.widthM, 'length', projectUnits)}` })
      return { boxes: acc.boxes, cursorX: acc.cursorX + widthPx }
    },
    { boxes: [], cursorX: x0 },
  )
  const remainingWidthPx = Math.max(0, x1 - cursorX)

  return (
    <svg viewBox="0 0 640 130" width="100%" style={{ maxWidth: 640, marginTop: 6 }}>
      <HDim x1={x0} x2={x1} y={16} label={`Carriageway: ${formatLoad(carriagewayM, 'length', projectUnits)}`} />
      {laneBoxes.map((box, i) => (
        <g key={i}>
          <rect
            x={box.x}
            y={laneTopY}
            width={box.width}
            height={laneBottomY - laneTopY}
            fill="var(--accent)"
            fillOpacity={i % 2 === 0 ? 0.22 : 0.12}
            stroke="var(--accent)"
            strokeWidth={1}
          />
          <text x={box.x + box.width / 2} y={(laneTopY + laneBottomY) / 2 + 4} textAnchor="middle" fontSize={11} fill="var(--text-primary)">
            {box.label}
          </text>
        </g>
      ))}
      {remainingWidthPx > 1 && (
        <rect
          x={cursorX}
          y={laneTopY}
          width={remainingWidthPx}
          height={laneBottomY - laneTopY}
          fill="var(--text-secondary)"
          fillOpacity={0.12}
          stroke="var(--text-secondary)"
          strokeWidth={1}
          strokeDasharray="4 3"
        />
      )}
    </svg>
  )
}
