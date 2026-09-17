import { useState } from 'react'

export type GraphLogEntry = { level: 'INFO' | 'ERROR'; message: string }
export default function GraphLog({ entries }: { entries: GraphLogEntry[] }) {
  const [open, setOpen] = useState(false)
  return <section className={`spn-graph-log${open ? ' open' : ''}`}><button type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)}><span>GRAPH LOG</span><small>{entries.length} entries</small><span>{open ? '−' : '+'}</span></button>{open && <div className="spn-graph-log-body" role="log">{entries.map((entry, index) => <div key={`${index}-${entry.message}`} className={entry.level === 'ERROR' ? 'error' : ''}><strong>{entry.level}</strong> {entry.message}</div>)}</div>}</section>
}
