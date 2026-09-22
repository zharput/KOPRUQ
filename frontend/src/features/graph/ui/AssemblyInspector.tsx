import type { BridgeAssembly } from '../domain/bridgeAssembly'
import type { GraphExecutionState, SpanovaNode } from '../domain/types'
import type { ProjectUnitPreferences } from '../domain/engineeringInputs'
import { formatDisplayValue, toDisplayValue } from '../domain/quantities'
import { useState } from 'react'
import type { AbutmentCandidate } from '../domain/abutmentCandidates'

export default function AssemblyInspector({ node, assembly, state, error, projectUnits, onNodeChange }: { node: SpanovaNode; assembly?: BridgeAssembly; state: GraphExecutionState; error?: string; projectUnits?: ProjectUnitPreferences; onNodeChange: (id: string, patch: Partial<SpanovaNode>) => void }) {
  const unit = projectUnits?.length ?? 'm'
  const [view, setView] = useState<'LONGITUDINAL' | 'A1_FRONT' | 'A2_FRONT'>('LONGITUDINAL')
  const total = assembly ? formatDisplayValue(assembly.totalLengthM, 'Length', projectUnits) : '—'
  return <div className="spn-graph-inspector spn-assembly-inspector">
    <h2 className="spn-graph-inspector-title">Assembly</h2>
    <section><h3>ASSEMBLY SUMMARY</h3><label>Name<input className="spn-input" value={node.name} onChange={event => onNodeChange(node.id, { name: event.target.value })} /></label><Row label="Total bridge length" value={total} /><Row label="Spans" value={String(assembly?.spans.length ?? 0)} /><Row label="Piers" value={String(assembly?.supports.filter(item => item.role === 'pier').length ?? 0)} /><Row label="Abutments" value={String(assembly?.supports.filter(item => item.role === 'abutment').length ?? 0)} /><Row label="Support axes" value={String(assembly?.supports.length ?? 0)} /><Row label="Alignment" value={assembly?.alignmentResolved ? 'RESOLVED' : 'NOT CONNECTED'} error={Boolean(assembly && !assembly.alignmentResolved)} /><Row label="Status" value={error ?? assembly?.status ?? state.toUpperCase()} error={Boolean(error || assembly?.status === 'INVALID')} /></section>
    {assembly?.messages.length ? <section><h3>VALIDATION</h3>{assembly.messages.map(message => <p className="spn-graph-inspector-error" key={message}>{message}</p>)}</section> : null}
    <section><h3>BRIDGE SCHEMATIC</h3><div className="spn-assembly-view-switcher"><button className="spn-input" onClick={() => setView('LONGITUDINAL')}>LONGITUDINAL</button><button className="spn-input" onClick={() => setView('A1_FRONT')}>A1 FRONT VIEW</button><button className="spn-input" onClick={() => setView('A2_FRONT')}>A2 FRONT VIEW</button></div><AssemblySchematic assembly={assembly} unit={unit} view={view} /></section>
    <section><h3>SUPPORT ARRANGEMENT</h3><div className="spn-assembly-table-wrap"><table className="spn-assembly-table"><thead><tr><th>Name</th><th>Type</th><th>Station</th><th>Family</th></tr></thead><tbody>{assembly?.supports.map(item => <tr key={item.id}><td>{item.name}</td><td>{item.role === 'pier' ? 'Pier' : 'Abutment'}</td><td>{formatDisplayValue(item.stationM, 'Length', projectUnits)}</td><td>{item.familyId ?? 'UNASSIGNED'}</td></tr>) ?? <tr><td colSpan={4}>No assembly resolved.</td></tr>}</tbody></table></div></section>
    <section><h3>SPAN ARRANGEMENT</h3><div className="spn-assembly-table-wrap"><table className="spn-assembly-table"><thead><tr><th>Name</th><th>Start</th><th>End</th><th>Length</th><th>Family</th></tr></thead><tbody>{assembly?.spans.map(item => <tr key={item.id}><td>{item.name}</td><td>{supportName(assembly, item.startSupportId)}</td><td>{supportName(assembly, item.endSupportId)}</td><td>{formatDisplayValue(item.lengthM, 'Length', projectUnits)}</td><td>{item.familyId ?? 'UNASSIGNED'}</td></tr>) ?? <tr><td colSpan={5}>No spans resolved.</td></tr>}</tbody></table></div></section>
  </div>
}
function Row({ label, value, error = false }: { label: string; value: string; error?: boolean }) { return <div className="spn-graph-inspector-row"><span>{label}</span><strong className={error ? 'state-error' : ''}>{value}</strong></div> }
function supportName(assembly: BridgeAssembly, id: string) { return assembly.supports.find(item => item.id === id)?.name ?? 'UNKNOWN' }
function AssemblySchematic({ assembly, unit, view }: { assembly?: BridgeAssembly; unit: string; view: 'LONGITUDINAL' | 'A1_FRONT' | 'A2_FRONT' }) {
  if (view !== 'LONGITUDINAL') return <AbutmentFrontView support={assembly?.supports.find(item => item.name === (view === 'A1_FRONT' ? 'A1' : 'A2'))} />
  if (!assembly?.spans.length) return <p className="spn-graph-inspector-muted">Connect a valid span arrangement and Superstructure candidate.</p>
  if (!Number.isFinite(assembly.totalLengthM) || assembly.totalLengthM <= 0) return <p className="spn-graph-inspector-error">Bridge length is invalid; schematic is unavailable.</p>
  const width = 520, left = 24, right = 496, usable = right - left, scale = usable / assembly.totalLengthM
  const positions = assembly.supports.map(item => left + item.stationM * scale)
  return <svg className="spn-assembly-schematic" viewBox={`0 0 ${width} 180`} role="img" aria-label="Bridge longitudinal schematic"><line x1={left} y1="44" x2={right} y2="44" className="spn-assembly-deck" />{assembly.supports.map((support, index) => <g key={support.id}>{support.role === 'abutment' && support.abutment ? <LongitudinalAbutment x={positions[index]} support={support} /> : <line x1={positions[index]} y1="44" x2={positions[index]} y2="82" className={support.role === 'pier' ? 'spn-assembly-pier' : 'spn-assembly-abutment'} />}<text x={positions[index]} y="145" textAnchor="middle">{support.name}</text></g>)}{assembly.spans.map((span, index) => { const x = (positions[index] + positions[index + 1]) / 2; return <g key={span.id}><text x={x} y="26" textAnchor="middle">{span.name}</text><text x={x} y="16" textAnchor="middle" className="spn-assembly-length">{toDisplayValue(span.lengthM, 'Length', { length: unit }).toFixed(2)} {unit}</text></g> })}</svg>
}

