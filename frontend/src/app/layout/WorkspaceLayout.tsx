import { useState, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function WorkspaceLayout({ leftTitle, leftPanel, mainContent, rightTitle, rightPanel, mainClassName = '' }: { leftTitle: string; leftPanel: ReactNode; mainContent: ReactNode; rightTitle: string; rightPanel: ReactNode; mainClassName?: string }) {
  const [leftCollapsed, setLeftCollapsed] = useState(false)
  const [rightCollapsed, setRightCollapsed] = useState(false)
  return <div className={`spn-workspace-layout${leftCollapsed ? ' left-collapsed' : ''}${rightCollapsed ? ' right-collapsed' : ''}`}>
    <aside className="spn-workspace-side spn-workspace-side-left" aria-label={leftTitle}>
      <div className="spn-workspace-side-heading"><span>{!leftCollapsed && leftTitle}</span><button type="button" aria-label={leftCollapsed ? 'Expand left panel' : 'Collapse left panel'} onClick={() => setLeftCollapsed((value) => !value)}>{leftCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}</button></div>
      {!leftCollapsed && <div className="spn-workspace-side-content">{leftPanel}</div>}
    </aside>
    <main className={`spn-workspace-main${mainClassName ? ` ${mainClassName}` : ''}`}>{mainContent}</main>
    <aside className="spn-workspace-side spn-workspace-side-right" aria-label={rightTitle}>
      <div className="spn-workspace-side-heading"><button type="button" aria-label={rightCollapsed ? 'Expand right panel' : 'Collapse right panel'} onClick={() => setRightCollapsed((value) => !value)}>{rightCollapsed ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}</button><span>{!rightCollapsed && rightTitle}</span></div>
      {!rightCollapsed && <div className="spn-workspace-side-content">{rightPanel}</div>}
    </aside>
  </div>
}
