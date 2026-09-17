import { HDim, VDim } from '../../../shared/ui/ParamSweepCard'
import { values } from '../model/service'
import type { FoundationFamily, FoundationVariant } from '../model/types'

export default function FoundationSchematic({ family, variants }: { family: FoundationFamily; variants: FoundationVariant[] }) {
  if (family.foundationType === 'SHALLOW') return <div className="foundation-schematic-grid">
    <svg viewBox="0 0 280 190" width="280" height="190" role="img" aria-label="Shallow foundation plan"><text x="140" y="16" textAnchor="middle" className="foundation-schematic-label">PLAN</text><rect x="45" y="58" width="170" height="78" className="foundation-schematic-shape" /><HDim x1={45} x2={215} y={43} label="Ly" /><VDim y1={58} y2={136} x={230} label="Lx" labelX={249} /><text x="140" y="163" textAnchor="middle" className="foundation-schematic-label">Lx x Ly</text></svg>
    <svg viewBox="0 0 280 190" width="280" height="190" role="img" aria-label="Shallow foundation side elevation"><text x="140" y="16" textAnchor="middle" className="foundation-schematic-label">SIDE ELEVATION</text><rect x="45" y="78" width="170" height="58" className="foundation-schematic-shape" /><HDim x1={45} x2={215} y={61} label="Lx" /><VDim y1={78} y2={136} x={230} label="H" labelX={249} /></svg>
  </div>
  const generation = family.piledGeneration!
  const nx = Math.min(8, Math.max(1, values(generation.pileCountX)[0] ?? 1))
  const ny = Math.min(6, Math.max(1, values(generation.pileCountY)[0] ?? 1))
  const sample = variants[0]
  return <div className="foundation-schematic-grid">
    <svg viewBox="0 0 280 210" width="280" height="210" role="img" aria-label="Piled foundation plan"><text x="140" y="16" textAnchor="middle" className="foundation-schematic-label">PLAN</text><rect x="45" y="54" width="170" height="112" className="foundation-schematic-shape" /><HDim x1={45} x2={215} y={40} label="Lx" /><VDim y1={54} y2={166} x={230} label="Ly" labelX={249} />{Array.from({ length: nx * ny }, (_, index) => { const col = index % nx, row = Math.floor(index / nx); const x = 58 + col * (144 / Math.max(1, nx - 1)), y = 66 + row * (88 / Math.max(1, ny - 1)); return <circle key={`${col}-${row}`} cx={x} cy={y} r="4" className="foundation-schematic-pile" /> })}<text x="140" y="192" textAnchor="middle" className="foundation-schematic-label">D / ax / ay</text>{sample && <text x="50" y="202" className="foundation-schematic-note">Lx {sample.lengthX} m · Ly {sample.lengthY} m</text>}</svg>
    <svg viewBox="0 0 280 210" width="280" height="210" role="img" aria-label="Piled foundation side elevation"><text x="140" y="16" textAnchor="middle" className="foundation-schematic-label">SIDE ELEVATION</text><rect x="42" y="55" width="182" height="48" className="foundation-schematic-shape" /><text x="133" y="82" textAnchor="middle" className="foundation-schematic-note">FOUNDATION / PILE CAP</text><VDim y1={55} y2={103} x={240} label="H" labelX={260} />{Array.from({ length: Math.min(5, nx) }, (_, index) => { const x = 58 + index * (150 / Math.max(1, Math.min(5, nx) - 1)); return <g key={index}><line x1={x} y1="103" x2={x} y2="178" className="foundation-schematic-pile-line" /><text x={x} y="194" textAnchor="middle" className="foundation-schematic-note">PILE</text></g> })}</svg>
  </div>
}
