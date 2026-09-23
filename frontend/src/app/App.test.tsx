import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
vi.mock('../features/graph/ui/GraphWorkspace', () => ({ default: () => <div className="spn-workspace-layout"><aside aria-label="Node Library"><label htmlFor="search-nodes">Search nodes</label><input id="search-nodes" /></aside><main><h1>Graph Workspace</h1><input aria-label="Graph name" defaultValue="Untitled Graph" /><div className="spn-graph-flow" /></main><aside aria-label="Node Inspector">Node Inspector</aside></div> }))

beforeEach(() => {
  window.history.pushState({}, '', '/')
  localStorage.removeItem('spanova.project-workspace.v1')
  localStorage.removeItem('spanova.bridge-definitions.v1')
  localStorage.removeItem('spanova.project-design-system.pier-families')
  localStorage.removeItem('spanova.project-design-system.pier-cap-families')
  localStorage.removeItem('spanova.project-design-system.foundation-families')
  localStorage.removeItem('spanova.project-design-system.bearing-families')
  localStorage.removeItem('spanova.graph.documents.v1')
})

describe('App workspace shell', () => {
  it('redirects the root to Project Overview inside the new application shell', async () => {
    render(<App />)
    await waitFor(() => expect(window.location.pathname).toBe('/project'))
    expect(screen.getByRole('heading', { name: 'Project Overview' })).toBeInTheDocument()
    expect(within(screen.getByRole('complementary', { name: 'Project sections' })).getByRole('button', { name: 'Overview' })).toHaveClass('active')
    expect(screen.getByRole('link', { name: 'Project' })).toHaveAttribute('aria-current', 'page')
    expect(screen.queryByText('Welcome to SPANOVA')).not.toBeInTheDocument()
    expect(document.querySelector('.spn-sidebar')).not.toBeInTheDocument()
  })

  it('returns to Project Overview when the SPANOVA logo is clicked', async () => {
    window.history.pushState({}, '', '/graph')
    render(<App />)
    const user = userEvent.setup()
    expect(screen.getByRole('heading', { name: 'Graph Workspace' })).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'SPANOVA Project Overview' }))
    expect(window.location.pathname).toBe('/project')
    expect(screen.getByRole('link', { name: 'Project' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('heading', { name: 'Project Overview' })).toBeInTheDocument()
  })

  it('keeps an existing legacy feature route inside the unified shell', () => {
    window.history.pushState({}, '', '/materials')
    render(<App />)
    expect(screen.getByText('Concrete - by structural element')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Family Tables' })).toHaveAttribute('aria-current', 'page')
    expect(document.querySelector('.spn-sidebar')).not.toBeInTheDocument()
    expect(document.querySelector('.spn-topbar')).not.toBeInTheDocument()
  })

  it('keeps Family Tables active when loaded directly or refreshed at its URL', () => {
    window.history.pushState({}, '', '/family-tables')
    const firstRender = render(<App />)
    expect(screen.getByRole('link', { name: 'Family Tables' })).toHaveAttribute('aria-current', 'page')
    firstRender.unmount()
    render(<App />)
    expect(screen.getByRole('link', { name: 'Family Tables' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('navigation', { name: 'Family categories' })).toBeInTheDocument()
  })

  it('shows the eight primary workspaces in order and opens the Graph editor', async () => {
    render(<App />)
    const user = userEvent.setup()
    const navElement = screen.getByRole('navigation', { name: 'Workspaces' })
    const nav = within(navElement)
    const labels = ['Project', 'Graph', 'Family Tables', 'Loads', 'Analysis', 'Optimization', 'Results', 'BIM / Export']
    labels.forEach((label) => expect(nav.getByRole('link', { name: label })).toBeInTheDocument())
    expect(nav.queryByRole('link', { name: 'Bridge Definition' })).not.toBeInTheDocument()
    expect(Array.from(navElement.querySelectorAll('a')).map((link) => link.getAttribute('aria-label'))).toEqual(labels)
    await user.click(nav.getByRole('link', { name: 'Graph' }))
    expect(window.location.pathname).toBe('/graph')
    expect(screen.getByRole('heading', { name: 'Graph Workspace' })).toBeInTheDocument()
    expect(screen.getByRole('complementary', { name: 'Node Library' })).toBeInTheDocument()
    expect(screen.getByRole('complementary', { name: 'Node Inspector' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Search nodes' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Graph name' })).toHaveValue('Untitled Graph')
    expect(document.querySelector('.spn-graph-flow')).toBeInTheDocument()
  })

  it('consolidates supported family editors under one Family Tables workspace', async () => {
    render(<App />)
    const user = userEvent.setup()
    await user.click(within(screen.getByRole('navigation', { name: 'Workspaces' })).getByRole('link', { name: 'Family Tables' }))
    expect(screen.getByRole('button', { name: 'Import' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Export' })).toBeDisabled()
    const familyMenu = within(screen.getByRole('navigation', { name: 'Family categories' }))
    const familyButton = (label: string) => familyMenu.getAllByRole('button').find((button) => button.querySelector('span')?.textContent === label)!
    for (const label of ['Superstructure', 'Girder', 'Pier', 'Pier Cap', 'Foundation', 'Bearing', 'Material']) {
      expect(familyButton(label)).toBeInTheDocument()
    }
    expect(familyMenu.getByRole('button', { name: /Abutment/ })).toBeDisabled()
    await user.click(familyButton('Pier'))
    expect(screen.getByRole('heading', { name: 'PIER FAMILY CATALOG' })).toBeInTheDocument()
    await user.click(familyButton('Foundation'))
    expect(screen.getByLabelText('Foundation Type')).toHaveValue('SHALLOW')
    expect(screen.getByRole('heading', { name: 'FOUNDATION FAMILY CATALOG' })).toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText('Foundation Type'), 'PILED')
    expect(screen.getByText(/Lx =/)).toBeInTheDocument()
    expect(screen.getByRole('complementary', { name: 'Family Inspector' })).toHaveTextContent('no stable family catalog records yet')
  })

  it('shows the selected family ID and blocks deletion while Bridge Definition uses it', async () => {
    localStorage.setItem('spanova.bridge-definitions.v1', JSON.stringify({ selectedBridgeId: 'VIA-01', definitions: { 'VIA-01': { axisAssignments: { P1: { pierFamilyId: 'RECT-M' } } } } }))
    render(<App />)
    const user = userEvent.setup()
    await user.click(within(screen.getByRole('navigation', { name: 'Workspaces' })).getByRole('link', { name: 'Family Tables' }))
    const catalog = screen.getByRole('heading', { name: 'PIER FAMILY CATALOG' }).closest('.spn-card') as HTMLElement
    await user.click(within(catalog).getByText('RECT-M'))
    expect(screen.getByRole('complementary', { name: 'Family Inspector' })).toHaveTextContent('RECT-M')
    expect(screen.getByRole('complementary', { name: 'Family Inspector' })).toHaveTextContent('VIA-01')
    expect(screen.getByRole('complementary', { name: 'Family Inspector' })).toHaveTextContent('P1')
    await user.click(within(catalog).getByRole('button', { name: 'Delete' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Cannot delete RECT-M')
    expect(within(catalog).getByText('RECT-M')).toBeInTheDocument()
  })

  it('keeps existing Pier family edits when switching between Family Tables and Bridge Definition', async () => {
    render(<App />)
    const user = userEvent.setup()
    await user.click(within(screen.getByRole('navigation', { name: 'Workspaces' })).getByRole('link', { name: 'Family Tables' }))
    const name = screen.getByLabelText('Family Name')
    await user.clear(name)
    await user.type(name, 'PERSISTENT-PIER')
    act(() => { window.history.pushState({}, '', '/bridge-definition'); window.dispatchEvent(new PopStateEvent('popstate')) })
    expect(screen.getByRole('combobox', { name: 'Bridge selector' })).toBeInTheDocument()
    await user.click(within(screen.getByRole('navigation', { name: 'Workspaces' })).getByRole('link', { name: 'Family Tables' }))
    expect(screen.getByLabelText('Family Name')).toHaveValue('PERSISTENT-PIER')
  })

  it('opens the full Bridge Definition tree and its 3D, Plan, and Profile modes', async () => {
    window.history.pushState({}, '', '/bridge-definition')
    render(<App />)
    const bridgeMenu = within(screen.getByRole('complementary', { name: 'Bridge Definition sections' }))
    for (const label of ['Bridge Overview', 'Horizontal Alignment', 'Vertical Alignment', 'Cross Section', 'Terrain Reference', 'Span Layout', 'Axis Definition', 'Type & Assignment', 'Deck Geometry', 'Girder Layout', 'Pier Layout', 'Pier Cap Assignment', 'Abutments', 'Foundation Assignment', 'Soil Reference', 'Bearing Layout', 'Bearing Assignment', 'Construction Method', 'Construction Stages', 'Roads / Railways', 'Rivers', 'Clearances', 'Geometric Constraints', 'Bridge Assembly', 'Validation']) {
      expect(bridgeMenu.getByRole('button', { name: label })).toBeInTheDocument()
    }
    expect(screen.getByRole('combobox', { name: 'Bridge selector' })).toHaveValue('VIA-01')
    expect(screen.getByRole('button', { name: '3D' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Plan' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Profile' })).toBeInTheDocument()
  })

  it('preserves the selected bridge when navigating to another workspace and back', async () => {
    window.history.pushState({}, '', '/bridge-definition')
    render(<App />)
    const user = userEvent.setup()
    await user.selectOptions(screen.getByRole('combobox', { name: 'Bridge selector' }), 'VIA-02')
    await user.click(within(screen.getByRole('navigation', { name: 'Workspaces' })).getByRole('link', { name: 'Family Tables' }))
    act(() => { window.history.pushState({}, '', '/bridge-definition'); window.dispatchEvent(new PopStateEvent('popstate')) })
    expect(screen.getByRole('combobox', { name: 'Bridge selector' })).toHaveValue('VIA-02')
  })

  it('shows the existing LandXML alignment import inside Bridge Definition', async () => {
    window.history.pushState({}, '', '/bridge-definition')
    render(<App />)
    const user = userEvent.setup()
    await user.click(within(screen.getByRole('complementary', { name: 'Bridge Definition sections' })).getByRole('button', { name: 'Horizontal Alignment' }))
    expect(screen.getByRole('heading', { name: 'Horizontal Alignment' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Import Terrain' })).toBeInTheDocument()
  })

  it('derives support axes from explicit bridge spans and assigns family IDs without copying catalog data', async () => {
    const pierCatalog = [{ id: 'PIER-01', name: 'Pier Family A', enabled: true }]
    localStorage.setItem('spanova.project-design-system.pier-families', JSON.stringify(pierCatalog))
    window.history.pushState({}, '', '/bridge-definition')
    render(<App />)
    const user = userEvent.setup()
    await user.click(within(screen.getByRole('complementary', { name: 'Bridge Definition sections' })).getByRole('button', { name: 'Span Layout' }))
    await user.type(screen.getByRole('textbox', { name: 'Selected span lengths' }), '100, 100')
    expect(screen.getByRole('cell', { name: 'P1' })).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: 'A2' })).toBeInTheDocument()
    await user.click(within(screen.getByRole('complementary', { name: 'Bridge Definition sections' })).getByRole('button', { name: 'Axis Definition' }))
    await user.click(screen.getByText('P1'))
    const pierFamily = screen.getByRole('combobox', { name: 'Pier Family' })
    await user.selectOptions(pierFamily, 'PIER-01')
    expect(JSON.parse(localStorage.getItem('spanova.bridge-definitions.v1') ?? '{}').definitions['VIA-01'].axisAssignments.P1.pierFamilyId).toBe('PIER-01')
    expect(JSON.parse(localStorage.getItem('spanova.project-design-system.pier-families') ?? '[]')).toEqual(pierCatalog)
  })

  it('opens the existing Loads feature at /loads', async () => {
    render(<App />)
    const user = userEvent.setup()
    await user.click(within(screen.getByRole('navigation', { name: 'Workspaces' })).getByRole('link', { name: 'Loads' }))
    expect(window.location.pathname).toBe('/loads')
    expect(screen.getByRole('heading', { name: 'Self Weight & Permanent' })).toBeInTheDocument()
  })

  it('supports browser back and forward across workspace routes', async () => {
    render(<App />)
    const user = userEvent.setup()
    const nav = within(screen.getByRole('navigation', { name: 'Workspaces' }))
    await user.click(nav.getByRole('link', { name: 'Graph' }))
    await user.click(nav.getByRole('link', { name: 'Analysis' }))
    act(() => window.history.back())
    await waitFor(() => expect(window.location.pathname).toBe('/graph'))
    expect(screen.getByRole('heading', { name: 'Graph Workspace' })).toBeInTheDocument()
    act(() => window.history.forward())
    await waitFor(() => expect(window.location.pathname).toBe('/analysis'))
    expect(screen.getByRole('link', { name: 'Analysis' })).toHaveAttribute('aria-current', 'page')
  })

  it('provides the hierarchical Project menu and routes into its settings screens', async () => {
    render(<App />)
    const user = userEvent.setup()
    const projectMenu = screen.getByRole('complementary', { name: 'Project sections' })
    for (const label of ['Overview', 'General', 'Location', 'Stakeholders', 'Schedule', 'Notes', 'Design Codes', 'Units & Preferences', 'Coordinate System', 'Design Criteria', 'Terrain & GIS', 'Geotechnical', 'Hydrology', 'Seismic', 'Climate & Wind', 'Cost Database', 'Files & Documents']) {
      expect(within(projectMenu).getByRole('button', { name: label })).toBeInTheDocument()
    }
    await user.click(within(projectMenu).getByRole('button', { name: 'Design Codes' }))
    expect(window.location.pathname).toBe('/project/design-codes')
    expect(screen.getByRole('heading', { name: 'Design Codes' })).toBeInTheDocument()
    expect(screen.getByLabelText('Design Standard Family')).toHaveValue('Eurocode')
    await user.click(within(screen.getByRole('complementary', { name: 'Project sections' })).getByRole('button', { name: 'Units & Preferences' }))
    expect(window.location.pathname).toBe('/project/units')
    expect(screen.getByLabelText('Length')).toHaveValue('m')
    await user.click(within(screen.getByRole('complementary', { name: 'Project sections' })).getByRole('button', { name: 'Coordinate System' }))
    expect(screen.getByLabelText('EPSG Code')).toHaveValue('')
  })

  it('maps legacy Project Information and Cost Database URLs to canonical Project sections', async () => {
    window.history.pushState({}, '', '/project-information')
    const view = render(<App />)
    await waitFor(() => expect(window.location.pathname).toBe('/project/bridge-information'))
    expect(screen.getByRole('heading', { name: 'Bridge Information' })).toBeInTheDocument()
    view.unmount()
    window.history.pushState({}, '', '/cost-database')
    render(<App />)
    await waitFor(() => expect(window.location.pathname).toBe('/project/cost-database'))
    expect(screen.getByRole('heading', { name: 'Cost Database' })).toBeInTheDocument()
  })

  it('redirects the legacy Alignment route into Bridge Definition Alignment', async () => {
    window.history.pushState({}, '', '/alignment')
    render(<App />)
    await waitFor(() => expect(window.location.pathname).toBe('/bridge-definition/alignment/horizontal'))
    expect(screen.getByRole('heading', { name: 'Horizontal Alignment' })).toBeInTheDocument()
  })

  it('saves project identity centrally and Cancel discards the draft', async () => {
    render(<App />)
    const user = userEvent.setup()
    const properties = within(screen.getByRole('complementary', { name: 'Project Properties' }))
    await user.click(properties.getByRole('button', { name: 'Edit Project' }))
    await user.type(properties.getByLabelText('Project Name'), 'Test Bridge Project')
    await user.click(properties.getByRole('button', { name: 'Cancel' }))
    expect(document.querySelector('.spn-project-name')).toHaveTextContent('Not defined')

    const editProperties = within(screen.getByRole('complementary', { name: 'Project Properties' }))
    await user.click(editProperties.getByRole('button', { name: 'Edit Project' }))
    await user.type(editProperties.getByLabelText('Project Name'), 'Test Bridge Project')
    await user.click(editProperties.getByRole('button', { name: 'Save' }))
    expect(document.querySelector('.spn-project-name')).toHaveTextContent('Test Bridge Project')
    expect(JSON.parse(localStorage.getItem('spanova.project-workspace.v1') ?? '{}').project.name).toBe('Test Bridge Project')
  })

  it('preserves Project state across workspace navigation and browser refresh', async () => {
    const firstApp = render(<App />)
    const user = userEvent.setup()
    const properties = within(screen.getByRole('complementary', { name: 'Project Properties' }))
    await user.click(properties.getByRole('button', { name: 'Edit Project' }))
    await user.type(properties.getByLabelText('Project Name'), 'Persistent Project')
    await user.click(properties.getByRole('button', { name: 'Save' }))
    await user.click(within(screen.getByRole('navigation', { name: 'Workspaces' })).getByRole('link', { name: 'Family Tables' }))
    await user.click(screen.getByRole('link', { name: 'SPANOVA Project Overview' }))
    expect(document.querySelector('.spn-project-name')).toHaveTextContent('Persistent Project')
    firstApp.unmount()
    const app = render(<App />)
    expect(document.querySelector('.spn-project-name')).toHaveTextContent('Persistent Project')
    app.unmount()
  })
})
