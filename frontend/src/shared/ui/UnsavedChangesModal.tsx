type Props = { open: boolean; busy?: boolean; message: string; canRetry: boolean; onRetry: () => void; onDiscard: () => void; onCancel: () => void }

/** Shown when the writes of the open project could not be saved before New / Open / Exit; `message` is the reason. */
export default function UnsavedChangesModal({ open, busy = false, message, canRetry, onRetry, onDiscard, onCancel }: Props) {
  if (!open) return null
  return <div className="spn-modal-backdrop" role="presentation"><section className="spn-modal" role="dialog" aria-modal="true" aria-labelledby="unsaved-title"><h2 id="unsaved-title">Kaydedilmemiş değişiklikler</h2><p>Projedeki değişiklikler sunucuya kaydedilemedi.</p><p>{message}</p><div className="spn-modal-actions"><button className="spn-button-primary" disabled={busy || !canRetry} onClick={onRetry}>TEKRAR DENE</button><button className="spn-button-secondary" disabled={busy} onClick={onDiscard}>DEĞİŞİKLİKLERİ AT</button><button className="spn-button-secondary" disabled={busy} onClick={onCancel}>İPTAL</button></div></section></div>
}
