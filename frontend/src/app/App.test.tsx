import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { INITIAL_PROJECT } from '../features/project/model/projectWorkspace'
import { INITIAL_BRIDGES } from '../features/project/model/types'
import { assignedAxis, axesFromSpans, createBridgeDefinition } from '../features/bridge-definition/model/store'
import { NEW_PROJECT_DOCUMENT_JSON } from './project-session/projectDocumentFixtures'
import { createFakeProjectApi } from '../test/fakeProjectApi'
import { installFakeProjectApi, openTestProject } from '../test/projectSessionTestUtils'
import { readProjectData, resetProjectData, seedProjectData } from '../test/projectStoreTestUtils'
vi.mock('../features/graph/ui/GraphWorkspace', () => ({ default: () => <div className="spn-workspace-layout"><aside aria-label="Node Library"><label htmlFor="search-nodes">Search nodes</label><input id="search-nodes" /></aside><main><h1>Graph Workspace</h1><input aria-label="Graph name" defaultValue="Untitled Graph" /><div className="spn-graph-flow" /></main><aside aria-label="Node Inspector">Node Inspector</aside></div> }))

beforeEach(() => {
  window.history.pushState({}, '', '/')
  resetProjectData(['workspace', 'bridgeDefinitions', 'families.PIER', 'families.PIER_CAP', 'families.FOUNDATION', 'families.BEARING', 'graphDocuments'])
  // A new project has no bridges (no seed); the tests that need bridge rows put them into the workspace explicitly.
  seedProjectData('workspace', { project: INITIAL_PROJECT, bridges: INITIAL_BRIDGES })
})

