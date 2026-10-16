import { expect, test as base, type APIRequestContext, type Page, type Request, type Response } from '@playwright/test'
import { E2E_API_BASE } from './env.ts'
import { WriteTracker } from './writes.ts'

export type ApiCall = {
  method: string
  url: string
  /** Path + query of the URL without the API base. */
  path: string
  status: number
  correlationId: string | null
  requestBody: string | null
}
export type ApiMatcher = { method?: string; url?: string | RegExp; status?: number }

type ConsoleRecord = { text: string; url: string }
type Allowance<T> = { match: T; reason: string; used: boolean }
export type ApiStatusAllowance = { method: string; url: string | RegExp; status: number }

const RESOURCE_FAILURE = /Failed to load resource: the server responded with a status of (\d+)/

const urlMatches = (matcher: string | RegExp, url: string) => (typeof matcher === 'string' ? url.includes(matcher) : matcher.test(url))

/**
 * Collects console errors, page errors, API responses, dialogs, downloads and file choosers of one or more pages. It never fails by
 * itself: every spec ends with `expectClean()`, and the (few) expected failures are allowed per test with a reason.
 */
export class Diagnostics {
  readonly consoleErrors: ConsoleRecord[] = []
  readonly pageErrors: string[] = []
  readonly calls: ApiCall[] = []
  readonly dialogs: { type: string; message: string }[] = []
  downloads = 0
  fileChoosers = 0
  private readonly consoleAllowances: Allowance<RegExp>[] = []
  private readonly statusAllowances: Allowance<ApiStatusAllowance>[] = []
  private readonly dialogAllowances: Allowance<string>[] = []
  private readonly annotate: (type: string, description: string) => void

  constructor(annotate: (type: string, description: string) => void) { this.annotate = annotate }

  attach(page: Page): void {
    page.on('console', (message) => {
      if (message.type() !== 'error') return
      const text = message.text()
      if (text.includes('net::ERR_ABORTED')) return
      this.consoleErrors.push({ text, url: message.location().url })
    })
    page.on('pageerror', (error) => { this.pageErrors.push(error.stack ?? error.message) })
    page.on('response', (response: Response) => {
      if (!response.url().startsWith(E2E_API_BASE)) return
      const request: Request = response.request()
      this.calls.push({
        method: request.method(),
        url: response.url(),
        path: response.url().slice(E2E_API_BASE.length),
        status: response.status(),
        correlationId: response.headers()['x-correlation-id'] ?? null,
        requestBody: request.postData(),
      })
    })
    page.on('dialog', (dialog) => {
      this.dialogs.push({ type: dialog.type(), message: dialog.message() })
      if (dialog.type() === 'beforeunload') void dialog.accept(); else void dialog.dismiss()
    })
    page.on('download', () => { this.downloads += 1 })
    page.on('filechooser', () => { this.fileChoosers += 1 })
  }

  /** Allows console errors matching `pattern` in THIS test only; recorded as a test annotation. */
  allowConsoleError(pattern: RegExp, reason: string): void {
    this.consoleAllowances.push({ match: pattern, reason, used: false })
    this.annotate('allow-console-error', `${String(pattern)} - ${reason}`)
  }

  /** Allows an expected 4xx/5xx API response (and Chromium's matching "Failed to load resource" console error) in THIS test only. */
  allowApiStatus(allowance: ApiStatusAllowance, reason: string): void {
    this.statusAllowances.push({ match: allowance, reason, used: false })
    this.annotate('allow-api-status', `${allowance.method} ${String(allowance.url)} -> ${allowance.status} - ${reason}`)
  }

  /** Allows a dialog of `type` (never `beforeunload`) in THIS test only. */
  allowDialog(type: string, reason: string): void {
    this.dialogAllowances.push({ match: type, reason, used: false })
    this.annotate('allow-dialog', `${type} - ${reason}`)
  }

  /** API calls recorded so far that match all given fields. */
  apiCalls(matcher: ApiMatcher = {}): ApiCall[] {
    return this.calls.filter((call) =>
      (matcher.method === undefined || call.method === matcher.method) &&
      (matcher.status === undefined || call.status === matcher.status) &&
      (matcher.url === undefined || urlMatches(matcher.url, call.url)))
  }

  private statusAllowed(call: { method?: string; url: string; status: number }): boolean {
    const hit = this.statusAllowances.find((a) =>
      (call.method === undefined || a.match.method === call.method) && a.match.status === call.status && urlMatches(a.match.url, call.url))
    if (hit) hit.used = true
    return hit !== undefined
  }

  /** Fails when there is a page error, a non-allowed console error, a non-allowed 4xx/5xx API response or a non-allowed dialog. */
  expectClean(): void {
    const problems: string[] = []
    for (const error of this.pageErrors) problems.push(`pageerror: ${error}`)
    for (const record of this.consoleErrors) {
      const allowance = this.consoleAllowances.find((a) => a.match.test(record.text))
      if (allowance) { allowance.used = true; continue }
      const resource = RESOURCE_FAILURE.exec(record.text)
      if (resource && this.statusAllowed({ url: record.url, status: Number(resource[1]) })) continue
      problems.push(`console.error: ${record.text}${record.url ? ` (${record.url})` : ''}`)
    }
    for (const call of this.calls) {
      if (call.status < 400) continue
      if (this.statusAllowed(call)) continue
      problems.push(`API ${call.method} ${call.path} -> ${call.status} (correlationId ${call.correlationId ?? '-'})`)
    }
    for (const dialog of this.dialogs) {
      const allowance = dialog.type === 'beforeunload' ? undefined : this.dialogAllowances.find((a) => a.match === dialog.type)
      if (allowance) { allowance.used = true; continue }
      problems.push(`dialog (${dialog.type}): ${dialog.message}`)
    }
    for (const allowance of [...this.consoleAllowances, ...this.statusAllowances, ...this.dialogAllowances]) {
      if (!allowance.used) this.annotate('allowance-not-used', allowance.reason)
    }
    expect(problems, 'Tanılama: beklenmeyen hata/istek/dialog').toEqual([])
  }
}

