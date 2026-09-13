import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

/**
 * A render smoke test, not exhaustive coverage: proves the app boots,
 * the router's default redirect works, and clicking a real sidebar
 * `<Link>` (Milestone 2 of the architecture migration, 2026-09-12)
 * actually navigates to a different feature's screen - the exact
 * behavior this migration changed (from a manual `active` state switch
 * to URL routing).
 *
 * `window.location` is a real, shared jsdom global - it is NOT reset
 * between tests just because RTL unmounts the component, so a
 * `BrowserRouter` mounted in a later test still starts from whatever
 * path the previous test navigated to. Reset it explicitly.
 */
beforeEach(() => {
  window.history.pushState({}, '', '/')
})

describe('App', () => {
  it('renders Home by default', () => {
    render(<App />)
    expect(screen.getByText('Welcome to SPANOVA')).toBeInTheDocument()
  })

  it('navigates to Materials when its sidebar link is clicked', async () => {
    render(<App />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('link', { name: /materials/i }))
    expect(screen.getByText('Concrete - by structural element')).toBeInTheDocument()
  })

  it("marks the newly-active sidebar link active and un-marks Home (regression: Sidebar/TopBar previously used useParams(), which never resolves outside the matched route's own subtree, so they silently always showed Home as active regardless of the real URL)", async () => {
    render(<App />)
    const user = userEvent.setup()
    // Scoped to the sidebar nav: once Materials is active, TopBar also
    // shows a "Materials" leaf in its own leaf row, so an unscoped query
    // would match both.
    const sidebarNav = document.querySelector<HTMLElement>('.spn-sidebar-nav')!
    const homeLink = within(sidebarNav).getByRole('link', { name: /home/i })
    expect(homeLink.className).toContain('spn-nav-item-active')

    await user.click(within(sidebarNav).getByRole('link', { name: /materials/i }))

    expect(homeLink.className).not.toContain('spn-nav-item-active')
    expect(within(sidebarNav).getByRole('link', { name: /materials/i }).className).toContain('spn-nav-item-active')
  })
})
