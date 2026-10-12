import { afterEach, describe, expect, it, vi } from 'vitest'
import { API_BASE, ApiError, formatApiError, postJson, requestBinary, requestJson } from './http'

const json = (body: unknown, status: number, headers: Record<string, string> = {}) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } })
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.resetModules() })

describe('shared HTTP layer', () => {
  it('maps the full backend ApiErrorResponse to an ApiError', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ timestamp: '2026-10-12T10:00:00Z', status: 400, error: 'Bad Request', code: 'INVALID_REQUEST', message: 'Request validation failed', path: '/api/layout/generate', correlationId: 'abc-123', errors: [{ field: 'minSpanM', message: 'must be positive' }] }, 400)))
    const error = await requestJson('/api/layout/generate').catch((e: unknown) => e) as ApiError
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 400, code: 'INVALID_REQUEST', message: 'Request validation failed', correlationId: 'abc-123', path: '/api/layout/generate', fieldErrors: [{ field: 'minSpanM', message: 'must be positive' }] })
    expect(formatApiError(error)).toBe('Request validation failed (Ref: abc-123)')
  })
  it('falls back to HTTP <status> for a non-JSON error body', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<html>Bad gateway</html>', { status: 502, headers: { 'Content-Type': 'text/html' } })))
    const error = await requestJson('/api/x').catch((e: unknown) => e) as ApiError
    expect(error).toBeInstanceOf(ApiError); expect(error.message).toBe('HTTP 502'); expect(error.status).toBe(502); expect(error.fieldErrors).toEqual([]); expect(formatApiError(error)).toBe('HTTP 502')
  })
  it('takes the correlation id from the X-Correlation-ID header when the body has none', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ status: 500, code: 'INTERNAL_ERROR', message: 'Unexpected error', correlationId: null, errors: [] }, 500, { 'X-Correlation-ID': 'hdr-9' })))
    const error = await requestJson('/api/x').catch((e: unknown) => e) as ApiError
    expect(error.correlationId).toBe('hdr-9'); expect(formatApiError(error)).toBe('Unexpected error (Ref: hdr-9)')
  })
  it('passes the abort signal, method and JSON body to fetch and returns parsed JSON', async () => {
    const fetchMock = vi.fn(async () => json({ ok: true }, 200)); vi.stubGlobal('fetch', fetchMock)
    const controller = new AbortController()
    await expect(postJson<{ ok: boolean }>('/api/y', { a: 1 }, controller.signal)).resolves.toEqual({ ok: true })
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe(`${API_BASE}/api/y`); expect(init.method).toBe('POST'); expect(init.signal).toBe(controller.signal); expect(init.body).toBe('{"a":1}')
  })
  it('requestBinary returns the body and raises ApiError for failures', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(new Uint8Array([1, 2, 3]), { status: 200 })))
    expect(new Uint8Array(await requestBinary('/api/mesh.bin'))).toEqual(new Uint8Array([1, 2, 3]))
    vi.stubGlobal('fetch', vi.fn(async () => json({ status: 404, code: 'NOT_FOUND', message: 'No terrain with id t1' }, 404)))
    await expect(requestBinary('/api/mesh.bin')).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND', message: 'No terrain with id t1' })
  })
  it('uses the default base URL when VITE_API_BASE is not set, and VITE_API_BASE when it is', async () => {
    vi.stubEnv('VITE_API_BASE', ''); vi.resetModules()
    expect((await import('./http')).API_BASE).toBe('http://localhost:8080')
    vi.stubEnv('VITE_API_BASE', 'https://api.example.test'); vi.resetModules()
    expect((await import('./http')).API_BASE).toBe('https://api.example.test')
  })
})