/** Project document as read by the API fixture; only fields the specs assert are typed. */
export type ProjectDocument = {
  projectId: string
  revision: number
  createdAt: string
  updatedAt: string
  workspace: {
    project: {
      name: string
      units: { length: string; force: string; moment: string; stress: string; mass: string; temperature: string }
      environment: { terrainDatasetId: string | null; landXmlImportId: string | null }
    }
    bridges: { id: string; no: string; [key: string]: unknown }[]
  }
  bridgeDefinitions: { definitions: { bridgeId: string; spanLengthsM: number[]; axes: { id: string; name: string; type: string; chainageM: number }[] }[] }
  families: { materials: { id: string; no?: string; element?: string; concreteClass: string }[] }
  loads: Record<string, unknown>
  graphs: { id: string; name: string; bridgeId: string; nodes: { id: string; type?: string; [key: string]: unknown }[]; connections: unknown[] }[]
}

export type ProjectReader = {
  getProject(projectId: string): Promise<ProjectDocument>
  /** GET against the API base, independent of browser CORS. */
  get(path: string): Promise<{ status: number; body: unknown; headers: Record<string, string> }>
}

function createReader(request: APIRequestContext): ProjectReader {
  return {
    async getProject(projectId) {
      const response = await request.get(`${E2E_API_BASE}/api/projects/${projectId}`)
      expect(response.status(), `GET /api/projects/${projectId}`).toBe(200)
      return (await response.json()) as ProjectDocument
    },
    async get(path) {
      const response = await request.get(`${E2E_API_BASE}${path}`)
      const body: unknown = await response.json().catch(() => null)
      return { status: response.status(), body, headers: response.headers() }
    },
  }
}

/** Installed in every page of the context: records each .spn-save-toast that is added to the DOM (the success toast lives only 1.5 s). */
const TOAST_RECORDER = () => {
  const store: { kind: string; text: string; t: number }[] = []
  ;(window as unknown as { __kopruqE2eToasts: typeof store }).__kopruqE2eToasts = store
  const record = (node: Node) => {
    if (!(node instanceof Element)) return
    const toasts = node.matches('.spn-save-toast') ? [node] : Array.from(node.querySelectorAll('.spn-save-toast'))
    for (const toast of toasts) store.push({ kind: toast.getAttribute('data-kind') ?? '', text: toast.textContent ?? '', t: Date.now() })
  }
  new MutationObserver((mutations) => { for (const m of mutations) m.addedNodes.forEach(record) }).observe(document, { childList: true, subtree: true })
}

type Fixtures = { diagnostics: Diagnostics; writes: WriteTracker; projectApi: ProjectReader; toastRecorder: void; projectCleanup: void }

export const test = base.extend<Fixtures>({
  toastRecorder: [async ({ context }, provide) => {
    await context.addInitScript(TOAST_RECORDER)
    await provide()
  }, { auto: true }],
  diagnostics: [async ({ page }, provide, testInfo) => {
    const diagnostics = new Diagnostics((type, description) => { testInfo.annotations.push({ type, description }) })
    diagnostics.attach(page)
    await provide(diagnostics)
  }, { auto: true }],
  writes: [async ({ page }, provide) => {
    const writes = new WriteTracker()
    writes.attach(page)
    await provide(writes)
  }, { auto: true }],
  projectApi: async ({ request }, provide) => { await provide(createReader(request)) },
  /**
   * Deletes every project this test created (any POST /api/projects 201 seen by the browser context, also second pages), even when the
   * test failed. 204 and 404 are fine; any other status fails the teardown with an explicit message. Uses the API request context
   * (no Origin header, so the DELETE is not subject to the browser CORS policy).
   */
  projectCleanup: [async ({ context, request }, provide) => {
    const created: Promise<string | null>[] = []
    context.on('response', (response: Response) => {
      const req = response.request()
      if (req.method() !== 'POST' || response.status() !== 201 || !response.url().startsWith(E2E_API_BASE)) return
      if (new URL(response.url()).pathname !== '/api/projects') return
      created.push(response.json().then((body: { projectId?: string }) => body.projectId ?? null, () => null))
    })
    await provide()
    const ids = [...new Set((await Promise.all(created)).filter((id): id is string => id !== null))]
    const failures: string[] = []
    for (const id of ids) {
      const response = await request.delete(`${E2E_API_BASE}/api/projects/${id}`)
      if (response.status() === 204 || response.status() === 404) continue
      failures.push(response.status() === 405
        ? `DELETE /api/projects/${id} -> 405: backend DELETE ucunu desteklemiyor, jar güncel mi?`
        : `DELETE /api/projects/${id} -> ${response.status()}`)
    }
    expect(failures, 'Teardown: e2e projeleri silinemedi').toEqual([])
  }, { auto: true }],
})

export { expect }
