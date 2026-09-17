import { HDim, VDim } from '../../../shared/ui/ParamSweepCard'

export default function BearingSchematic() {
  return <div className="spn-shape-card-diagram"><svg viewBox="0 0 460 230" width="460" height="230" role="img" aria-label="Bearing plan and side elevation schematic" style={{ maxWidth: '100%', height: 'auto' }}>
    <text x="108" y="18" textAnchor="middle" fill="var(--text-secondary)" fontSize="11">PLAN</text><rect x="48" y="48" width="120" height="52" fill="var(--accent)" fillOpacity=".12" stroke="var(--accent)" strokeWidth="1.5" /><HDim x1={48} x2={168} y={36} label="Bearing Length — L" /><VDim y1={48} y2={100} x={185} label="Bearing Width — B" labelX={204} />
    <text x="310" y="132" textAnchor="middle" fill="var(--text-secondary)" fontSize="11">SIDE ELEVATION</text><rect x="250" y="160" width="120" height="38" fill="var(--accent)" fillOpacity=".12" stroke="var(--accent)" strokeWidth="1.5" /><HDim x1={250} x2={370} y={150} label="Bearing Length — L" /><VDim y1={160} y2={198} x={386} label="Bearing Height — H" labelX={408} />
  </svg></div>
}
