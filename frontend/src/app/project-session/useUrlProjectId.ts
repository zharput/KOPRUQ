import { useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

/**
 * Router adapter of the session controller (BACKEND-DB-PERSISTENCE M5c): the project id lives in the `?project=` query parameter.
 * `setUrlProjectId` is synchronous and uses replace semantics (no history entry): it reads the live `window.location`, changes only
 * the `project` parameter (path, other parameters and hash are kept) and does nothing when the value is already the requested one.
 */
export function useUrlProjectId(): { urlProjectId: string | null; setUrlProjectId(id: string | null): void } {
  const { search } = useLocation()
  const navigate = useNavigate()
  const urlProjectId = new URLSearchParams(search).get('project') || null
  const setUrlProjectId = useCallback((id: string | null) => {
    const params = new URLSearchParams(window.location.search)
    if ((params.get('project') || null) === id) return
    if (id === null) params.delete('project'); else params.set('project', id)
    const next = params.toString()
    navigate({ pathname: window.location.pathname, search: next === '' ? '' : `?${next}`, hash: window.location.hash }, { replace: true })
  }, [navigate])
  return { urlProjectId, setUrlProjectId }
}
