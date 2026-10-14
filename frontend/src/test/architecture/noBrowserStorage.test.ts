import { describe, expect, it } from 'vitest'

/**
 * Browser-storage ratchet (BACKEND-DB-PERSISTENCE M5a).
 *
 * Project data is moving from the browser to the backend. Until then only the files in ALLOWED_FILES may touch browser
 * storage or react to the cross-tab `storage` event. A new use elsewhere fails this test, and so does a stale entry
 * (a listed file that no longer matches), so the list can only shrink. Only production files are checked
 * (`*.test.*` and `src/test/**` are exempt). Comments are ignored.
 */
export const ALLOWED_FILES: readonly string[] = [
  '/src/app/App.tsx',
  '/src/app/project-file/projectDataContract.ts',
  '/src/app/project-file/projectFileService.ts',
  '/src/app/project-file/recentProjects.ts',
  '/src/features/bridge-definition/components/BridgeDefinitionWorkspace.tsx',
  '/src/features/bridge-definition/model/store.ts',
  '/src/features/family-registry/hooks/useFamilyCatalog.ts',
  '/src/features/family-registry/model/familyRepository.ts',
  '/src/features/graph/family/graphRunValidity.ts',
  '/src/features/graph/state/graphStore.ts',
  '/src/features/graph/state/graphViewPreferences.ts',
  '/src/features/preferred-span/components/PreferredSpanPanel.tsx',
  '/src/features/project/model/projectWorkspace.ts',
  '/src/features/system-assembly/components/SystemAssemblyPanel.tsx',
  '/src/shared/persistence/legacyStorageMigration.ts',
  '/src/shared/project-file/projectModuleStore.ts',
  '/src/shared/project-file/useProjectModule.ts',
]

/** Components that only listen for the cross-tab `storage` event (their reads already go through owner functions). */
export const STORAGE_LISTENER_ONLY_FILES: readonly string[] = [
  '/src/features/bridge-definition/components/BridgeDefinitionWorkspace.tsx',
  '/src/features/preferred-span/components/PreferredSpanPanel.tsx',
  '/src/features/system-assembly/components/SystemAssemblyPanel.tsx',
]

const SYMBOL = 'browser storage symbol'
const STORAGE_LITERAL = "'storage' literal"
const RULES: readonly { name: string; pattern: RegExp }[] = [
  { name: SYMBOL, pattern: /\b(localStorage|sessionStorage|indexedDB|IDBDatabase|showOpenFilePicker|showSaveFilePicker|FileSystemFileHandle|StorageEvent)\b/ },
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

  it('lets the three listener-only components match only the storage-event literal', () => {
    for (const path of STORAGE_LISTENER_ONLY_FILES) expect({ path, rules: found[path] }).toEqual({ path, rules: [STORAGE_LITERAL] })
  })
})

describe('browser storage ratchet rules', () => {
  const uses = (text: string, path = '/src/features/x/y.ts') => findBrowserStorageUses({ [path]: text })[path] ?? []

  it.each(['localStorage', 'sessionStorage', 'indexedDB', 'IDBDatabase', 'showOpenFilePicker', 'showSaveFilePicker', 'FileSystemFileHandle', 'StorageEvent'])('catches %s', (symbol) => {
    expect(uses(`const a = ${symbol}.x`)).toEqual([SYMBOL])
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
