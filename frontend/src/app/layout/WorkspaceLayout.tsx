import { useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function WorkspaceLayout({ leftTitle, leftPanel, mainContent, rightTitle, rightPanel, mainClassName = '' }: { leftTitle: string; leftPanel: ReactNode; mainContent: ReactNode; rightTitle: string; rightPanel: ReactNode; mainClassName?: string }) {
  const [leftCollapsed, setLeftCollapsed] = useState(false)
  const [rightCollapsed, setRightCollapsed] = useState(false)
  const [leftWidth, setLeftWidth] = useState(248)
  const [rightWidth, setRightWidth] = useState(250)
  const startResize = (side: 'left' | 'right', event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    const startX = event.clientX
    const initialWidth = side === 'left' ? leftWidth : rightWidth
    const onMove = (moveEvent: PointerEvent) => {
      const delta = moveEvent.clientX - startX
      const next = Math.max(side === 'left' ? 180 : 220, Math.min(side === 'left' ? 420 : 480, initialWidth + (side === 'left' ? delta : -delta)))
      if (side === 'left') setLeftWidth(next)
      else setRightWidth(next)
    }
    const onUp = () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp) }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp, { once: true })
  }
  return <div className={`spn-workspace-layout${leftCollapsed ? ' left-collapsed' : ''}${rightCollapsed ? ' right-collapsed' : ''}`} style={{ '--workspace-left': leftCollapsed ? '42px' : `${leftWidth}px`, '--workspace-right': rightCollapsed ? '42px' : `${rightWidth}px` } as CSSProperties}>
    <aside className="spn-workspace-side spn-workspace-side-left" aria-label={leftTitle}>
      <div className="spn-workspace-side-heading"><span>{!leftCollapsed && leftTitle}</span><button type="button" aria-label={leftCollapsed ? 'Expand left panel' : 'Collapse left panel'} onClick={() => setLeftCollapsed((value) => !value)}>{leftCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}</button></div>
      {!leftCollapsed && <div className="spn-workspace-side-content">{leftPanel}</div>}
      {!leftCollapsed && <div className="spn-workspace-resize-handle workspace-resize-handle-left" role="separator" aria-label="Resize left panel" onPointerDown={(event) => startResize('left', event)} />}
    </aside>
    <main className={`spn-workspace-main${mainClassName ? ` ${mainClassName}` : ''}`}>{mainContent}</main>
    <aside className="spn-workspace-side spn-workspace-side-right" aria-label={rightTitle}>
      <div className="spn-workspace-side-heading"><button type="button" aria-label={rightCollapsed ? 'Expand right panel' : 'Collapse right panel'} onClick={() => setRightCollapsed((value) => !value)}>{rightCollapsed ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}</button><span>{!rightCollapsed && rightTitle}</span></div>
      {!rightCollapsed && <div className="spn-workspace-side-content">{rightPanel}</div>}
      {!rightCollapsed && <div className="spn-workspace-resize-handle workspace-resize-handle-right" role="separator" aria-label="Resize right panel" onPointerDown={(event) => startResize('right', event)} />}
    </aside>
  </div>
}
