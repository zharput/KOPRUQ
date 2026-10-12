import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'
import { ApiError, formatApiError, type FieldError } from './http'

/**
 * Puts backend `errors[]` entries whose `field` is a known top-level form field onto that field (react-hook-form `setError`).
 * Returns the entries that could not be matched, so the caller can show them as a list.
 */
export function applyApiFieldErrors<T extends FieldValues>(error: unknown, setError: UseFormSetError<T>, knownFields: readonly string[]): FieldError[] {
  if (!(error instanceof ApiError)) return []
  const unmatched: FieldError[] = []
  for (const item of error.fieldErrors) {
    if (knownFields.includes(item.field)) setError(item.field as Path<T>, { type: 'server', message: item.message })
    else unmatched.push(item)
  }
  return unmatched
}

/** Message for a failed request: backend message plus reference, or a hint that the backend may be down for network failures. */
export function requestErrorMessage(error: unknown): string {
  return error instanceof ApiError ? formatApiError(error) : error instanceof Error ? `${error.message} - is the backend running?` : 'Unknown error'
}
