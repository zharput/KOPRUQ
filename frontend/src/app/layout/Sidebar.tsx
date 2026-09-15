import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Anchor,
  BarChart2,
  Boxes,
  Box,
  Building2,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  ClipboardList,
  Component,
  Cpu,
  DollarSign,
  FileBarChart,
  FolderOpen,
  GitBranch,
  HelpCircle,
  Home,
  Layers,
  LayoutDashboard,
  ListChecks,
  ListOrdered,
  Map,
  Mountain,
  MapPin,
  Network,
  Package,
  PenTool,
  PlugZap,
  Route,
  Ruler,
  Satellite,
  Settings,
  ShieldAlert,
  Table2,
  Target,
  TowerControl,
  Warehouse,
  Waves,
  Zap,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { SectionId } from '../navigation/sections'
import { SIDEBAR_BOTTOM_ITEMS, SIDEBAR_FOOTER_SECTIONS, SIDEBAR_GROUPS, SIDEBAR_TOP_ITEMS } from '../navigation/sections'

const ICONS: Record<SectionId, LucideIcon> = {
  home: Home,
  'project-dashboard': LayoutDashboard,
  'project-information': FolderOpen,
  materials: Package,
  loads: ClipboardList,
  'load-combinations': ListChecks,
  'cost-database': DollarSign,
  'corridor-dashboard': Map,
  alignment: Route,
  'terrain-dtm': Mountain,
  'gis-satellite': Satellite,
  geotechnical: Layers,
  'hydrology-hydraulic': Waves,
  constraints: ShieldAlert,
  'superstructure-families': Boxes,
  'girder-library': Component,
  'preferred-span-families': Ruler,
  'pier-families': TowerControl,
  'abutment-families': Anchor,
  'foundation-families': Building2,
  'bearing-families': Anchor,
  'expansion-joints': PlugZap,
  'standardization-rules': ListOrdered,
  'bridge-inventory': Warehouse,
  'bridge-site': MapPin,
  'layout-generator': Route,
  'layout-alternatives': Table2,
  'selected-layout': CheckSquare,
  'bridge-superstructure': Boxes,
  'bridge-piers': TowerControl,
  'bridge-abutments': Anchor,
  'bridge-bearings': Anchor,
  'bridge-foundations': Building2,
  'bridge-alternatives': PenTool,
  'model-reduction': Cpu,
  'spanova-fast-solver': Zap,
  'analysis-queue': ListChecks,
  results: BarChart2,
  'opensees-verification': CheckCircle2,
  'midas-nx-final-verification': CheckCircle2,
  'layout-optimization': GitBranch,
  'structural-optimization': Target,
  'bridge-optimization': Target,
  'corridor-optimization': Network,
  standardization: ListOrdered,
  'pareto-explorer': BarChart2,
  '3d-visualization': Box,
  reports: FileBarChart,
  settings: Settings,
  help: HelpCircle,
}

/**
 * Reads the active section from the URL and navigates via real
 * `<Link>`s (architecture migration Milestone 2, 2026-09-12) - no
 * longer takes `active`/`onSelect` props, since the route itself is now
 * the single source of truth for "which section is active" (shared with
 * TopBar the same way).
 *
 * <p>Uses `useLocation()`, not `useParams()` (2026-09-12 fix - a real
 * bug the engineer caught: "hangi menüde olduğumuz belli olmuyor"/
 * always showing Home as active). `useParams()` only resolves inside
 * the React subtree actually rendered *by* the matched `:section`
 * route's own `element` - `Sidebar` is a sibling of `<Routes>` in
 * `App.tsx`, not a descendant of it, so it could never see `section`
 * and silently fell back to `'home'` every time. `useLocation()` reads
 * the current URL from anywhere inside the router, regardless of tree
 * position, so parsing the section straight out of `pathname` works
 * correctly for every route.
 */
export default function Sidebar() {
  const location = useLocation()
  const active = (location.pathname.slice(1) || 'home') as SectionId
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set())

  function toggleGroup(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <aside className="spn-sidebar">
      <div className="spn-sidebar-logo">
        <div className="spn-sidebar-logo-crop">
          <img src="/spanova-logo.png" alt="SPANOVA" />
        </div>
      </div>

      <nav className="spn-sidebar-nav">
        {SIDEBAR_TOP_ITEMS.map((sectionMeta) => (
          <NavItem key={sectionMeta.id} id={sectionMeta.id} label={sectionMeta.label} active={active === sectionMeta.id} />
        ))}

        {SIDEBAR_GROUPS.map((group) => {
          const isCollapsed = collapsed.has(group.id)
          return (
            <div key={group.id} className="spn-nav-group">
              <button
                type="button"
                className="spn-nav-group-header"
                onClick={() => toggleGroup(group.id)}
                aria-expanded={!isCollapsed}
              >
                <span>{group.label}</span>
                <ChevronDown size={14} strokeWidth={2} className={isCollapsed ? 'spn-chevron-collapsed' : undefined} />
              </button>
              {!isCollapsed && (
                <div className="spn-nav-group-items">
                  {group.sections.map((sectionMeta) => (
                    <NavItem key={sectionMeta.id} id={sectionMeta.id} label={sectionMeta.label} active={active === sectionMeta.id} />
                  ))}
                </div>
              )}
            </div>
          )
        })}

        <div className="spn-nav-group-items spn-nav-standalone">
          {SIDEBAR_BOTTOM_ITEMS.map((sectionMeta) => (
            <NavItem key={sectionMeta.id} id={sectionMeta.id} label={sectionMeta.label} active={active === sectionMeta.id} />
          ))}
        </div>
      </nav>

      <div className="spn-sidebar-footer">
        {SIDEBAR_FOOTER_SECTIONS.map((sectionMeta) => (
          <NavItem key={sectionMeta.id} id={sectionMeta.id} label={sectionMeta.label} active={active === sectionMeta.id} />
        ))}
        <p className="spn-sidebar-tagline">
          Better bridges
          <br />
          A more sustainable tomorrow
        </p>
      </div>
    </aside>
  )
}

function NavItem({ id, label, active }: { id: SectionId; label: string; active: boolean }) {
  const Icon = ICONS[id]
  return (
    <Link to={`/${id}`} className={`spn-nav-item${active ? ' spn-nav-item-active' : ''}`}>
      <Icon size={17} strokeWidth={1.75} />
      <span>{label}</span>
    </Link>
  )
}
