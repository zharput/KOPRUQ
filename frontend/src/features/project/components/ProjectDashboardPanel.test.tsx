import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import ProjectDashboardPanel from './ProjectDashboardPanel'
import { INITIAL_PROJECT } from '../model/projectWorkspace'

vi.mock('../../../shared/ui/CountryMap', () => ({ default: ({ place }: { place: string }) => <div data-testid="map">{place}</div> }))

describe('ProjectDashboardPanel', () => {
  it('shows name, country and status from the project and no hard-coded sample project', () => {
    render(<ProjectDashboardPanel bridges={[]} designCode="Eurocode" project={{ ...INITIAL_PROJECT, name: 'Danube Crossing', country: 'Hungary', status: 'In Design', lastModified: '2026-10-01' }} />)
    expect(screen.getByText('Danube Crossing')).toBeInTheDocument(); expect(screen.getByText('In Design')).toBeInTheDocument()
    expect(screen.getByTestId('map')).toHaveTextContent('Hungary')
    expect(screen.queryByText(/Sibiu-Pitesti-Lot2/)).not.toBeInTheDocument(); expect(screen.queryByText('Romania')).not.toBeInTheDocument(); expect(screen.queryByText('Continue...')).not.toBeInTheDocument()
  })
  it('shows Not defined for an empty project', () => {
    render(<ProjectDashboardPanel bridges={[]} designCode="Eurocode" project={INITIAL_PROJECT} />)
    expect(screen.getAllByText('Not defined').length).toBeGreaterThanOrEqual(4)
  })
})
