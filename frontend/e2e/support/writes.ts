import { expect, type Page, type Request, type Response } from '@playwright/test'
import { E2E_API_BASE } from './env.ts'

/** One PUT /api/projects/{id}/{section} seen by the tracker. `section` is the path after the project id (e.g. `workspace`, `graphs/<id>`). */
export type PutRecord = {
  projectId: string
  section: string
  url: string
  /** Parsed request body `{expectedRevision, value}` (null when it is not JSON). */
  body: { expectedRevision?: number; value?: unknown } | null
  status: number | null
  startedAt: number
  finishedAt: number | null
}

const PUT_PATH = /^\/api\/projects\/([^/]+)\/(.+)$/

function parsePut(request: Request): { projectId: string; section: string } | null {
  if (request.method() !== 'PUT') return null
  if (!request.url().startsWith(E2E_API_BASE)) return null
  const match = PUT_PATH.exec(new URL(request.url()).pathname)
  return match ? { projectId: decodeURIComponent(match[1]), section: match[2] } : null
}

function parseBody(request: Request): PutRecord['body'] {
  try { return JSON.parse(request.postData() ?? 'null') as PutRecord['body'] } catch { return null }
}

/** Tracks section PUTs (in flight, last activity, body, status). Several pages of one test can be attached (scenario 18). */
export class WriteTracker {
  readonly records: PutRecord[] = []
  private inFlight = 0
  private lastActivity = 0

  attach(page: Page): void {
    const open = new Map<Request, PutRecord>()
    page.on('request', (request) => {
      const parsed = parsePut(request)
      if (!parsed) return
      const record: PutRecord = { ...parsed, url: request.url(), body: parseBody(request), status: null, startedAt: Date.now(), finishedAt: null }
      open.set(request, record)
      this.records.push(record)
      this.inFlight += 1
      this.lastActivity = Date.now()
    })
    page.on('response', (response: Response) => {
      const record = open.get(response.request())
      if (record) record.status = response.status()
    })
    const done = (request: Request) => {
      const record = open.get(request)
      if (!record) return
      open.delete(request)
      record.finishedAt = Date.now()
      this.inFlight -= 1
      this.lastActivity = Date.now()
    }
    page.on('requestfinished', done)
    page.on('requestfailed', done)
  }

  get pendingCount(): number { return this.inFlight }
  get lastActivityAt(): number { return this.lastActivity }
  count(sectionPrefix = ''): number { return this.records.filter((r) => r.section.startsWith(sectionPrefix)).length }
  puts(sectionPrefix = ''): PutRecord[] { return this.records.filter((r) => r.section.startsWith(sectionPrefix)) }
}

export type SectionPut<V = unknown> = {
  status: number
  /** Section path after the project id, e.g. `workspace` or `graphs/<graphId>`. */
  section: string
  /** Request body as sent by the app. */
  request: { expectedRevision: number; value: V }
  /** Response envelope `{projectId, revision, updatedAt, value}` for 2xx, else the error body. */
  response: { projectId?: string; revision?: number; updatedAt?: string; value?: unknown; code?: string; message?: string }
}

export type SectionPutOptions<V> = {
  predicate?: (request: { expectedRevision: number; value: V }) => boolean
  /** Expected HTTP status (default 200). */
  status?: number
}

/**
 * Starts waiting for `PUT /api/projects/{projectId}/{section}` whose request body satisfies `predicate`. Call it BEFORE the action
 * and await the returned promise afterwards. Asserts the status (default 200).
 */
export function waitForSectionPut<V = unknown>(page: Page, projectId: string, section: string | RegExp, options: SectionPutOptions<V> = {}): Promise<SectionPut<V>> {
  const expectedStatus = options.status ?? 200
  const matches = (response: Response): boolean => {
    const request = response.request()
    if (request.method() !== 'PUT' || !request.url().startsWith(E2E_API_BASE)) return false
    const path = new URL(request.url()).pathname
    const prefix = `/api/projects/${projectId}/`
    if (!path.startsWith(prefix)) return false
    const rest = path.slice(prefix.length)
    if (typeof section === 'string' ? rest !== section : !section.test(rest)) return false
    if (!options.predicate) return true
    const body = parseBody(request) as { expectedRevision: number; value: V } | null
    return body !== null && options.predicate(body)
  }
  return page.waitForResponse(matches).then(async (response) => {
    const request = parseBody(response.request()) as SectionPut<V>['request']
    const body = (await response.json().catch(() => ({}))) as SectionPut<V>['response']
    expect(response.status(), `PUT ${response.url()} -> ${JSON.stringify(body)}`).toBe(expectedStatus)
    return { status: response.status(), section: new URL(response.url()).pathname.slice(`/api/projects/${projectId}/`.length), request, response: body }
  })
}

/**
 * Waits until no section PUT is in flight and none started for `quietMs` (the app debounces writes by 300 ms, so one second is
 * safe). Needed before reload/goto (beforeunload warning) and before counting PUTs. Polling only; no fixed page wait.
 */
export async function settleWrites(writes: WriteTracker, options: { quietMs?: number; timeoutMs?: number } = {}): Promise<void> {
  const quietMs = options.quietMs ?? 1000
  const timeoutMs = options.timeoutMs ?? 20_000
  const deadline = Date.now() + timeoutMs
  const started = Date.now()
  for (;;) {
    const lastActivity = Math.max(writes.lastActivityAt, started)
    if (writes.pendingCount === 0 && Date.now() - lastActivity >= quietMs) return
    if (Date.now() > deadline) throw new Error(`Yazmalar ${timeoutMs} ms içinde tamamlanmadı (in flight: ${writes.pendingCount}).`)
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
}

type ToastWindow = { __kopruqE2eToasts?: { kind: string; text: string; t: number }[] }

async function toastCount(page: Page, kind: string): Promise<number> {
  return page.evaluate((k) => ((window as unknown as ToastWindow).__kopruqE2eToasts ?? []).filter((toast) => toast.kind === k).length, kind)
}
/** Number of green "Kaydedildi" toasts that appeared on the current document since it loaded (recorded by a MutationObserver). */
export const savedToastCount = (page: Page): Promise<number> => toastCount(page, 'saved')
/** Number of red save-problem toasts that appeared on the current document since it loaded. */
export const failedToastCount = (page: Page): Promise<number> => toastCount(page, 'failed')

/** Runs `action`, waits for writes to settle and asserts no section PUT under `sectionPrefix` (e.g. `loads/`) was made meanwhile. */
export async function expectNoPutDuring(writes: WriteTracker, sectionPrefix: string, action: () => Promise<void>): Promise<void> {
  const before = writes.count(sectionPrefix)
  await action()
  await settleWrites(writes)
  expect(writes.puts(sectionPrefix).slice(before).map((r) => r.section), `Beklenmeyen PUT ${sectionPrefix}*`).toEqual([])
}
