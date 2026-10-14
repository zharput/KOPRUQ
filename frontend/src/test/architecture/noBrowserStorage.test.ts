import { describe, expect, it } from 'vitest'

/**
 * Browser-storage ratchet (BACKEND-DB-PERSISTENCE M5a, completed by M5c).
 *
 * Project data lives on the backend (server sections, see src/shared/project-store). Production code must not touch browser
 * storage, the File System Access API or the cross-tab `storage` event at all: both allow-lists are empty since M5c and a new
 * use anywhere fails this test. The lists remain so that a deliberate exception would have to be named (and, being listed, must
 * match, otherwise it is reported as stale). Only production files are checked (`*.test.*` and `src/test/**` are exempt). Comments are ignored.
 */
export const ALLOWED_FILES: readonly string[] = []

/** Components that only listen for the cross-tab `storage` event (none since M5c). */
export const STORAGE_LISTENER_ONLY_FILES: readonly string[] = []

const SYMBOL = 'browser storage symbol'
const STORAGE_LITERAL = "'storage' literal"
const RULES: readonly { name: string; pattern: RegExp }[] = [
  { name: SYMBOL, pattern: /\b(?:localStorage|sessionStorage|indexedDB|IDBDatabase|showOpenFilePicker|showSaveFilePicker|showDirectoryPicker|FileSystemHandle|FileSystemFileHandle|FileSystemDirectoryHandle|StorageEvent|caches|document\s*(?:\?\.|\.)\s*cookie|navigator\s*(?:\?\.|\.)\s*storage)\b/ },
  { name: STORAGE_LITERAL, pattern: /(['"`])storage\1/ },
]

const sources = import.meta.glob('/src/**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

// Same comment stripper as layerRules.test.ts (copied: importing that file would register its tests twice).
function stripComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:'"`\w])\/\/.*$/gm, '$1')
}

const isProduction = (path: string) => !/\.test\.(ts|tsx)$/.test(path) && !path.startsWith('/src/test/')

/** Production files (keyed `/src/...`) that match a rule, mapped to the names of the rules they match. */
export function findBrowserStorageUses(files: Record<string, string>): Record<string, string[]> {
  const found: Record<string, string[]> = {}
  for (const [path, text] of Object.entries(files)) {
    if (!isProduction(path)) continue
    const code = stripComments(text)
    const matched = RULES.filter((rule) => rule.pattern.test(code)).map((rule) => rule.name)
    if (matched.length) found[path] = matched
  }
  return found
}

export function diffAllowList(found: Record<string, string[]>, allowed: readonly string[]): { unexpected: string[]; stale: string[] } {
  const allowedSet = new Set(allowed)
  return {
    unexpected: Object.keys(found).filter((path) => !allowedSet.has(path)).sort(),
    stale: allowed.filter((path) => !(path in found)).sort(),
  }
}

describe('browser storage ratchet', () => {
  const found = findBrowserStorageUses(sources)

  it('scans the real source tree', () => {
    expect(Object.keys(sources).length).toBeGreaterThan(200)
  })

  it('finds no browser-storage use outside the allow-list', () => {
    expect(diffAllowList(found, ALLOWED_FILES).unexpected).toEqual([])
  })

  it('has no stale allow-list entry', () => {
    expect(diffAllowList(found, ALLOWED_FILES).stale).toEqual([])
  })

  it('keeps the allow-list sorted and free of duplicates', () => {
    expect([...ALLOWED_FILES]).toEqual([...new Set(ALLOWED_FILES)].sort())
  })

  it('has no listener-only exception and no allowed file left', () => {
    expect(ALLOWED_FILES).toEqual([])
    expect(STORAGE_LISTENER_ONLY_FILES).toEqual([])
    expect(found).toEqual({})
  })

  it('keeps the listener-only components to the storage-event literal when a deliberate exception is named', () => {
    for (const path of STORAGE_LISTENER_ONLY_FILES) expect({ path, rules: found[path] }).toEqual({ path, rules: [STORAGE_LITERAL] })
  })
})

describe('retired project file format', () => {
  const production = Object.entries(sources).filter(([path]) => isProduction(path)).map(([path, text]) => [path, stripComments(text)] as const)

  it('leaves no .kopruq file extension in production code', () => {
    expect(production.filter(([, code]) => /\.kopruq(?![-\w])/.test(code)).map(([path]) => path)).toEqual([])
  })

  it('leaves no kopruq.* browser-storage key literal in production code', () => {
    expect(production.filter(([, code]) => /(['"`])kopruq\.[\w-]/.test(code)).map(([path]) => path)).toEqual([])
  })
})

describe('browser storage ratchet rules', () => {
  const uses = (text: string, path = '/src/features/x/y.ts') => findBrowserStorageUses({ [path]: text })[path] ?? []

  it.each(['localStorage', 'sessionStorage', 'indexedDB', 'IDBDatabase', 'showOpenFilePicker', 'showSaveFilePicker', 'showDirectoryPicker', 'FileSystemHandle', 'FileSystemFileHandle', 'FileSystemDirectoryHandle', 'StorageEvent', 'caches'])('catches %s', (symbol) => {
    expect(uses(`const a = ${symbol}.x`)).toEqual([SYMBOL])
  })

  it.each(['document.cookie', 'document?.cookie', 'navigator.storage', 'navigator?.storage'])('catches %s', (access) => {
    expect(uses(`const a = ${access}`)).toEqual([SYMBOL])
  })

  it('catches a symbol on a minified single line', () => {
    expect(uses("const a=1;function f(){return localStorage.getItem('k')};export{f}")).toEqual([SYMBOL])
  })

  it('catches the storage literal in any quote style, also inside an array literal', () => {
    expect(uses("window.addEventListener('storage', f)")).toEqual([STORAGE_LITERAL])
    expect(uses('window.addEventListener("storage", f)')).toEqual([STORAGE_LITERAL])
    expect(uses('window.addEventListener(`storage`, f)')).toEqual([STORAGE_LITERAL])
    expect(uses("const events = ['storage', 'kopruq:pier-catalog-changed']")).toEqual([STORAGE_LITERAL])
  })

  it('does not catch look-alikes', () => {
    expect(uses("const k = familyStorageKey('PIER')")).toEqual([])
    expect(uses("const k = 'kopruq.storage'")).toEqual([])
    expect(uses('const a = localStorageKey')).toEqual([])
    expect(uses('const a = mycaches')).toEqual([])
    expect(uses('const a = document.cookieJar')).toEqual([])
    expect(uses('const a = navigator.storageKey')).toEqual([])
  })

  it('ignores line and block comments', () => {
    expect(uses('// reads localStorage here\nconst a = 1')).toEqual([])
    expect(uses("/* uses 'storage' and sessionStorage */\nconst a = 1")).toEqual([])
  })

  it('exempts test files and src/test', () => {
    expect(findBrowserStorageUses({ '/src/features/x/y.test.ts': 'localStorage.clear()', '/src/features/x/y.test.tsx': 'localStorage.clear()', '/src/test/helper.ts': 'localStorage.clear()' })).toEqual({})
  })

  it('reports an unlisted file as unexpected and an unmatched listed file as stale', () => {
    const found = findBrowserStorageUses({ '/src/a.ts': 'localStorage.x', '/src/b.ts': 'const b = 1' })
    expect(diffAllowList(found, ['/src/b.ts'])).toEqual({ unexpected: ['/src/a.ts'], stale: ['/src/b.ts'] })
    expect(diffAllowList(found, ['/src/a.ts'])).toEqual({ unexpected: [], stale: [] })
  })
})
