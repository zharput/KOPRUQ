import { Link, useLocation } from 'react-router-dom'
import { Bell, Search, UserCircle } from 'lucide-react'
import type { SectionId } from '../navigation/sections'
import { SIDEBAR_GROUPS, WORKING_SECTIONS } from '../navigation/sections'

/**
 * P10 shell, simplified 2026-09-12 per the engineer's own screenshot
 * markup: the old row 2 (Home + every sidebar group name, e.g. "Home |
 * Project | Site & Corridor | ...") duplicated the sidebar exactly and
 * made it unclear which menu was actually active (two separate rows
 * could each show their own "active" underline at once) - removed
 * entirely, along with the decorative "Project VIA-35" picker (no
 * project-switching backend exists). TopBar is now just: row 1
 * (search, theme toggle, notifications, user - no project picker), then
 * a single leaf row showing the *active* sidebar group's own leaves
 * (only rendered when the active section actually belongs to a group -
 * "sadece alt menüler olacak"), synced with the sidebar via the URL.
 *
 * <p>Uses `useLocation()`, not `useParams()` (2026-09-12 fix - same bug
 * and same reasoning as `Sidebar.tsx`'s own fix: `useParams()` never
 * resolves outside the matched `:section` route's own rendered subtree,
 * so a sibling-of-`<Routes>` component like this one always saw an
 * empty params object and fell back to `'home'`, regardless of the real
 * URL - this is what made the active leaf/underline never actually
 * track navigation).
 */
/** Legacy section toolbar retained temporarily for route migration; App.tsx does not mount it. */
export default function TopBar() {
  const location = useLocation()
  const active = (location.pathname.slice(1) || 'home') as SectionId

  const activeGroup = SIDEBAR_GROUPS.find((g) => g.sections.some((s) => s.id === active)) ?? null

  return (
    <header className="spn-topbar">
      <div className="spn-topbar-row">
        <div className="spn-topbar-spacer" />

        <div className="spn-search">
          <Search size={15} strokeWidth={1.75} />
          <span>Search</span>
        </div>
        <button type="button" className="spn-icon-button" aria-label="Notifications">
          <Bell size={17} strokeWidth={1.75} />
        </button>
        <div className="spn-user">
          <UserCircle size={22} strokeWidth={1.5} />
          <span>Engineer</span>
        </div>
      </div>

      {activeGroup && (
        <div className="spn-steps-row spn-steps-row-sub">
          {activeGroup.sections.map((leaf) => {
            const isWorking = WORKING_SECTIONS.has(leaf.id)
            return (
              <Link
                key={leaf.id}
                to={`/${leaf.id}`}
                className={`spn-step spn-step-sub${active === leaf.id ? ' spn-step-active' : ''}${isWorking ? '' : ' spn-step-disabled'}`}
                title={isWorking ? undefined : 'Not built yet'}
              >
                {leaf.label}
              </Link>
            )
          })}
        </div>
      )}
    </header>
  )
}