describe('App workspace shell', () => {
  it('redirects the root to Project Overview inside the new application shell', async () => {
    render(<App />)
    await waitFor(() => expect(window.location.pathname).toBe('/project'))
    expect(screen.getByRole('heading', { name: 'Project Overview' })).toBeInTheDocument()
    expect(within(screen.getByRole('complementary', { name: 'Project sections' })).getByRole('button', { name: 'Overview' })).toHaveClass('active')
    expect(screen.getByRole('link', { name: 'Project' })).toHaveAttribute('aria-current', 'page')
    expect(screen.queryByText('Welcome to KOPRUQ')).not.toBeInTheDocument()
    expect(document.querySelector('.spn-sidebar')).not.toBeInTheDocument()
  })

  it('returns to Project Overview when the KOPRUQ logo is clicked', async () => {
    window.history.pushState({}, '', '/graph')
    render(<App />)
    const user = userEvent.setup()
    expect(screen.getByRole('heading', { name: 'Graph Workspace' })).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Project' }))
    expect(window.location.pathname).toBe('/project')
    expect(screen.getByRole('link', { name: 'Project' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('heading', { name: 'Project Overview' })).toBeInTheDocument()
  })

  it('keeps an existing legacy feature route inside the unified shell', () => {
    window.history.pushState({}, '', '/materials')
    render(<App />)
    expect(screen.getByText('Concrete - by structural element')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Family' })).toHaveAttribute('aria-current', 'page')
    expect(document.querySelector('.spn-sidebar')).not.toBeInTheDocument()
    expect(document.querySelector('.spn-topbar')).not.toBeInTheDocument()
  })

  it('keeps Family active when loaded directly or refreshed at its URL', () => {
    window.history.pushState({}, '', '/family-tables')
    const firstRender = render(<App />)
    expect(screen.getByRole('link', { name: 'Family' })).toHaveAttribute('aria-current', 'page')
    firstRender.unmount()
    render(<App />)
    expect(screen.getByRole('link', { name: 'Family' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('complementary', { name: 'Family Library' })).toBeInTheDocument()
  })

  it('shows the eight primary workspaces in order and opens the Graph editor', async () => {
    render(<App />)
    const user = userEvent.setup()
    const navElement = screen.getByRole('navigation', { name: 'Workspaces' })
    const nav = within(navElement)
    const labels = ['Project', 'Graph', 'Family', 'Loads', 'Analysis', 'Optimization', 'Results', 'BIM / Export']
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

  it('opens the read-only Graph-generated Family Workspace', async () => {
    render(<App />)
    const user = userEvent.setup()
    await user.click(within(screen.getByRole('navigation', { name: 'Workspaces' })).getByRole('link', { name: 'Family' }))
    expect(screen.getByRole('complementary', { name: 'Family Library' })).toBeInTheDocument()
    expect(screen.getByText('Graph-generated structural family results')).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Family Bridge' })).toBeInTheDocument()
    expect(screen.getByText('Select a candidate to preview its section.')).toBeInTheDocument()
  })

  it('keeps Family Workspace read-only while Bridge Definition remains separate', async () => {
    seedProjectData('bridgeDefinitions', ({ selectedBridgeId: 'VIA-01', definitions: { 'VIA-01': { axisAssignments: { P1: { pierFamilyId: 'RECT-M' } } } } }))
    render(<App />)
    const user = userEvent.setup()
    await user.click(within(screen.getByRole('navigation', { name: 'Workspaces' })).getByRole('link', { name: 'Family' }))
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument()
    expect(screen.getByRole('complementary', { name: 'Family Library' })).toBeInTheDocument()
  })

  it('keeps navigation between Family Workspace and Bridge Definition independent', async () => {
    render(<App />)
    const user = userEvent.setup()
    await user.click(within(screen.getByRole('navigation', { name: 'Workspaces' })).getByRole('link', { name: 'Family' }))
    act(() => { window.history.pushState({}, '', '/bridge-definition'); window.dispatchEvent(new PopStateEvent('popstate')) })
    expect(screen.getByRole('combobox', { name: 'Bridge selector' })).toBeInTheDocument()
    await user.click(within(screen.getByRole('navigation', { name: 'Workspaces' })).getByRole('link', { name: 'Family' }))
    expect(screen.getByRole('complementary', { name: 'Family Library' })).toBeInTheDocument()
  })

  it('opens the full Bridge Definition tree and its 3D, Plan, and Profile modes', async () => {
    window.history.pushState({}, '', '/bridge-definition')
    render(<App />)
    const bridgeMenu = within(screen.getByRole('complementary', { name: 'Bridge Definition sections' }))
    for (const label of ['Bridge Overview', 'Horizontal Alignment', 'Vertical Alignment', 'Cross Section', 'Terrain Reference', 'Span Layout', 'Axis Definition', 'Type & Assignment', 'Deck Geometry', 'Girder Layout', 'Pier Layout', 'Pier Cap Assignment', 'Abutments', 'Foundation Assignment', 'Soil Reference', 'Bearing Layout', 'Bearing Assignment', 'Construction Method', 'Construction Stages', 'Roads / Railways', 'Rivers', 'Clearances', 'Geometric Constraints', 'Bridge Assembly', 'Validation']) {
      expect(bridgeMenu.getByRole('button', { name: label })).toBeInTheDocument()
    }
    expect(screen.getByRole('combobox', { name: 'Bridge selector' })).toHaveDisplayValue('VIA-01 · Cantilever Bridge')
    expect(screen.getByRole('button', { name: '3D' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Plan' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Profile' })).toBeInTheDocument()
  })

  it('preserves the selected bridge when navigating to another workspace and back', async () => {
    window.history.pushState({}, '', '/bridge-definition')
    render(<App />)
    const user = userEvent.setup()
    await user.selectOptions(screen.getByRole('combobox', { name: 'Bridge selector' }), screen.getByRole('option', { name: /^VIA-02 ·/ }))
    await user.click(within(screen.getByRole('navigation', { name: 'Workspaces' })).getByRole('link', { name: 'Family' }))
    act(() => { window.history.pushState({}, '', '/bridge-definition'); window.dispatchEvent(new PopStateEvent('popstate')) })
    expect(screen.getByRole('combobox', { name: 'Bridge selector' })).toHaveDisplayValue('VIA-02 · Precast Girder')
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
    seedProjectData('families.PIER', pierCatalog)
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
    const bridgeId = readProjectData<{ bridges: { id: string }[] }>('workspace')!.bridges[0].id
    expect(readProjectData<{ definitions: Record<string, { axisAssignments: { P1: { pierFamilyId: string } } }> }>('bridgeDefinitions')!.definitions[bridgeId].axisAssignments.P1.pierFamilyId).toBe('PIER-01')
    expect((readProjectData('families.PIER') ?? [])).toEqual(pierCatalog)
  })

  it('preserves legacy bridge assignments after editing its number and reloading', async () => {
    const bridge = { ...INITIAL_BRIDGES[0], id: 'bridge-1' }
    const definition = {
      ...createBridgeDefinition(bridge), spanLengthsM: [30, 40], axes: axesFromSpans([30, 40]), selectedAxisId: 'P1',
      girderFamilyId: 'GIRDER-1', girderVariantId: 'VARIANT-1',
      axisAssignments: { P1: assignedAxis({ pierFamilyId: 'PIER-1', foundationFamilyId: 'FOUNDATION-1', bearingFamilyId: 'BEARING-1' }) },
      abutmentFamilyIds: { A1: 'ABUTMENT-1', A2: 'ABUTMENT-2' },
    }
    seedProjectData('workspace', { project: INITIAL_PROJECT, bridges: [bridge] })
    seedProjectData('bridgeDefinitions', ({ selectedBridgeId: bridge.no, definitions: { [bridge.no]: { ...definition, bridgeId: bridge.no } } }))
    window.history.pushState({}, '', '/project/bridge-information')
    const view = render(<App />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Edit VIA-01' }))
    await user.clear(screen.getByRole('textbox', { name: 'No' }))
    await user.type(screen.getByRole('textbox', { name: 'No' }), 'VIA-99')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    act(() => { window.history.pushState({}, '', '/bridge-definition'); window.dispatchEvent(new PopStateEvent('popstate')) })
    expect(screen.getByRole('combobox', { name: 'Bridge selector' })).toHaveValue(bridge.id)
    expect(screen.getByRole('combobox', { name: 'Bridge selector' })).toHaveDisplayValue('VIA-99 · Cantilever Bridge')
    await user.click(within(screen.getByRole('complementary', { name: 'Bridge Definition sections' })).getByRole('button', { name: 'Span Layout' }))
    expect(screen.getByRole('textbox', { name: 'Selected span lengths' })).toHaveValue('30, 40')
    const saved = readProjectData('bridgeDefinitions') ?? {}
    expect(saved).toEqual({ keyBy: 'bridgeId', selectedBridgeId: bridge.id, definitions: { [bridge.id]: definition } })
    view.unmount()
    render(<App />)
    expect(screen.getByRole('combobox', { name: 'Bridge selector' })).toHaveDisplayValue('VIA-99 · Cantilever Bridge')
    expect(screen.getByRole('textbox', { name: 'Selected span lengths' })).toHaveValue('30, 40')
    expect(readProjectData('bridgeDefinitions') ?? {}).toEqual(saved)
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
    expect(readProjectData<{ project: { name: string } }>('workspace')!.project.name).toBe('Test Bridge Project')
  })

  it('preserves Project state across workspace navigation and browser refresh', async () => {
    const firstApp = render(<App />)
    const user = userEvent.setup()
    const properties = within(screen.getByRole('complementary', { name: 'Project Properties' }))
    await user.click(properties.getByRole('button', { name: 'Edit Project' }))
    await user.type(properties.getByLabelText('Project Name'), 'Persistent Project')
    await user.click(properties.getByRole('button', { name: 'Save' }))
    await user.click(within(screen.getByRole('navigation', { name: 'Workspaces' })).getByRole('link', { name: 'Family' }))
    await user.click(screen.getByRole('link', { name: 'Project' }))
    expect(document.querySelector('.spn-project-name')).toHaveTextContent('Persistent Project')
    firstApp.unmount()
    const app = render(<App />)
    expect(document.querySelector('.spn-project-name')).toHaveTextContent('Persistent Project')
    app.unmount()
  })

  it('opens the File dropdown with the shared navigation styling and all commands', async () => {
    const user = userEvent.setup(); render(<App />)
    const nav = within(screen.getByRole('navigation', { name: 'Workspaces' }))
    const file = nav.getByRole('button', { name: /^File/ })
    expect(file).toHaveClass('spn-workspace-nav-item')
    expect(nav.getByRole('link', { name: 'Project' })).toHaveClass('spn-workspace-nav-item')
    await user.click(file)
    const dropdown = document.querySelector('.spn-file-dropdown') as HTMLElement
    expect(dropdown).toBeVisible()
    expect(dropdown).toHaveTextContent('New Project')
    expect(dropdown).toHaveTextContent('Open...')
    expect(dropdown).toHaveTextContent('Recent Projects')
    expect(dropdown).toHaveTextContent('Exit')
    expect(dropdown).not.toHaveTextContent('Save')
    await user.click(file)
    expect(document.querySelector('.spn-file-dropdown')).not.toBeInTheDocument()
  })

  it('closes the File dropdown on an outside click and renders the server projects inside it', async () => {
    const fake = installFakeProjectApi(createFakeProjectApi())
    openTestProject(NEW_PROJECT_DOCUMENT_JSON, fake)
    fake.seed({ ...NEW_PROJECT_DOCUMENT_JSON, projectId: '7a1d0000-0000-4000-8000-000000000001', workspace: { ...NEW_PROJECT_DOCUMENT_JSON.workspace, project: { ...NEW_PROJECT_DOCUMENT_JSON.workspace.project, name: 'Project A' } } })
    const user = userEvent.setup(); render(<App />)
    const nav = within(screen.getByRole('navigation', { name: 'Workspaces' }))
    await user.click(nav.getByRole('button', { name: /^File/ }))
    await waitFor(() => expect(screen.getByText('Project A')).toBeInTheDocument())
    expect(document.querySelector('.spn-file-dropdown')).toBeVisible()
    await user.click(document.body)
    expect(document.querySelector('.spn-file-dropdown')).not.toBeInTheDocument()
  })
})
