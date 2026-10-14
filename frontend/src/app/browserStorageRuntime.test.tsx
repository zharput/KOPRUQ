import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { CANONICAL_PROJECT_DOCUMENT_JSON } from './project-session/projectDocumentFixtures'
import { activeProjectSession } from '../shared/project-store/activeProject'
import { createFakeProjectApi } from '../test/fakeProjectApi'
import { flushProjectWrites, installFakeProjectApi, resetActiveProject } from '../test/projectSessionTestUtils'

/**
 * Runtime proof next to the source ratchet (noBrowserStorage.test.ts): a complete session (New, edit, Open, Exit) touches neither
 * localStorage, sessionStorage nor IndexedDB (BACKEND-DB-PERSISTENCE M5c).
 */
beforeEach(() => {
  resetActiveProject()
  localStorage.clear(); sessionStorage.clear()
})
afterEach(() => { cleanup(); resetActiveProject(); vi.restoreAllMocks(); vi.unstubAllGlobals() })

describe('browser storage at runtime', () => {
  it('stays untouched through New, an edit, Open and Exit', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    const getItem = vi.spyOn(Storage.prototype, 'getItem')
    const removeItem = vi.spyOn(Storage.prototype, 'removeItem')
    const clear = vi.spyOn(Storage.prototype, 'clear')
    const indexedDbOpen = vi.fn()
    vi.stubGlobal('indexedDB', { open: indexedDbOpen })
    const fake = installFakeProjectApi(createFakeProjectApi())
    fake.seed({ ...CANONICAL_PROJECT_DOCUMENT_JSON, projectId: '0b0b0b0b-0000-4000-8000-00000000000b' })
    window.history.replaceState({}, '', '/')
    const user = userEvent.setup()
    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'New Project' }))
    await user.type(screen.getByLabelText('Proje adı'), 'Runtime')
    await user.click(screen.getByRole('button', { name: 'Oluştur' }))
    const properties = within(await screen.findByRole('complementary', { name: 'Project Properties' }))
    await user.click(properties.getByRole('button', { name: 'Edit Project' }))
    await user.type(properties.getByLabelText('Project Name'), ' edited')
    await user.click(properties.getByRole('button', { name: 'Save' }))
    await flushProjectWrites()

    const nav = within(document.querySelector('.spn-workspace-nav') as HTMLElement)
    await user.click(nav.getByRole('button', { name: /^File/ }))
    await user.click(nav.getByRole('button', { name: 'Open...' }))
    await user.click(await screen.findByRole('button', { name: /Corridor 7/ }))
    await waitFor(() => expect(activeProjectSession.getSnapshot().projectId).toBe('0b0b0b0b-0000-4000-8000-00000000000b'))

    await user.click(nav.getByRole('button', { name: /^File/ }))
    await user.click(nav.getByRole('button', { name: '× Exit' }))
    expect(await screen.findByRole('main', { name: 'KOPRUQ Welcome' })).toBeInTheDocument()

    expect(localStorage.length).toBe(0)
    expect(sessionStorage.length).toBe(0)
    expect(setItem).not.toHaveBeenCalled()
    expect(getItem).not.toHaveBeenCalled()
    expect(removeItem).not.toHaveBeenCalled()
    expect(clear).not.toHaveBeenCalled()
    expect(indexedDbOpen).not.toHaveBeenCalled()
  })
})
