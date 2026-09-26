import type { BridgeAssembly } from '../domain/bridgeAssembly'
import type { GraphExecutionState, KopruqNode } from '../domain/types'
import type { ProjectUnitPreferences } from '../domain/engineeringInputs'
import { NodeIcon } from './NodeIcon'
import { formatDisplayValue } from '../domain/quantities'

export default function AssemblyInspector({ node, assembly, state, error, projectUnits, onNodeChange }: { node: KopruqNode; assembly?: BridgeAssembly; state: GraphExecutionState; error?: string; projectUnits?: ProjectUnitPreferences; onNodeChange: (id: string, patch: Partial<KopruqNode>) => void }) {
  const total = assembly ? formatDisplayValue(assembly.totalLengthM, 'Length', projectUnits) : '—'
  return <div className="spn-graph-inspector spn-assembly-inspector">
    <h2 className="spn-graph-inspector-title">Assembly</h2>
    <section className="spn-engineering-general"><h3>GENERAL</h3><label>Name<input className="spn-input" value={node.name} onChange={event => onNodeChange(node.id, { name: event.target.value })} /></label><Row label="Type" value="Assembly" /></section>
    <section><h3>TYPE / SCHEMATIC</h3><div className="spn-assembly-schematic-stage"><div className="spn-engineering-schematic-logo spn-assembly-logo"><NodeIcon type={node.type} size={128} /></div><div className="spn-schematic-card-toolbar"><span>Preview</span><button type="button" aria-label="Open assembly preview" title="Preview">↗</button></div></div></section>
    <section><h3>PARAMETERS</h3><Row label="Total bridge length" value={total} /><Row label="Spans" value={String(assembly?.spans.length ?? 0)} /><Row label="Piers" value={String(assembly?.supports.filter(item => item.role === 'pier').length ?? 0)} /><Row label="Abutments" value={String(assembly?.supports.filter(item => item.role === 'abutment').length ?? 0)} /><Row label="Support axes" value={String(assembly?.supports.length ?? 0)} /><Row label="Alignment" value={assembly?.alignmentResolved ? 'RESOLVED' : 'NOT CONNECTED'} error={Boolean(assembly && !assembly.alignmentResolved)} /><Row label="Status" value={error ?? assembly?.status ?? state.toUpperCase()} error={Boolean(error || assembly?.status === 'INVALID')} /></section>
    {assembly?.messages.length ? <section><h3>VALIDATION</h3>{assembly.messages.map(message => <p className="spn-graph-inspector-error" key={message}>{message}</p>)}</section> : null}
    <section><h3>SUPPORT ARRANGEMENT</h3><div className="spn-assembly-table-wrap"><table className="spn-assembly-table"><thead><tr><th>Name</th><th>Type</th><th>Station</th><th>Family</th></tr></thead><tbody>{assembly?.supports.map(item => <tr key={item.id}><td>{item.name}</td><td>{item.role === 'pier' ? 'Pier' : 'Abutment'}</td><td>{formatDisplayValue(item.stationM, 'Length', projectUnits)}</td><td>{item.familyId ?? 'UNASSIGNED'}</td></tr>) ?? <tr><td colSpan={4}>No assembly resolved.</td></tr>}</tbody></table></div></section>
    <section><h3>SPAN ARRANGEMENT</h3><div className="spn-assembly-table-wrap"><table className="spn-assembly-table"><thead><tr><th>Name</th><th>Start</th><th>End</th><th>Length</th><th>Family</th></tr></thead><tbody>{assembly?.spans.map(item => <tr key={item.id}><td>{item.name}</td><td>{supportName(assembly, item.startSupportId)}</td><td>{supportName(assembly, item.endSupportId)}</td><td>{formatDisplayValue(item.lengthM, 'Length', projectUnits)}</td><td>{item.familyId ?? 'UNASSIGNED'}</td></tr>) ?? <tr><td colSpan={5}>No spans resolved.</td></tr>}</tbody></table></div></section>
  </div>
}
function Row({ label, value, error = false }: { label: string; value: string; error?: boolean }) { return <div className="spn-graph-inspector-row"><span>{label}</span><strong className={error ? 'state-error' : ''}>{value}</strong></div> }
function supportName(assembly: BridgeAssembly, id: string) { return assembly.supports.find(item => item.id === id)?.name ?? 'UNKNOWN' }
