import { describe, expect, it } from 'vitest'

/**
 * Frontend layer rules, enforced by test (G4 / A-08).
 *
 * Layers: app | pages | features/<name> | shared | test.
 *   R1  shared/**                      must not import app/, pages/ or features/
 *   R2  features/**                    must not import app/ or pages/
 *   R4  features/<x>/model/** and features/graph/domain/** must not import shared/ui/**
 *   R3  features importing another feature below its barrel (index) is only COUNTED, not enforced.
 *
 * Only production files are checked (`*.test.*` and `src/test/**` are exempt).
 * Known violations live in ALLOWED_VIOLATIONS; an unlisted violation fails the
 * test and so does a stale entry. The list is a ratchet: it may only shrink.
 */
export type Violation = { rule: 'R1' | 'R2' | 'R4'; from: string; to: string }

/**
 * shared/project-file is the project persistence layer. It composes the stores
 * and schemas of several features and therefore still points "upward" at them.
 * Splitting it is a separate feature (g5); until then these edges are accepted.
 */
export const ALLOWED_VIOLATIONS: readonly Violation[] = [
  { rule: 'R1', from: 'shared/project-file/projectDataContract.ts', to: 'features/bridge-definition/model/schema' },
  { rule: 'R1', from: 'shared/project-file/projectDataContract.ts', to: 'features/family-registry/model/familyRepository' },
  { rule: 'R1', from: 'shared/project-file/projectDataContract.ts', to: 'features/family-registry/model/familySchemas' },
  { rule: 'R1', from: 'shared/project-file/projectDataContract.ts', to: 'features/graph/state/graphStore' },
  { rule: 'R1', from: 'shared/project-file/projectDataContract.ts', to: 'features/project/model/projectStateSchema' },
  { rule: 'R1', from: 'shared/project-file/projectFileFixtures.ts', to: 'features/bridge-definition/model/store' },
  { rule: 'R1', from: 'shared/project-file/projectFileFixtures.ts', to: 'features/graph/state/graphStore' },
  { rule: 'R1', from: 'shared/project-file/projectFileFixtures.ts', to: 'features/project/model/projectWorkspace' },
  { rule: 'R1', from: 'shared/project-file/projectFileFixtures.ts', to: 'features/project/model/types' },
  { rule: 'R1', from: 'shared/project-file/projectFileService.ts', to: 'features/bridge-definition/model/store' },
  { rule: 'R1', from: 'shared/project-file/projectFileService.ts', to: 'features/bridge-definition/model/types' },
  { rule: 'R1', from: 'shared/project-file/projectFileService.ts', to: 'features/graph/state/graphStore' },
  { rule: 'R1', from: 'shared/project-file/projectFileService.ts', to: 'features/project/model/projectWorkspace' },
  { rule: 'R1', from: 'shared/project-file/projectFileTypes.ts', to: 'features/bridge-definition/model/types' },
  { rule: 'R1', from: 'shared/project-file/projectFileTypes.ts', to: 'features/graph/state/graphStore' },
  { rule: 'R1', from: 'shared/project-file/projectFileTypes.ts', to: 'features/project/model/projectWorkspace' },
  { rule: 'R1', from: 'shared/project-file/projectModules.ts', to: 'features/family-registry/model/familyRepository' },
  { rule: 'R1', from: 'shared/project-file/projectModules.ts', to: 'features/loads/api/trafficLoadsService' },
  { rule: 'R1', from: 'shared/project-file/projectModules.ts', to: 'features/preferred-span/model/types' },
  { rule: 'R1', from: 'shared/project-file/useProjectFile.ts', to: 'features/bridge-definition/model/types' },
  { rule: 'R1', from: 'shared/project-file/useProjectFile.ts', to: 'features/graph/family/familySnapshotStore' },
  { rule: 'R1', from: 'shared/project-file/useProjectFile.ts', to: 'features/graph/family/graphRunValidity' },
  { rule: 'R1', from: 'shared/project-file/useProjectFile.ts', to: 'features/project/model/projectWorkspace' },
]

const sources = import.meta.glob('/src/**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

function stripComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:'"`\w])\/\/.*$/gm, '$1')
}

const NAMED = String.raw`(?:\{[^}]*\}|\*(?:\s+as\s+\w+)?|\w+(?:\s*,\s*(?:\{[^}]*\}|\*\s+as\s+\w+))?)`
const SPECIFIER_PATTERNS = [
  new RegExp(String.raw`\b(?:import|export)\s+(?:type\s+)?${NAMED}\s+from\s+['"]([^'"]+)['"]`, 'g'),
  new RegExp(String.raw`\bimport\s+['"]([^'"]+)['"]`, 'g'),
  new RegExp(String.raw`\bimport\(\s*['"]([^'"]+)['"]\s*\)`, 'g'),
]

export function importSpecifiers(text: string): string[] {
  const code = stripComments(text)
  return SPECIFIER_PATTERNS.flatMap(pattern => Array.from(code.matchAll(pattern), match => match[1]))
}

