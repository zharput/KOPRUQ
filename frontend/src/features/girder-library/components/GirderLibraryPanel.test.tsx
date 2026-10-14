import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import GirderLibraryPanel from './GirderLibraryPanel'
import { PRECAST_DIMENSIONS } from '../model/variants'
import { savePrecastGirderDefinition } from '../../family-registry/model/familyRepository'
import { activeWriteQueue } from '../../../shared/project-store/activeProject'
import { NEW_PROJECT_DOCUMENT_JSON } from '../../../app/project-session/projectDocumentFixtures'
import { createFakeProjectApi, type FakeProjectApi } from '../../../test/fakeProjectApi'
import { flushProjectWrites, installFakeProjectApi, openTestProject, putRequests } from '../../../test/projectSessionTestUtils'
import { resetProjectData } from '../../../test/projectStoreTestUtils'

let fake: FakeProjectApi
beforeEach(() => { fake = installFakeProjectApi(createFakeProjectApi()); openTestProject(NEW_PROJECT_DOCUMENT_JSON, fake) })
afterEach(() => { cleanup(); resetProjectData() })

describe('girder library', () => {
  it('shows discarded dimensions and does not send them with a later edit', async () => {
    savePrecastGirderDefinition({ enabled: true, dimensions: PRECAST_DIMENSIONS })
    await flushProjectWrites()
    render(<GirderLibraryPanel />)
    const before = putRequests(fake, 'girder-library').length

    fireEvent.change(screen.getByRole('spinbutton', { name: 'H (cm) Min' }), { target: { value: '170' } })
    await act(async () => { activeWriteQueue.discard() })
    expect(screen.getByRole('spinbutton', { name: 'H (cm) Min' })).toHaveValue(160)
    await flushProjectWrites()
    expect(putRequests(fake, 'girder-library')).toHaveLength(before)

    fireEvent.change(screen.getByRole('spinbutton', { name: 'tf (cm) Min' }), { target: { value: '130' } })
    await flushProjectWrites()
    expect(putRequests(fake, 'girder-library')).toHaveLength(before + 1)
    const value = putRequests(fake, 'girder-library').at(-1)?.body as { value: { dimensions: { key: string; min: number }[] } }
    expect(value.value.dimensions.find((dimension) => dimension.key === 'H')?.min).toBe(160)
    expect(value.value.dimensions.find((dimension) => dimension.key === 'tf')?.min).toBe(130)
  })
})
