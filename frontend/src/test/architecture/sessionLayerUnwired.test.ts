import { describe, expect, it } from 'vitest'

/**
 * The project session layer of BACKEND-DB-PERSISTENCE M5b exists but is deliberately NOT wired into the application yet (D1):
 * no production file outside the layer itself may import one of its modules. M5c wires it and deletes this test.
 * A listed module that no longer exists fails too (stale entry). Only production files are checked; comments are ignored.
 */
export const NEW_SESSION_MODULES: readonly string[] = [
  '/src/shared/project-store/activeProject',
  '/src/shared/project-store/useSaveStatus',
  '/src/features/project/model/projectWorkspaceServerSection',
  '/src/features/bridge-definition/model/bridgeDefinitionServerSection',
  '/src/features/family-registry/model/familyServerSections',
  '/src/features/preferred-span/model/preferredSpanServerSection',
  '/src/features/superstructure-families/model/crossSectionServerSection',
  '/src/features/loads/model/loadsServerSections',
  '/src/features/graph/state/graphServerCollection',
  '/src/app/project-session/projectSections',
  '/src/app/project-session/useProjectSessionController',
  '/src/app/project-session/useProjectList',
  '/src/app/project-session/projectDisplay',
  '/src/app/project-session/saveStatusText',
  '/src/app/project-session/ProjectListDialog',
  '/src/app/project-session/NewProjectDialog',
  '/src/app/project-session/SaveStatusIndicator',
  '/src/app/project-session/ProjectLoadScreen',
]

const sources = import.meta.glob('/src/**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

// Copied from layerRules.test.ts (importing that file would register its tests twice).
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
  return SPECIFIER_PATTERNS.flatMap((pattern) => Array.from(code.matchAll(pattern), (match) => match[1]))
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
const withoutExtension = (path: string) => path.replace(/\.(ts|tsx)$/, '')
const isProduction = (path: string) => !/\.test\.(ts|tsx)$/.test(path) && !path.startsWith('/src/test/')

/** Production files outside the layer that import a layer module, as `file -> module`. */
export function findUnwiredViolations(files: Record<string, string>, modules: readonly string[]): string[] {
  const layer = new Set(modules)
  const found: string[] = []
  for (const [path, text] of Object.entries(files)) {
    if (!isProduction(path) || layer.has(withoutExtension(path))) continue
    for (const specifier of importSpecifiers(text)) {
      if (!specifier.startsWith('.')) continue
      const target = withoutExtension(resolveRelative(path, specifier))
      if (layer.has(target)) found.push(`${path} -> ${target}`)
    }
  }
  return found.sort()
}

describe('session layer is not wired into the application (M5b)', () => {
  it('has no production importer outside the layer', () => {
    expect(findUnwiredViolations(sources, NEW_SESSION_MODULES)).toEqual([])
  })

  it('lists only modules that exist', () => {
    const present = new Set(Object.keys(sources).map(withoutExtension))
    expect(NEW_SESSION_MODULES.filter((module) => !present.has(module))).toEqual([])
  })

  it('detects an importer outside the layer and ignores tests, comments and the layer itself', () => {
    const modules = ['/src/shared/x/a', '/src/shared/x/b']
    expect(findUnwiredViolations({
      '/src/app/App.tsx': "import { a } from '../shared/x/a'",
      '/src/app/Other.tsx': "// import { a } from '../shared/x/a'\nconst z = 1",
      '/src/app/App.test.tsx': "import { a } from '../shared/x/a'",
      '/src/test/util.ts': "import { a } from '../shared/x/a'",
      '/src/shared/x/b.ts': "import { a } from './a'",
      '/src/features/f/F.tsx': "import type { A } from '../../shared/x/b.ts'",
    }, modules)).toEqual(['/src/app/App.tsx -> /src/shared/x/a', '/src/features/f/F.tsx -> /src/shared/x/b'])
  })
})
