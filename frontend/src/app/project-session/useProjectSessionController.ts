import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError, formatApiError } from '../../shared/api/http'
import { activeProjectApi, activeProjectSession, activeWriteQueue } from '../../shared/project-store/activeProject'
import type { ProjectSessionSnapshot } from '../../shared/project-store/projectSession'
import { useSaveStatus } from '../../shared/project-store/useSaveStatus'
import { INITIAL_PROJECT } from '../../features/project/model/projectWorkspaceModel'
import { createProjectRequestBody, loadProjectDocument } from './projectDocument'
import { applyPreparedProject, closeActiveProject, prepareLoadedProject } from './projectSections'
import { PROJECT_LIST_QUERY_KEY } from './useProjectList'

/**
 * Session controller of the open project (BACKEND-DB-PERSISTENCE M5b): New / Open / Reload / Exit, the unsaved-writes gate and the
 * URL synchronisation. Wired into the application shell (`App.tsx`) in M5c.
 * - Must run inside a `QueryClientProvider` (it invalidates the project list after New).
 * - The URL is injected: `urlProjectId` is the id currently in the address bar, `setUrlProjectId` must change it synchronously
 *   (replace semantics). No router is imported here.
 * - No returned promise rejects; failures end up in `actionError`, `pendingSwitch` or the `load-error` phase.
 * - A request counter drops the answer of any superseded or unmounted request. New / Open / Exit first pass the gate
 *   (`activeWriteQueue.flush()`); when it fails `pendingSwitch` asks the user to retry, discard or cancel.
 */
export type SessionPhase =
  | { kind: 'welcome' }
  | { kind: 'loading'; projectId: string }
  | { kind: 'ready'; projectId: string }
  | { kind: 'load-error'; projectId: string; message: string }
export type PendingSwitch = (
  | { reason: 'new' | 'open'; target: string; error: unknown; canRetry: boolean }
  | { reason: 'exit'; error: unknown; canRetry: boolean }
) | null
export type ProjectSessionControllerOptions = { urlProjectId: string | null; setUrlProjectId(id: string | null): void }
export type ProjectSessionController = {
  phase: SessionPhase
  saveStatus: ProjectSessionSnapshot
  pendingSwitch: PendingSwitch
  busy: boolean
  actionError: string | null
  newProject(name: string): Promise<void>
  openProject(projectId: string): Promise<void>
  reloadProject(): Promise<void>
  exitProject(): Promise<void>
  retrySaves(): Promise<void>
  discardSaves(): void
  resolvePendingSwitch(choice: 'retry' | 'discard' | 'cancel'): Promise<void>
  clearActionError(): void
}

type LoadState = { kind: 'idle' } | { kind: 'loading'; projectId: string } | { kind: 'load-error'; projectId: string; message: string }
type Switch = NonNullable<PendingSwitch>

export function describeLoadError(error: unknown): string {
  if (error instanceof ApiError && error.status === 404) return `Proje bulunamadı: ${formatApiError(error)}`
  return formatApiError(error)
}

