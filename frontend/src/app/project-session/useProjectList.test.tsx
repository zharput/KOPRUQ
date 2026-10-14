import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ApiError } from '../../shared/api/http'
import { createFakeProjectApi } from '../../test/fakeProjectApi'
import { installFakeProjectApi, resetActiveProject } from '../../test/projectSessionTestUtils'
import { NEW_PROJECT_DOCUMENT_JSON } from './projectDocumentFixtures'
import { PROJECT_LIST_QUERY_KEY, useProjectList } from './useProjectList'

// The global test setup opens a project; this suite exercises the session layer from a closed one.
beforeEach(() => resetActiveProject())
afterEach(() => { cleanup(); resetActiveProject() })

function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: true } } })
  return ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

describe('useProjectList', () => {
  it('uses the projects key', () => { expect(PROJECT_LIST_QUERY_KEY).toEqual(['projects']) })

  it('does not call the api while disabled', async () => {
    const fake = installFakeProjectApi(createFakeProjectApi())
    renderHook(() => useProjectList(false), { wrapper: wrapper() })
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(fake.requests).toEqual([])
  })

  it('lists newest first once enabled', async () => {
    const fake = installFakeProjectApi(createFakeProjectApi())
    fake.seed({ ...NEW_PROJECT_DOCUMENT_JSON, projectId: 'old', updatedAt: '2026-01-01T00:00:00Z' })
    fake.seed({ ...NEW_PROJECT_DOCUMENT_JSON, projectId: 'new', updatedAt: '2026-06-01T00:00:00Z' })
    const { result } = renderHook(() => useProjectList(true), { wrapper: wrapper() })
    await waitFor(() => expect(result.current.data).toBeDefined())
    expect(result.current.data?.map((project) => project.projectId)).toEqual(['new', 'old'])
  })

  it('does not retry after an error (one call)', async () => {
    const fake = installFakeProjectApi(createFakeProjectApi())
    fake.failNext('LIST', new ApiError({ status: 500, message: 'down' }))
    const { result } = renderHook(() => useProjectList(true), { wrapper: wrapper() })
    await waitFor(() => expect(result.current.isError).toBe(true))
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(fake.requests.filter((request) => request.method === 'LIST')).toHaveLength(1)
  })
})
