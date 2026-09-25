/**
 * One-time compatibility bridge for users upgrading from the former product
 * namespace. New code only reads/writes `kopruq.*`; legacy keys are retained
 * as explicit constants so existing project data remains readable.
 */
const LEGACY_STORAGE_PREFIX = 'spanova.'
const CURRENT_STORAGE_PREFIX = 'kopruq.'

export function migrateLegacyStorage(): void {
  if (typeof window === 'undefined') return
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index)
    if (!key?.startsWith(LEGACY_STORAGE_PREFIX)) continue
    const nextKey = `${CURRENT_STORAGE_PREFIX}${key.slice(LEGACY_STORAGE_PREFIX.length)}`
    if (localStorage.getItem(nextKey) === null) {
      const value = localStorage.getItem(key)
      if (value !== null) localStorage.setItem(nextKey, value)
    }
  }
}
