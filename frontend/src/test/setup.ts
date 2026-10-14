import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import { createFakeProjectApi } from './fakeProjectApi'
import { installFakeProjectApi, openTestProject, resetActiveProject } from './projectSessionTestUtils'
import { NEW_PROJECT_DOCUMENT_JSON } from '../app/project-session/projectDocumentFixtures'

// Without `test.globals: true` in vite.config.ts, @testing-library/react's
// automatic afterEach(cleanup) never registers, so every test's rendered
// tree stays mounted into the next test's jsdom document (this is what
// made the App routing test see 2 copies of the sidebar). Registering it
// explicitly here works regardless of the globals setting.
//
// Every test starts with an open, empty project backed by an in-memory fake API (BACKEND-DB-PERSISTENCE M5c): the data stores
// are server sections and only work inside a project. Tests that need no open project call `resetActiveProject()` themselves.
beforeEach(() => {
  const fake = installFakeProjectApi(createFakeProjectApi())
  openTestProject(NEW_PROJECT_DOCUMENT_JSON, fake)
})

afterEach(() => {
  cleanup()
  resetActiveProject()
})