function LongitudinalAbutment({ x, support }: { x: number; support: BridgeAssembly['supports'][number] }) {
  const candidate = support.abutment
  const g = candidate?.geometry
  const forward = support.direction === 'FORWARD' ? 1 : -1
  const foundation = Math.max(18, Number(g?.foundW ?? 4) * 4), body = Math.max(12, Number(g?.Front_w ?? 1) * 8), wall = Math.max(8, Number(g?.Back_wall_w ?? .5) * 8)
  return <g className="spn-assembly-abutment-geometry"><rect x={x - (forward > 0 ? foundation : 0)} y="82" width={foundation} height="14" className="spn-assembly-foundation"/><rect x={x - (forward > 0 ? wall : wall - body)} y="48" width={wall} height="34" className="spn-assembly-abutment"/><rect x={x - (forward > 0 ? 0 : body)} y="70" width={body} height="12" className="spn-assembly-abutment"/><rect x={x - 3} y="39" width="6" height="9" className="spn-assembly-bearing"/><text x={x} y="170" textAnchor="middle" className="spn-assembly-length">{g ? `found_w ${g.foundW} · total_h ${g.totalH}` : 'Abutment not connected'}</text></g>
}

function AbutmentFrontView({ support }: { support?: BridgeAssembly['supports'][number] }) {
  const candidate = support?.abutment as AbutmentCandidate | undefined
  const g = candidate?.geometry, s = candidate?.seismic, width = Number(g?.abutmentBodyD ?? 14), foundation = Number(g?.found_d ?? width), blockColor = s?.status === 'ERROR' ? '#EF4444' : s?.status === 'WARNING' ? '#F59E0B' : '#e4b65c'
  if (!support || !candidate) return <p className="spn-graph-inspector-muted">Selected abutment is not connected; support symbol remains available in longitudinal view.</p>
  return <svg className="spn-assembly-schematic" viewBox="0 0 520 240" role="img" aria-label={`${support.name} abutment front view`}><rect x="70" y="45" width="380" height="24" className="spn-assembly-deck"/><rect x="70" y="69" width="380" height="75" className="spn-assembly-abutment"/><rect x={260 - foundation * 10} y="144" width={foundation * 20} height="32" className="spn-assembly-foundation"/><rect x="90" y="82" width="18" height="42" fill={blockColor}/><rect x="412" y="82" width="18" height="42" fill={blockColor}/><text x="260" y="205" textAnchor="middle" className="spn-assembly-length">{support.name} · body {width} m · found_d {foundation} m · sei_w {s?.seiW ?? '—'} m</text></svg>
}
