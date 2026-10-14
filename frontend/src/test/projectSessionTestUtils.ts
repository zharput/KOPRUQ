import { loadProjectDocument } from '../app/project-session/projectDocument'
import { NEW_PROJECT_DOCUMENT_JSON } from '../app/project-session/projectDocumentFixtures'
import { applyPreparedProject, closeActiveProject, prepareLoadedProject, type PreparedProject } from '../app/project-session/projectSections'
import { activeWriteQueue, setActiveProjectApi } from '../shared/project-store/activeProject'
import { projectApi } from '../shared/project-store/projectApi'
import { createFakeProjectApi, type FakeProjectApi } from './fakeProjectApi'

/** Makes the fake the API of the active project (queue PUTs and session layer). Returns the fake. */
export function installFakeProjectApi(fake: FakeProjectApi = createFakeProjectApi()): FakeProjectApi {
  setActiveProjectApi(fake)
  return fake
}

/** Seeds `documentJson` into `fake` (when given) and opens it exactly like the session layer does: load, prepare, apply. */
export function openTestProject(documentJson: unknown = NEW_PROJECT_DOCUMENT_JSON, fake?: FakeProjectApi): PreparedProject {
  fake?.seed(documentJson)
  const prepared = prepareLoadedProject(loadProjectDocument(documentJson))
  applyPreparedProject(prepared)
  return prepared
}

export function closeTestProject(): void { closeActiveProject() }

/** For `afterEach`: drops queued writes, closes the project and restores the real API. */
export function resetActiveProject(): void {
  activeWriteQueue.reset()
  closeActiveProject()
  setActiveProjectApi(projectApi)
}

export function flushProjectWrites(): Promise<void> { return activeWriteQueue.flush() }
