import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { getNodeDefinitions, type NodeCategory } from '../registry/nodeRegistry'

const CATEGORIES: NodeCategory[] = ['INPUT', 'MATH', 'MATERIALS', 'OUTPUT']
const FUTURE = ['FAMILY', 'BRIDGE', 'LOADS', 'ANALYSIS', 'OPTIMIZATION']

export default function NodeLibrary({ onAdd }: { onAdd: (type: string) => void }) {
  const [query, setQuery] = useState('')
  const definitions = useMemo(() => getNodeDefinitions().filter((item) => `${item.label} ${item.category} ${item.description}`.toLowerCase().includes(query.toLowerCase())), [query])
  return <div className="spn-graph-library">
    <label className="spn-graph-search"><Search size={14} /><input aria-label="Search nodes" placeholder="Search nodes" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
    {CATEGORIES.map((category) => <section className="spn-graph-library-group" key={category}><h3>{category}</h3>{definitions.filter((definition) => definition.category === category).map((definition) => <button key={definition.type} type="button" className="spn-graph-library-item" draggable onClick={() => onAdd(definition.type)} onDragStart={(event) => { event.dataTransfer.setData('application/spanova-node', definition.type); event.dataTransfer.effectAllowed = 'copy' }} title={definition.description}><span>{definition.label}</span><small>{definition.type}</small></button>)}</section>)}
    {FUTURE.map((category) => <section className="spn-graph-library-group disabled" key={category}><h3>{category}<small>Coming later</small></h3></section>)}
  </div>
}
