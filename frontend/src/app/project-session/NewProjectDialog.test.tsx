import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import NewProjectDialog from './NewProjectDialog'

function setup(open = true) {
  const onCreate = vi.fn()
  const onCancel = vi.fn()
  const view = render(<NewProjectDialog open={open} onCreate={onCreate} onCancel={onCancel} />)
  return { onCreate, onCancel, view }
}

describe('NewProjectDialog', () => {
  it('is a labelled dialog with the name field focused', () => {
    setup()
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Yeni proje')
    expect(screen.getByLabelText('Proje adı')).toHaveFocus()
  })

  it('renders nothing while closed', () => {
    setup(false)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('disables Oluştur for an empty or blank name', async () => {
    const { onCreate } = setup()
    const create = screen.getByRole('button', { name: 'Oluştur' })
    expect(create).toBeDisabled()
    await userEvent.type(screen.getByLabelText('Proje adı'), '   ')
    expect(create).toBeDisabled()
    await userEvent.keyboard('{Enter}')
    expect(onCreate).not.toHaveBeenCalled()
  })

  it('creates with the trimmed name on Enter and on the button', async () => {
    const { onCreate } = setup()
    await userEvent.type(screen.getByLabelText('Proje adı'), '  Köprü A  {Enter}')
    expect(onCreate).toHaveBeenLastCalledWith('Köprü A')
    await userEvent.click(screen.getByRole('button', { name: 'Oluştur' }))
    expect(onCreate).toHaveBeenCalledTimes(2)
  })

  it('cancels with İptal and Escape only', async () => {
    const { onCreate, onCancel } = setup()
    await userEvent.click(screen.getByRole('button', { name: 'İptal' }))
    await userEvent.keyboard('{Escape}')
    expect(onCancel).toHaveBeenCalledTimes(2)
    expect(onCreate).not.toHaveBeenCalled()
  })

  it('keeps both cancel actions disabled while creating', async () => {
    const onCancel = vi.fn()
    render(<NewProjectDialog open busy onCreate={vi.fn()} onCancel={onCancel} />)
    expect(screen.getByRole('button', { name: 'İptal' })).toBeDisabled()
    await userEvent.keyboard('{Escape}')
    expect(onCancel).not.toHaveBeenCalled()
  })

  it('starts empty when it is opened again', async () => {
    const onCreate = vi.fn(); const onCancel = vi.fn()
    const { rerender } = render(<NewProjectDialog open onCreate={onCreate} onCancel={onCancel} />)
    await userEvent.type(screen.getByLabelText('Proje adı'), 'abc')
    rerender(<NewProjectDialog open={false} onCreate={onCreate} onCancel={onCancel} />)
    rerender(<NewProjectDialog open onCreate={onCreate} onCancel={onCancel} />)
    expect(screen.getByLabelText('Proje adı')).toHaveValue('')
  })
})
