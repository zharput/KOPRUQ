import type { SaveToastState } from './useSaveToast'
import type { SaveToastKind } from './saveToastTracker'

const TEXT: Record<SaveToastKind, string> = { saved: 'Kaydedildi', failed: 'Kaydedilemedi' }

/**
 * Transient save notification. The polite live region is always mounted and only its content changes, so screen readers
 * announce each toast. Not role=alert: the persistent problem block of SaveStatusIndicator already is the alert.
 */
export default function SaveToast({ toast }: { toast: SaveToastState }) {
  return (
    <div className="spn-save-toast-region" role="status" aria-live="polite">
      {toast && <div key={toast.id} className="spn-save-toast" data-kind={toast.kind}>{TEXT[toast.kind]}</div>}
    </div>
  )
}
