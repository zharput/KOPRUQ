/**
 * Honest "not built yet" state for the Traffic sub-tabs deferred past
 * TRAFFIC-P01 (LM3/Special Vehicles, LM4/Crowd Loading, Braking &
 * Acceleration, Centrifugal Forces) - not on the engineer's own P01
 * checklist. Mirrors `app/components/PlaceholderPanel.tsx`'s
 * title+note convention, scoped to a single Traffic sub-tab instead of
 * a whole shell section.
 */
export default function TrafficPlaceholder({ title, note }: { title: string; note: string }) {
  return (
    <div className="spn-card">
      <h2 className="spn-card-title">{title}</h2>
      <p className="spn-card-subtitle">Not built yet - {note}.</p>
    </div>
  )
}
