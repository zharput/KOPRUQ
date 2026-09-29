type Props = { open: boolean; fileName?: string; error?: string; onReselect: () => void; onCancel: () => void }
export default function RecentFileAccessModal({ open, fileName, error, onReselect, onCancel }: Props) {
  if (!open) return null
  return <div className="spn-modal-backdrop" role="presentation"><section className="spn-modal" role="dialog" aria-modal="true"><h2>Recent Project</h2><p>{error ?? `Bu dosyanın kayıtlı erişim bilgisi bulunamadı: ${fileName ?? ''}`}</p><div className="spn-modal-actions"><button type="button" onClick={onReselect}>Dosyayı Yeniden Seç</button><button type="button" onClick={onCancel}>İptal</button></div></section></div>
}
