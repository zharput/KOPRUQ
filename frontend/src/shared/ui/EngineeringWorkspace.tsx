import type { ReactNode } from 'react'

export default function EngineeringWorkspace({ left, center, right }: { left: ReactNode; center: ReactNode; right: ReactNode }) {
  return <div className="spn-engineering-workspace"><aside className="spn-workspace-panel">{left}</aside><section className="spn-workspace-center">{center}</section><aside className="spn-workspace-panel">{right}</aside></div>
}
