import { useState } from 'react'
import type { ReactNode } from 'react'
import * as Tabs from '@radix-ui/react-tabs'
import type { LucideIcon } from 'lucide-react'

/**
 * Generic "top tab row, click reveals a detail area below" pattern -
 * the engineer's own instruction for Loads (2026-09-11), reused
 * verbatim for Superstructure Families ("loads sekmesinde yaptığın üst
 * menü revizyonunu burada yap"). Domain-free (a generic
 * label/icon/status-or-content list), so it lives in `shared/ui` per
 * the architecture migration (2026-09-12) rather than in either feature.
 *
 * <p>Built on Radix UI's Tabs primitive (added 2026-09-12) for real
 * keyboard navigation (arrow keys between tabs) and ARIA tab/tabpanel
 * semantics - Radix is unstyled, so the visual classes
 * (`spn-step`/`spn-step-active`/`spn-card`) are unchanged from the
 * original hand-rolled version; only the underlying markup/behavior is
 * now a real tabs widget instead of a plain button row + conditional div.
 *
 * <p>A category is either an honest placeholder (`status` - plain
 * explanatory text, the original shape) or has real interactive
 * content (`content` - e.g. Superstructure Families' Precast cross-
 * section, 2026-09-13) - exactly one of the two, never both.
 */
export interface DetailCategory {
  label: string
  icon?: LucideIcon
  status?: string
  content?: ReactNode
}

export default function TabDetailPanel({ categories }: { categories: DetailCategory[] }) {
  const [active, setActive] = useState<string>(categories[0]?.label ?? '')

  return (
    <Tabs.Root className="spn-workflow" value={active} onValueChange={setActive}>
      <Tabs.List className="spn-steps-row spn-steps-row-sub" style={{ margin: '0 -24px', padding: '0 24px' }}>
        {categories.map((category) => (
          <Tabs.Trigger
            key={category.label}
            value={category.label}
            className={`spn-step spn-step-sub${active === category.label ? ' spn-step-active' : ''}`}
          >
            {category.icon && <category.icon size={14} strokeWidth={1.75} />}
            {category.label}
          </Tabs.Trigger>
        ))}
      </Tabs.List>

      {categories.map((category) =>
        category.content ? (
          <Tabs.Content key={category.label} value={category.label}>
            {category.content}
          </Tabs.Content>
        ) : (
          <Tabs.Content key={category.label} value={category.label} className="spn-card">
            <h2 className="spn-card-title">{category.label}</h2>
            <p className="spn-card-subtitle">{category.status}</p>
          </Tabs.Content>
        ),
      )}
    </Tabs.Root>
  )
}