function resolveRelative(fromFile: string, specifier: string): string {
  const parts = fromFile.split('/').slice(0, -1)
  for (const segment of specifier.split('/')) {
    if (segment === '.' || segment === '') continue
    if (segment === '..') parts.pop()
    else parts.push(segment)
  }
  return parts.join('/')
}

function layerOf(path: string): string {
  const [first, second] = path.split('/')
  return first === 'features' ? `features/${second}` : first
}

const isProduction = (path: string) => !/\.test\.(ts|tsx)$/.test(path) && !path.startsWith('test/')

/** Analyses `/src/...` keyed sources and returns violations (R1, R2, R4) plus the R3 count. */
export function analyze(files: Record<string, string>): { violations: Violation[]; r3: number } {
  const violations: Violation[] = []
  let r3 = 0
  for (const [key, text] of Object.entries(files)) {
    const from = key.replace(/^\/src\//, '')
    if (!isProduction(from)) continue
    const layer = layerOf(from)
    for (const specifier of importSpecifiers(text)) {
      if (!specifier.startsWith('.')) continue
      const to = resolveRelative(from, specifier)
      const target = layerOf(to)
      if (layer === 'shared' && (target.startsWith('features/') || target === 'app' || target === 'pages')) violations.push({ rule: 'R1', from, to })
      if (layer.startsWith('features/') && (target === 'app' || target === 'pages')) violations.push({ rule: 'R2', from, to })
      if ((/^features\/[^/]+\/model\//.test(from) || from.startsWith('features/graph/domain/')) && to.startsWith('shared/ui')) violations.push({ rule: 'R4', from, to })
      if (layer.startsWith('features/') && target.startsWith('features/') && layer !== target && to.split('/').length > 2 && to.split('/')[2] !== 'index') r3++
    }
  }
  return { violations, r3 }
}

const keyOf = (violation: Violation) => `${violation.rule} ${violation.from} -> ${violation.to}`

describe('import parser', () => {
  it('finds static, multi-line, re-export, side-effect, type and dynamic imports and ignores comments', () => {
    const text = [
      "import a from './a'",
      "import { b,\n  c } from '../b'",
      "import type { D } from './d'",
      "export { e } from './e'",
      "export * from './f'",
      "import './g.css'",
      "const h = import('./h')",
      "type T = import('../i').X",
      "// import x from './commented'",
      "/* import y from './blockcommented' */",
    ].join('\n')
    expect(importSpecifiers(text).sort()).toEqual(['../b', '../i', './a', './d', './e', './f', './g.css', './h'])
  })
})

describe('analyze', () => {
  const run = (files: Record<string, string>) => analyze(files).violations.map(keyOf)
  it('flags R1, R2 and R4 and exempts tests', () => {
    expect(run({
      '/src/shared/lib/x.ts': "import { a } from '../../features/foo/model/a'",
      '/src/features/foo/components/P.tsx': "import L from '../../../app/layout/L'",
      '/src/features/foo/model/m.ts': "import { g } from '../../../shared/ui/G'",
      '/src/features/graph/domain/d.ts': "import { g } from '../../../shared/ui/G'",
      '/src/features/foo/model/m.test.ts': "import { g } from '../../../shared/ui/G'",
      '/src/shared/lib/y.ts': "import { g } from '../ui/G'",
    })).toEqual([
      'R1 shared/lib/x.ts -> features/foo/model/a',
      'R2 features/foo/components/P.tsx -> app/layout/L',
      'R4 features/foo/model/m.ts -> shared/ui/G',
      'R4 features/graph/domain/d.ts -> shared/ui/G',
    ])
  })
  it('counts only cross-feature imports that bypass the barrel (R3)', () => {
    expect(analyze({
      '/src/features/a/x.ts': "import { b } from '../b'\nimport { c } from '../c/model/c'\nimport { d } from '../d/index'",
    }).r3).toBe(1)
  })
})

describe('frontend layer rules (A-08)', () => {
  const { violations, r3 } = analyze(sources)
  const found = violations.map(keyOf).sort()
  const allowed = ALLOWED_VIOLATIONS.map(keyOf).sort()

  it('scans the real source tree', () => {
    expect(Object.keys(sources).length).toBeGreaterThan(200)
  })

  it('has no layer violation outside the allow-list (R1, R2, R4)', () => {
    expect(found.filter(entry => !allowed.includes(entry))).toEqual([])
  })

  it('has no stale allow-list entry (the list may only shrink)', () => {
    expect(allowed.filter(entry => !found.includes(entry))).toEqual([])
  })

  it('only tolerates shared/project-file -> features edges (g5 will split project-file)', () => {
    for (const entry of ALLOWED_VIOLATIONS) {
      expect(entry.rule).toBe('R1')
      expect(entry.from.startsWith('shared/project-file/')).toBe(true)
      expect(entry.to.startsWith('features/')).toBe(true)
    }
  })

  it('reports (does not enforce) the R3 barrel-bypass count', () => {
    console.info(`[layer rules] R3 cross-feature imports below the barrel (not enforced): ${r3}`)
    expect(r3).toBeGreaterThanOrEqual(0)
  })
})
