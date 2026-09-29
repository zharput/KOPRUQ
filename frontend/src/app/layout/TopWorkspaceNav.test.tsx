import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TopWorkspaceNav from './TopWorkspaceNav'

const recent = [
  { id: 'one', projectName: 'Project One', fileName: 'one.kopruq', lastUsedAt: new Date().toISOString(), available: true },
  { id: 'two', projectName: 'Project Two', fileName: 'two.kopruq', lastUsedAt: new Date().toISOString(), available: true },
]

function renderNav() {
  return render(<MemoryRouter><TopWorkspaceNav fileName="active.kopruq" recent={recent} onRecentOpen={vi.fn()} /></MemoryRouter>)
}

describe('TopWorkspaceNav file menu', () => {
  it('shows the active file name and dirty marker from the supplied file state', () => {
    render(<MemoryRouter><TopWorkspaceNav fileName="test.kopruq" dirty recent={[]} /></MemoryRouter>)
    expect(screen.getAllByText('test.kopruq *')).toHaveLength(2)
  })

  it('keeps Recent Projects and its file list in one focusable submenu', async () => {
    const user = userEvent.setup()
    renderNav()
    await user.click(screen.getByRole('button', { name: /^File/ }))
    const recentButton = screen.getByRole('button', { name: /Recent Projects/ })
    expect(recentButton).toHaveClass('spn-file-submenu-label')
    await user.hover(recentButton)
    expect(screen.getByText('one.kopruq')).toBeInTheDocument()
    await user.hover(screen.getByText('two.kopruq'))
    expect(screen.getByText('two.kopruq')).toBeInTheDocument()
  })

  it('supports keyboard focus for the Recent Projects entry and records', async () => {
    const user = userEvent.setup()
    renderNav()
    await user.click(screen.getByRole('button', { name: /^File/ }))
    const recentButton = screen.getByRole('button', { name: /Recent Projects/ })
    recentButton.focus()
    expect(recentButton).toHaveFocus()
    expect(recentButton).toHaveClass('spn-file-submenu-label')
    const record = screen.getAllByRole('button', { name: 'Recent project' })[0]
    record.focus()
    expect(record).toHaveFocus()
  })
})
