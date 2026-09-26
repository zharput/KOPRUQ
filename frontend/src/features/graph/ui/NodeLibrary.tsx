import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { getNodeDefinitions } from '../registry/nodeRegistry'
import { getNodeGroupTheme, getNodePresentationCategory, getNodeTheme, type NodeCategory } from '../domain/nodeVisualThemes'
import { NodeIcon } from './NodeIcon'

type LibraryGroup = { key: string; label: string; categories: NodeCategory[]; headerCategories: NodeCategory[] }
const LIBRARY_GROUPS: LibraryGroup[] = [
  { key: 'INPUT', label: 'INPUT', categories: ['INPUT'], headerCategories: ['INPUT'] },
  { key: 'OUTPUT', label: 'OUTPUT', categories: ['OUTPUT'], headerCategories: ['OUTPUT'] },
  { key: 'MATH', label: 'MATH', categories: ['MATH'], headerCategories: ['MATH'] },
  { key: 'MATERIALS', label: 'MATERIALS', categories: ['MATERIALS'], headerCategories: ['MATERIALS'] },
  { key: 'STRUCTURAL', label: 'STRUCTURAL', categories: ['GIRDER', 'BEARING', 'CAP', 'PIER', 'FOUNDATION', 'ABUTMENT'], headerCategories: ['GIRDER', 'BEARING', 'CAP', 'PIER', 'FOUNDATION', 'ABUTMENT'] },
  { key: 'SUPERSTRUCTURE', label: 'SUPERSTRUCTURE FAMILY', categories: ['SUPERSTRUCTURE'], headerCategories: ['SUPERSTRUCTURE'] },
  { key: 'BRIDGE', label: 'BRIDGE FAMILY', categories: ['BRIDGE'], headerCategories: ['BRIDGE'] },
]

export default function NodeLibrary({ onAdd }: { onAdd: (type: string) => void }) {
  const [query, setQuery] = useState('')
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const definitions = useMemo(() => getNodeDefinitions().filter((item) => `${item.label} ${item.category} ${item.description}`.toLowerCase().includes(query.toLowerCase())), [query])
  const collapseAll = () => setCollapsed(Object.fromEntries(LIBRARY_GROUPS.map((group) => [group.key, true])))
  const expandAll = () => setCollapsed({})
  return <div className="spn-graph-library">
    <label className="spn-graph-search"><Search size={14} /><input aria-label="Search nodes" placeholder="Search nodes" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
    <div className="spn-graph-library-group-actions"><button type="button" onClick={collapseAll}>Collapse all groups</button><button type="button" onClick={expandAll}>Expand all groups</button></div>
    <div className="spn-graph-library-scroll">
    {LIBRARY_GROUPS.map((group) => {const items=definitions.filter(definition=>group.categories.includes(getNodePresentationCategory(definition.category, definition.type))); const isCollapsed = collapsed[group.key] ?? false; const groupId = group.key.toLowerCase().replace('superstructure', 'superstructure-family').replace('bridge', 'bridge-family'); const theme = getNodeGroupTheme(groupId); return <section className={`spn-graph-library-group library-family-${groupId} ${getNodeTheme(group.headerCategories[0]).className}${group.key === 'STRUCTURAL' ? ' category-structural-family' : ''}`} key={group.key}><button type="button" data-node-group={groupId} className="spn-graph-library-category-heading" style={{ '--node-group-color': theme.dark, '--node-group-text': theme.text, background: theme.dark, backgroundColor: theme.dark, color: theme.text } as React.CSSProperties} aria-expanded={!isCollapsed} onClick={() => setCollapsed((current) => ({ ...current, [group.key]: !isCollapsed }))}><span>{group.label}</span><span className="spn-graph-library-collapse-icon" aria-hidden="true">{isCollapsed ? '+' : '−'}</span></button><h4 className="spn-graph-library-compat-heading sr-only">{group.label}</h4>{!isCollapsed && items.map(definition => <LibraryItem key={definition.type} definition={definition} onAdd={onAdd}/>)}</section>})}
    </div>
  </div>
}
function LibraryItem({definition,onAdd}:{definition:ReturnType<typeof getNodeDefinitions>[number];onAdd:(type:string)=>void}){return <button type="button" className="spn-graph-library-item" draggable onClick={()=>onAdd(definition.type)} onDragStart={event=>{event.dataTransfer.setData('application/kopruq-node',definition.type);event.dataTransfer.effectAllowed='copy'}} title={definition.description}><NodeIcon type={definition.type} size={30} /><span>{definition.label}</span></button>}



