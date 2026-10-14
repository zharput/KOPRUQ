import { ApiError, formatApiError } from '../../shared/api/http'
import type { ProjectSessionSnapshot } from '../../shared/project-store/projectSession'

const MAX_FIELD_ERRORS = 3

export type SaveProblem = { title: string; details: string[]; actions: 'retry-discard' | 'reload' }

/** User-facing description of a stalled save (error, rejected or conflict); null while idle or saving. */
export function describeSaveProblem(snapshot: ProjectSessionSnapshot): SaveProblem | null {
  const section = snapshot.failedKey ? [`Bölüm: ${snapshot.failedKey}`] : []
  switch (snapshot.status) {
    case 'error':
      return { title: `Kayıt hatası: ${formatApiError(snapshot.lastError)}`, details: section, actions: 'retry-discard' }
    case 'rejected': {
      const fields = snapshot.lastError instanceof ApiError ? snapshot.lastError.fieldErrors : []
      const listed = fields.slice(0, MAX_FIELD_ERRORS).map((item) => `${item.field}: ${item.message}`)
      if (fields.length > MAX_FIELD_ERRORS) listed.push(`+${fields.length - MAX_FIELD_ERRORS} hata daha`)
      if (listed.length === 0) listed.push(formatApiError(snapshot.lastError))
      return { title: 'Kayıt reddedildi', details: [...listed, ...section], actions: 'retry-discard' }
    }
    case 'conflict':
      return { title: 'Çakışma: proje başka bir yerde değiştirildi.', details: ['Yeniden yüklemek bekleyen değişiklikleri atar.'], actions: 'reload' }
    default:
      return null
  }
}
