import type { APIResponse, Response } from '@playwright/test'

/** X-Correlation-ID header of a response (exposed by the backend CORS configuration), or null. */
export function correlationIdOf(response: Response | APIResponse): string | null {
  return response.headers()['x-correlation-id'] ?? null
}

/** Parsed JSON body of a response typed by the caller (the e2e only reads fields it asserts). */
export async function jsonOf<T = Record<string, unknown>>(response: Response | APIResponse): Promise<T> {
  return (await response.json()) as T
}
