import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { getNodeDefinitions, type NodeCategory } from '../registry/nodeRegistry'
import { getNodeCategoryLabel, getNodeTheme } from '../domain/nodeVisualThemes'

const CATEGORIES: NodeCategory[] = ['INPUT', 'MATH', 'MATERIALS', 'STRUCTURAL_FAMILY', 'OUTPUT']
const FUTURE = ['BRIDGE', 'LOADS', 'ANALYSIS', 'OPTIMIZATION']

export default function NodeLibrary({ onAdd }: { onAdd: (type: string) => void }) {
  const [query, setQuery] = useState('')
  const definitions = useMemo(() => getNodeDefinitions().filter((item) => `${item.label} ${item.category} ${item.description}`.toLowerCase().includes(query.toLowerCase())), [query])
  return <div className="spn-graph-library">
    <label className="spn-graph-search"><Search size={14} /><input aria-label="Search nodes" placeholder="Search nodes" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
    {CATEGORIES.map((category) => {const items=definitions.filter(definition=>definition.category===category);return <section className={`spn-graph-library-group ${getNodeTheme(category).className}`} key={category}><h3>{getNodeCategoryLabel(category)}</h3>{category==='STRUCTURAL_FAMILY'?<><LibrarySubgroup title="Pier" items={items.filter(item=>item.type.startsWith('substructure.pier.')&&!item.type.startsWith('substructure.pier-cap.'))} onAdd={onAdd}/><LibrarySubgroup title="Pier Cap" items={items.filter(item=>item.type.startsWith('substructure.pier-cap.'))} onAdd={onAdd}/><LibrarySubgroup title="Foundation" items={items.filter(item=>item.type.startsWith('substructure.foundation.'))} onAdd={onAdd}/><LibrarySubgroup title="Bearing" items={items.filter(item=>item.type.startsWith('substructure.bearing.'))} onAdd={onAdd}/><LibrarySubgroup title="Girder" items={items.filter(item=>item.type.startsWith('structural.girder.'))} onAdd={onAdd}/></>:items.map((definition) => <LibraryItem key={definition.type} definition={definition} onAdd={onAdd}/>)}</section>})}
    {FUTURE.map((category) => <section className="spn-graph-library-group disabled" key={category}><h3>{category}<small>Coming later</small></h3></section>)}
  </div>
}
function LibrarySubgroup({title,items,onAdd}:{title:string;items:ReturnType<typeof getNodeDefinitions>;onAdd:(type:string)=>void}){return items.length?<div className="spn-graph-library-subgroup"><h4>{title}</h4>{items.map(definition=><LibraryItem key={definition.type} definition={definition} onAdd={onAdd}/>)}</div>:null}
function LibraryItem({definition,onAdd}:{definition:ReturnType<typeof getNodeDefinitions>[number];onAdd:(type:string)=>void}){return <button type="button" className="spn-graph-library-item" draggable onClick={()=>onAdd(definition.type)} onDragStart={event=>{event.dataTransfer.setData('application/spanova-node',definition.type);event.dataTransfer.effectAllowed='copy'}} title={definition.description}><span>{definition.label}</span><small>{definition.type}</small></button>}
