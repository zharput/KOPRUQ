import { z } from 'zod'

/**
 * Shared HTTP layer. Every backend call goes through here so the base URL and the
 * backend error contract (`ApiErrorResponse`: message, code, correlationId, errors[]) are handled in one place.
 * `VITE_API_BASE` overrides the default; an empty or missing value keeps the local default.
 */
const DEFAULT_API_BASE = 'http://localhost:8080'
export const API_BASE: string = (import.meta.env.VITE_API_BASE as string | undefined)?.trim() || DEFAULT_API_BASE

const apiErrorSchema = z.object({
  status: z.number().optional(),
  error: z.string().optional(),
  code: z.string().optional(),
  message: z.string().optional(),
  path: z.string().optional(),
  correlationId: z.string().nullish(),
  errors: z.array(z.object({ field: z.string(), message: z.string() })).optional(),
}).passthrough()

export type FieldError = { field: string; message: string }

export class ApiError extends Error {
  readonly status: number
  readonly code?: string
  readonly correlationId?: string
  readonly fieldErrors: FieldError[]
  readonly path?: string
  constructor(init: { status: number; message: string; code?: string; correlationId?: string; fieldErrors?: FieldError[]; path?: string }) {
    super(init.message)
    this.name = 'ApiError'
    this.status = init.status
    this.code = init.code
    this.correlationId = init.correlationId
    this.fieldErrors = init.fieldErrors ?? []
    this.path = init.path
  }
}

async function toApiError(response: Response): Promise<ApiError> {
  const headerCorrelationId = response.headers.get('X-Correlation-ID') ?? undefined
  let body: z.infer<typeof apiErrorSchema> | undefined
  try {
    const parsed = apiErrorSchema.safeParse(await response.json())
    if (parsed.success) body = parsed.data
  } catch { /* not JSON */ }
  return new ApiError({
    status: response.status,
    message: body?.message?.trim() ? body.message : `HTTP ${response.status}`,
    code: body?.code,
    correlationId: body?.correlationId || headerCorrelationId,
    fieldErrors: body?.errors ?? [],
    path: body?.path,
  })
}

async function send(path: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(`${API_BASE}${path}`, init)
  if (!response.ok) throw await toApiError(response)
  return response
}

export async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  return (await send(path, init)).json() as Promise<T>
}

export async function requestBinary(path: string, init?: RequestInit): Promise<ArrayBuffer> {
  return (await send(path, init)).arrayBuffer()
}

export function postJson<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  return requestJson<T>(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal })
}

export function postForm<T>(path: string, form: FormData, signal?: AbortSignal): Promise<T> {
  return requestJson<T>(path, { method: 'POST', body: form, signal })
}

/** User-facing text: the backend message plus the correlation id for support. */
export function formatApiError(error: unknown): string {
  if (error instanceof ApiError) return error.correlationId ? `${error.message} (Ref: ${error.correlationId})` : error.message
  if (error instanceof Error) return error.message
  return String(error)
}
