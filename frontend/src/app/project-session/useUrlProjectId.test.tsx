import { act, cleanup, renderHook } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useUrlProjectId } from './useUrlProjectId'

const navigate = vi.hoisted(() => vi.fn())
vi.mock('react-router-dom', async (importOriginal) => ({
  ...await importOriginal<typeof import('react-router-dom')>(),
  useNavigate: () => navigate,
}))

const originalUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`
afterEach(() => {
  cleanup()
  window.history.replaceState(null, '', originalUrl)
  navigate.mockClear()
})

describe('useUrlProjectId', () => {
  it('reads the router query and replaces only the project parameter', () => {
    const url = '/project/site?tab=loads&project=A#section'
    window.history.replaceState(null, '', url)
    const { result } = renderHook(() => useUrlProjectId(), { wrapper: ({ children }) => <MemoryRouter initialEntries={[url]}>{children}</MemoryRouter> })

    expect(result.current.urlProjectId).toBe('A')
    act(() => result.current.setUrlProjectId('A'))
    expect(navigate).not.toHaveBeenCalled()

    act(() => result.current.setUrlProjectId('B'))
    expect(navigate).toHaveBeenLastCalledWith(
      { pathname: '/project/site', search: '?tab=loads&project=B', hash: '#section' },
      { replace: true },
    )

    act(() => result.current.setUrlProjectId(null))
    expect(navigate).toHaveBeenLastCalledWith(
      { pathname: '/project/site', search: '?tab=loads', hash: '#section' },
      { replace: true },
    )
    expect(navigate).toHaveBeenCalledTimes(2)
  })

  it('treats an empty project parameter as no project', () => {
    const url = '/?project=&tab=loads'
    window.history.replaceState(null, '', url)
    const { result } = renderHook(() => useUrlProjectId(), { wrapper: ({ children }) => <MemoryRouter initialEntries={[url]}>{children}</MemoryRouter> })
    expect(result.current.urlProjectId).toBeNull()
    act(() => result.current.setUrlProjectId(null))
    expect(navigate).not.toHaveBeenCalled()
  })
})
