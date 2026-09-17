import { HDim, VDim } from '../../../shared/ui/ParamSweepCard'

export default function BearingSchematic() {
  return <div className="bearing-schematic-grid">
    <svg className="bearing-schematic-view" viewBox="0 0 280 190" width="280" height="190" role="img" aria-label="Bearing plan view"><text x="140" y="16" textAnchor="middle" fill="var(--text-secondary)" fontSize="11">PLAN</text><rect x="38" y="65" width="170" height="70" fill="var(--accent)" fillOpacity=".12" stroke="var(--accent)" strokeWidth="1.5" /><HDim x1={38} x2={208} y={49} label="Bearing Length — L" /><VDim y1={65} y2={135} x={224} label="B" labelX={241} /><text x="140" y="164" textAnchor="middle" fill="var(--text-secondary)" fontSize="10">Bearing Width — B</text></svg>
    <svg className="bearing-schematic-view" viewBox="0 0 280 190" width="280" height="190" role="img" aria-label="Bearing side elevation"><text x="140" y="16" textAnchor="middle" fill="var(--text-secondary)" fontSize="11">SIDE ELEVATION</text><rect x="38" y="84" width="170" height="50" fill="var(--accent)" fillOpacity=".12" stroke="var(--accent)" strokeWidth="1.5" /><HDim x1={38} x2={208} y={68} label="Bearing Length — L" /><VDim y1={84} y2={134} x={224} label="H" labelX={241} /><text x="140" y="164" textAnchor="middle" fill="var(--text-secondary)" fontSize="10">Bearing Height — H</text></svg>
  </div>
}