export function useProjectSessionController({ urlProjectId, setUrlProjectId }: ProjectSessionControllerOptions): ProjectSessionController {
  const queryClient = useQueryClient()
  const saveStatus = useSaveStatus()
  const [load, setLoad] = useState<LoadState>({ kind: 'idle' })
  const [pendingSwitch, setPendingSwitchState] = useState<PendingSwitch>(null)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const requestRef = useRef(0)
  const inFlightTargetRef = useRef<string | null>(null)
  const creatingRef = useRef<number | null>(null)
  const pendingRef = useRef<PendingSwitch>(null)
  const setUrlRef = useRef(setUrlProjectId)
  const urlProjectIdRef = useRef(urlProjectId)
  const restoredUrlRef = useRef<string | null | undefined>(undefined)
  useEffect(() => { setUrlRef.current = setUrlProjectId; urlProjectIdRef.current = urlProjectId })

  const setPending = useCallback((next: PendingSwitch) => { pendingRef.current = next; setPendingSwitchState(next) }, [])
  const start = useCallback((target: string | null) => {
    requestRef.current += 1
    inFlightTargetRef.current = target
    setBusy(true); setActionError(null)
    return requestRef.current
  }, [])
  const finish = useCallback((request: number) => {
    if (request !== requestRef.current) return
    inFlightTargetRef.current = null
    setBusy(false)
  }, [])
  const cancelPendingOpen = useCallback(() => {
    if (inFlightTargetRef.current === null) return
    requestRef.current += 1
    inFlightTargetRef.current = null
    setBusy(false)
    setLoad({ kind: 'idle' })
  }, [])
  const sessionProjectId = () => activeProjectSession.getSnapshot().projectId
  const restoreUrlBeforeSupersedingOpen = useCallback(() => {
    const projectId = sessionProjectId()
    if (inFlightTargetRef.current !== null && urlProjectIdRef.current !== projectId) {
      restoredUrlRef.current = projectId
      setUrlRef.current(projectId)
    }
  }, [])

  /** Returns true when every write is saved. Otherwise `pendingSwitch` is set (not for a superseded request). */
  const passGate = useCallback(async (request: number, next: { reason: 'new' | 'open'; target: string } | { reason: 'exit' }): Promise<boolean> => {
    try { await activeWriteQueue.flush(); return true } catch (error) {
      if (request === requestRef.current) setPending({ ...next, error, canRetry: activeProjectSession.getSnapshot().status !== 'conflict' })
      return false
    }
  }, [setPending])

  const openNow = useCallback(async (request: number, projectId: string, fromUrl: boolean) => {
    try {
      const document = await activeProjectApi().getProjectDocument(projectId)
      if (request !== requestRef.current) return
      const prepared = prepareLoadedProject(loadProjectDocument(document))
      applyPreparedProject(prepared)
      setLoad({ kind: 'idle' }); setPending(null)
      setUrlRef.current(projectId)
    } catch (error) {
      if (request !== requestRef.current) return
      const message = describeLoadError(error)
      const open = sessionProjectId()
      if (open !== null) {
        setActionError(message)
        if (fromUrl) setUrlRef.current(open)
      } else setLoad({ kind: 'load-error', projectId, message })
    } finally { finish(request) }
  }, [finish, setPending])

  const createNow = useCallback(async (request: number, name: string) => {
    try {
      const body = createProjectRequestBody({ project: { ...structuredClone(INITIAL_PROJECT), name }, bridges: [] })
      const document = await activeProjectApi().createProject(body)
      void queryClient.invalidateQueries({ queryKey: PROJECT_LIST_QUERY_KEY })
      if (request !== requestRef.current) return
      const prepared = prepareLoadedProject(loadProjectDocument(document))
      applyPreparedProject(prepared)
      setLoad({ kind: 'idle' }); setPending(null)
      setUrlRef.current(prepared.projectId)
    } catch (error) {
      if (request === requestRef.current) {
        setActionError(formatApiError(error))
        setLoad({ kind: 'idle' })
        setUrlRef.current(sessionProjectId())
      }
    } finally { finish(request) }
  }, [finish, queryClient, setPending])

  const exitNow = useCallback((request: number) => {
    closeActiveProject()
    setLoad({ kind: 'idle' }); setPending(null)
    setUrlRef.current(null)
    finish(request)
  }, [finish, setPending])

  const runOpen = useCallback(async (projectId: string, fromUrl: boolean) => {
    if (pendingRef.current !== null) {
      if (fromUrl) setUrlRef.current(sessionProjectId())
      return
    }
    if (projectId === sessionProjectId()) {
      if (!fromUrl) restoreUrlBeforeSupersedingOpen()
      cancelPendingOpen(); return
    }
    if (projectId === inFlightTargetRef.current) return
    if (!fromUrl) restoreUrlBeforeSupersedingOpen()
    const request = start(projectId)
    if (sessionProjectId() === null) setLoad({ kind: 'loading', projectId })
    if (!(await passGate(request, { reason: 'open', target: projectId }))) {
      if (fromUrl && request === requestRef.current) { const open = sessionProjectId(); if (open !== null) setUrlRef.current(open) }
      finish(request); return
    }
    if (request !== requestRef.current) return
    await openNow(request, projectId, fromUrl)
  }, [cancelPendingOpen, finish, openNow, passGate, restoreUrlBeforeSupersedingOpen, start])

  const openProject = useCallback((projectId: string) => runOpen(projectId, false), [runOpen])

  const newProject = useCallback(async (name: string) => {
    const trimmed = name.trim()
    if (trimmed === '' || pendingRef.current !== null || creatingRef.current === requestRef.current) return
    restoreUrlBeforeSupersedingOpen()
    const request = start(null)
    setLoad({ kind: 'idle' })
    creatingRef.current = request
    try {
      if (!(await passGate(request, { reason: 'new', target: trimmed }))) { finish(request); return }
      if (request !== requestRef.current) return
      await createNow(request, trimmed)
    } finally { if (creatingRef.current === request) creatingRef.current = null }
  }, [createNow, finish, passGate, restoreUrlBeforeSupersedingOpen, start])

  const reloadProject = useCallback(async () => {
    const projectId = sessionProjectId()
    if (projectId === null || activeProjectSession.getSnapshot().status !== 'conflict') return
    // An unsaved-changes decision is open: Reload must not start a request underneath it (Cancel could not stop it).
    if (pendingRef.current !== null) return
    restoreUrlBeforeSupersedingOpen()
    const request = start(null)
    setLoad({ kind: 'idle' })
    await openNow(request, projectId, false)
  }, [openNow, restoreUrlBeforeSupersedingOpen, start])

  const exitProject = useCallback(async () => {
    if (pendingRef.current !== null) return
    restoreUrlBeforeSupersedingOpen()
    const request = start(null)
    setLoad({ kind: 'idle' })
    if (!(await passGate(request, { reason: 'exit' }))) { finish(request); return }
    if (request !== requestRef.current) return
    exitNow(request)
  }, [exitNow, finish, passGate, restoreUrlBeforeSupersedingOpen, start])

  const retrySaves = useCallback(async () => {
    try { await activeWriteQueue.retry() } catch { /* the failure stays visible in the save status */ }
  }, [])
  const discardSaves = useCallback(() => { activeWriteQueue.discard() }, [])

  const resume = useCallback(async (request: number, pending: Switch) => {
    if (pending.reason === 'open') {
      inFlightTargetRef.current = pending.target
      if (sessionProjectId() === null) setLoad({ kind: 'loading', projectId: pending.target })
      await openNow(request, pending.target, false)
    } else if (pending.reason === 'new') {
      creatingRef.current = request
      try { await createNow(request, pending.target) } finally { if (creatingRef.current === request) creatingRef.current = null }
    }
    else exitNow(request)
  }, [createNow, exitNow, openNow])

  const resolvePendingSwitch = useCallback(async (choice: 'retry' | 'discard' | 'cancel') => {
    const pending = pendingRef.current
    if (pending === null) return
    if (choice === 'cancel') {
      requestRef.current += 1
      finish(requestRef.current)
      setPending(null)
      return
    }
    if (choice === 'discard') {
      activeWriteQueue.discard()
      setPending(null)
      await resume(start(null), pending)
      return
    }
    if (!pending.canRetry) return
    const request = start(null)
    try { await activeWriteQueue.retry(); await activeWriteQueue.flush() } catch (error) {
      if (request === requestRef.current) setPending({ ...pending, error, canRetry: activeProjectSession.getSnapshot().status !== 'conflict' })
      finish(request); return
    }
    if (request !== requestRef.current) return
    setPending(null)
    await resume(request, pending)
  }, [finish, resume, setPending, start])

  const clearActionError = useCallback(() => setActionError(null), [])

  // Unmount (and the StrictMode simulated unmount): answers of requests still in flight are ignored.
  useEffect(() => () => { requestRef.current += 1; inFlightTargetRef.current = null }, [])
  // URL -> session. Consume the controller's own URL restoration once so it cannot cancel a replacement Open.
  useEffect(() => {
    if (restoredUrlRef.current !== undefined) {
      const restoredUrl = restoredUrlRef.current
      restoredUrlRef.current = undefined
      if (urlProjectId === restoredUrl) return
    }
    const openId = activeProjectSession.getSnapshot().projectId
    if (urlProjectId) void runOpen(urlProjectId, true)
    else if (openId !== null) { cancelPendingOpen(); setUrlRef.current(openId) }
    else { cancelPendingOpen(); setLoad((current) => current.kind === 'idle' ? current : { kind: 'idle' }) }
  }, [cancelPendingOpen, urlProjectId, runOpen])

  let phase: SessionPhase
  if (saveStatus.projectId === null && load.kind !== 'idle') phase = load
  else if (saveStatus.projectId !== null) phase = { kind: 'ready', projectId: saveStatus.projectId }
  else if (urlProjectId) phase = { kind: 'loading', projectId: urlProjectId }
  else phase = { kind: 'welcome' }

  return {
    phase, saveStatus, pendingSwitch, busy, actionError,
    newProject, openProject, reloadProject, exitProject, retrySaves, discardSaves, resolvePendingSwitch, clearActionError,
  }
}
