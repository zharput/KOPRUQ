/**
 * A grid of disabled "not built yet" cards, one per item name -
 * extracted 2026-09-13 from `app/components/BigMenuPanel.tsx` once a
 * second consumer needed the exact same card grid (Loads' own Seismic
 * tab, which absorbed Site & Corridor's former Seismic leaf - see
 * `features/loads/components/LoadsPanel.tsx`). Domain-free (just a list
 * of labels), so it lives in `shared/ui`.
 */
export default function DisabledItemGrid({ items }: { items: string[] }) {
  return (
    <div className="spn-quick-actions">
      {items.map((item) => (
        <button key={item} type="button" className="spn-quick-action" disabled title="Not built yet">
          <span>{item}</span>
        </button>
      ))}
    </div>
  )
}
