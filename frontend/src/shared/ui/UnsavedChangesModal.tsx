type Props = { open: boolean; busy?: boolean; onSave: () => void; onDiscard: () => void; onCancel: () => void }
export default function UnsavedChangesModal({ open, busy = false, onSave, onDiscard, onCancel }: Props) {
  if (!open) return null
  return <div className="spn-modal-backdrop" role="presentation"><section className="spn-modal" role="dialog" aria-modal="true" aria-labelledby="unsaved-title"><h2 id="unsaved-title">Unsaved Changes</h2><p>The current project has unsaved changes.</p><div className="spn-modal-actions"><button className="spn-button-primary" disabled={busy} onClick={onSave}>SAVE</button><button className="spn-button-secondary" disabled={busy} onClick={onDiscard}>DON'T SAVE</button><button className="spn-button-secondary" disabled={busy} onClick={onCancel}>CANCEL</button></div></section></div>
}
