import { describe, expect, it } from 'vitest'

/**
 * Source-encoding regression guard (G4 / A-15).
 *
 * UTF-8 text that was once decoded as cp1252 shows up as sequences such as
 * "A-circumflex + middle dot" instead of the intended "middle dot". The
 * markers are built from code points here so this file does not itself
 * contain a corrupted sequence.
 */
const MARKERS: ReadonlyArray<{ name: string; value: string }> = [
  { name: 'U+00C2 (A circumflex)', value: '\u00c2' },
  { name: 'U+00E2 U+20AC (a circumflex + euro sign)', value: '\u00e2\u20ac' },
  { name: 'U+00C3 U+00A2 (double-encoded)', value: '\u00c3\u00a2' },
  { name: 'U+00C4 U+00B1 (dotless i)', value: '\u00c4\u00b1' },
  { name: 'U+FFFD (replacement character)', value: '\ufffd' },
]

/**
 * Files that intentionally contain corrupted spellings: legacy unit labels
 * that were persisted in that form and must still be recognised when
 * migrating saved projects (`normalizeUnitId`). Changing them would break
 * persistence compatibility.
 */
export const ALLOWED_FILES: readonly string[] = [
  '/src/features/project/model/projectWorkspace.ts',
  '/src/features/project/model/projectWorkspace.test.ts',
]

const sources = import.meta.glob('/src/**/*.{ts,tsx,css}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

export function findCorruptedSequences(files: Record<string, string>, allowed: readonly string[] = ALLOWED_FILES): string[] {
  const hits: string[] = []
  for (const [path, text] of Object.entries(files)) {
    if (allowed.includes(path)) continue
    for (const marker of MARKERS) {
      if (text.includes(marker.value)) hits.push(`${path}: ${marker.name}`)
    }
  }
  return hits.sort()
}

/** Allow-list entries whose file is gone or no longer contains any legacy marker. */
export function findStaleAllowEntries(files: Record<string, string>, allowed: readonly string[] = ALLOWED_FILES): string[] {
  const stale: string[] = []
  for (const path of allowed) {
    const text = files[path]
    if (text === undefined) stale.push(`${path}: allow-listed but file not found`)
    else if (!MARKERS.some((marker) => text.includes(marker.value))) {
      stale.push(`${path}: allow-listed but contains no legacy marker`)
    }
  }
  return stale.sort()
}

describe('source encoding', () => {
  it('reads the source tree through import.meta.glob ?raw', () => {
    expect(Object.keys(sources).length).toBeGreaterThan(100)
    expect(sources['/src/main.tsx']).toContain('react')
  })

  it('contains no cp1252-corrupted UTF-8 sequences outside the allow-list', () => {
    expect(findCorruptedSequences(sources)).toEqual([])
  })

  it('every allow-listed file still exists and still contains a legacy marker (no stale entries)', () => {
    expect(findStaleAllowEntries(sources)).toEqual([])
  })

  it('flags allow-list entries that are missing or have no marker left', () => {
    const files = {
      '/src/has-marker.ts': `const x = 'PLAN \u00c2\u00b7 A'`,
      '/src/clean.ts': "const x = 'PLAN · A'",
    }
    const allowed = ['/src/has-marker.ts', '/src/clean.ts', '/src/gone.ts']
    expect(findStaleAllowEntries(files, allowed)).toEqual([
      '/src/clean.ts: allow-listed but contains no legacy marker',
      '/src/gone.ts: allow-listed but file not found',
    ])
  })

  it('detects a corrupted sequence in a synthetic file', () => {
    const bad = { '/src/synthetic.ts': `const x = 'PLAN \u00c2\u00b7 A'` }
    expect(findCorruptedSequences(bad)).toEqual(['/src/synthetic.ts: U+00C2 (A circumflex)'])
    expect(findCorruptedSequences({ '/src/ok.ts': "const x = 'PLAN \u00b7 A'" })).toEqual([])
  })
})
