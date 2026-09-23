import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { getNodeDefinitions, type NodeCategory } from '../registry/nodeRegistry'
import { getNodeCategoryColor, getNodePresentationCategory, getNodeTheme } from '../domain/nodeVisualThemes'
import { NodeIcon } from './NodeIcon'

const CATEGORIES: NodeCategory[] = ['INPUT', 'OUTPUT', 'MATH', 'MATERIALS', 'GIRDER', 'BEARING', 'CAP', 'PIER', 'FOUNDATION', 'ABUTMENT', 'SUPERSTRUCTURE', 'BRIDGE']
const categoryLabel = (category: NodeCategory) => category === 'CAP' ? 'CAP BEAM' : category

export default function NodeLibrary({ onAdd }: { onAdd: (type: string) => void }) {
  const [query, setQuery] = useState('')
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const definitions = useMemo(() => getNodeDefinitions().filter((item) => `${item.label} ${item.category} ${item.description}`.toLowerCase().includes(query.toLowerCase())), [query])
  const collapseAll = () => setCollapsed(Object.fromEntries(CATEGORIES.map((category) => [category, true])))
  const expandAll = () => setCollapsed({})
  return <div className="spn-graph-library">
    <label className="spn-graph-search"><Search size={14} /><input aria-label="Search nodes" placeholder="Search nodes" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
    <div className="spn-graph-library-group-actions"><button type="button" onClick={collapseAll}>Collapse all groups</button><button type="button" onClick={expandAll}>Expand all groups</button></div>
    <div className="spn-graph-library-scroll">
    {CATEGORIES.map((category) => {const items=definitions.filter(definition=>getNodePresentationCategory(definition.category, definition.type)===category); const isCollapsed = collapsed[category] ?? false; return <section className={`spn-graph-library-group ${getNodeTheme(category).className}${['PIER','ABUTMENT','CAP','FOUNDATION','BEARING','GIRDER','SUPERSTRUCTURE'].includes(category) ? ' category-structural-family' : ''}`} key={category}><button type="button" className="spn-graph-library-category-heading" style={{ backgroundColor: getNodeCategoryColor(category), color: '#000000' }} aria-expanded={!isCollapsed} onClick={() => setCollapsed((current) => ({ ...current, [category]: !isCollapsed }))}><span>{categoryLabel(category)}</span><span className="spn-graph-library-collapse-icon" aria-hidden="true">{isCollapsed ? '+' : '−'}</span></button><h4 className="spn-graph-library-compat-heading sr-only">{category[0] + category.slice(1).toLowerCase()}</h4>{!isCollapsed && items.map(definition => <LibraryItem key={definition.type} definition={definition} onAdd={onAdd}/>)}</section>})}
    </div>
  </div>
}
function LibraryItem({definition,onAdd}:{definition:ReturnType<typeof getNodeDefinitions>[number];onAdd:(type:string)=>void}){return <button type="button" className="spn-graph-library-item" draggable onClick={()=>onAdd(definition.type)} onDragStart={event=>{event.dataTransfer.setData('application/spanova-node',definition.type);event.dataTransfer.effectAllowed='copy'}} title={definition.description}><NodeIcon type={definition.type} size={14} /><span>{definition.label}</span></button>}


