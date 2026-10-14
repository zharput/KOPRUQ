import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { activeSections } from '../../shared/project-store/activeProject'
import { GRAPH_SERVER_COLLECTION } from '../../features/graph/state/graphServerCollection'
import { WORKSPACE_SERVER_SECTION } from '../../features/project/model/projectWorkspaceServerSection'
import { createFakeProjectApi } from '../../test/fakeProjectApi'
import { installFakeProjectApi, resetActiveProject } from '../../test/projectSessionTestUtils'
import { GRAPH_COLLECTION_DEFINITION, PROJECT_SECTION_DEFINITIONS } from './projectDocument'
import './projectSections'

// The global test setup opens a project; this suite exercises the session layer from a closed one.
beforeEach(() => resetActiveProject())
afterEach(resetActiveProject)

describe('server section instances', () => {
  it('registers the 16 sections and the graph collection once with their expected paths', () => {
    const entries = activeSections()
    expect(entries).toHaveLength(17)
    expect(new Set(entries.map((entry) => entry.id)).size).toBe(17)
    expect(entries.map((entry) => entry.id).sort()).toEqual([...PROJECT_SECTION_DEFINITIONS.map((definition) => definition.id), GRAPH_COLLECTION_DEFINITION.id].sort())
    for (const definition of PROJECT_SECTION_DEFINITIONS) {
      expect(entries.find((entry) => entry.id === definition.id)).toMatchObject({ kind: 'section', path: definition.path })
    }
    expect(entries.find((entry) => entry.id === GRAPH_COLLECTION_DEFINITION.id)?.kind).toBe('collection')
  })

  it('does not write without an open project and sends no request', () => {
    const fake = installFakeProjectApi(createFakeProjectApi())
    expect(WORKSPACE_SERVER_SECTION.write(undefined)).toBe(false)
    expect(GRAPH_SERVER_COLLECTION.write([])).toBe(false)
    expect(fake.requests).toEqual([])
  })
})
