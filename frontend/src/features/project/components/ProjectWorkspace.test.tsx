import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useEffect, useState } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import ProjectWorkspace from './ProjectWorkspace'
import { INITIAL_PROJECT, type ProjectWorkspaceData } from '../model/projectWorkspace'

const probe = {} as { project: ProjectWorkspaceData; update: (next: (previous: ProjectWorkspaceData) => ProjectWorkspaceData) => void }
const currentProject = () => probe.project
function Harness({ path }: { path: string }) {
  const [project, setProject] = useState<ProjectWorkspaceData>(structuredClone(INITIAL_PROJECT))
  useEffect(() => { probe.project = project; probe.update = (next) => setProject(next) })
  return <MemoryRouter><ProjectWorkspace path={path} project={project} setProject={setProject} bridges={[]} setBridges={() => undefined} designCode="" setDesignCode={() => undefined} /></MemoryRouter>
}
const properties = () => within(screen.getByRole('complementary', { name: 'Project Properties' }))

describe('ProjectWorkspace Save', () => {
  it('keeps a unit selected while editing after Save', async () => {
    const user = userEvent.setup(); render(<Harness path="/project/units" />)
    await user.click(properties().getByRole('button', { name: 'Edit Project' }))
    await user.selectOptions(screen.getByLabelText('Length'), 'mm')
    await user.click(properties().getByRole('button', { name: 'Save' }))
    expect(currentProject().units.length).toBe('mm')
  })
  it('keeps the unit selection after Cancel', async () => {
    const user = userEvent.setup(); render(<Harness path="/project/units" />)
    await user.click(properties().getByRole('button', { name: 'Edit Project' }))
    await user.selectOptions(screen.getByLabelText('Length'), 'mm')
    await user.click(properties().getByRole('button', { name: 'Cancel' }))
    expect(currentProject().units.length).toBe('mm')
  })
  it('does not revert fields changed outside the edit session and writes edited fields', async () => {
    const user = userEvent.setup(); render(<Harness path="/project/general" />)
    await user.click(properties().getByRole('button', { name: 'Edit Project' }))
    await act(async () => { probe.update((previous) => ({ ...previous, environment: { ...previous.environment, terrainDatasetId: 'terrain-ext' } })) })
    await user.type(properties().getByLabelText('Project Name'), 'Edited')
    await user.click(properties().getByRole('button', { name: 'Save' }))
    expect(currentProject().environment.terrainDatasetId).toBe('terrain-ext'); expect(currentProject().name).toContain('Edited')
  })
  it('no longer claims units are saved with Edit Project', () => {
    render(<Harness path="/project/units" />)
    expect(screen.queryByText(/Unit selections only/)).not.toBeInTheDocument()
    expect(screen.getByText('Unit selections are applied immediately and are not part of Edit Project / Save / Cancel.')).toBeInTheDocument()
  })
})
