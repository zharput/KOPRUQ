import { useId, useState, type FormEvent, type KeyboardEvent } from 'react'

type Props = { open: boolean; busy?: boolean; onCreate(name: string): void; onCancel(): void }

function NewProjectForm({ busy, onCreate, onCancel }: Omit<Props, 'open'>) {
  const titleId = useId()
  const [name, setName] = useState('')
  const trimmed = name.trim()
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (trimmed !== '' && !busy) onCreate(trimmed)
  }
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && !busy) { event.stopPropagation(); onCancel() }
  }
  return (
    <div className="spn-modal-backdrop" role="presentation">
      <section className="spn-modal" role="dialog" aria-modal="true" aria-labelledby={titleId} onKeyDown={onKeyDown}>
        <h2 id={titleId}>Yeni proje</h2>
        <form onSubmit={submit}>
          <label className="spn-session-field">Proje adı
            <input type="text" value={name} autoFocus onChange={(event) => setName(event.target.value)} />
          </label>
          <div className="spn-modal-actions">
            <button type="submit" className="spn-button-primary" disabled={trimmed === '' || busy}>Oluştur</button>
            <button type="button" className="spn-button-secondary" disabled={busy} onClick={onCancel}>İptal</button>
          </div>
        </form>
      </section>
    </div>
  )
}

/** The form is mounted only while open, so reopening starts with an empty name. */
export default function NewProjectDialog({ open, busy = false, onCreate, onCancel }: Props) {
  if (!open) return null
  return <NewProjectForm busy={busy} onCreate={onCreate} onCancel={onCancel} />
}
