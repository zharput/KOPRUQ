import { describe, expect, it } from 'vitest'
import type { ProjectSummary } from '../../shared/project-store/projectApi'
import { displayProjectName, formatUpdatedAt, shortProjectId, sortProjectsByUpdatedAt } from './projectDisplay'

const summary = (projectId: string, name: string, updatedAt: string): ProjectSummary => ({ projectId, name, revision: 1, createdAt: updatedAt, updatedAt })

describe('project display helpers', () => {
  it('shows an empty or blank name as Untitled', () => {
    expect(displayProjectName('')).toBe('Untitled')
    expect(displayProjectName('   ')).toBe('Untitled')
    expect(displayProjectName(' Köprü A ')).toBe(' Köprü A ')
  })

  it('shortens an id to 8 characters', () => {
    expect(shortProjectId('2c0e8b1a-6a53-4a3e-9d57-0f6a1b0c9e01')).toBe('2c0e8b1a')
    expect(shortProjectId('abc')).toBe('abc')
  })

  it('formats a valid date and keeps an invalid one as received', () => {
    const iso = '2026-10-13T10:30:00Z'
    expect(formatUpdatedAt(iso)).toBe(new Intl.DateTimeFormat('tr-TR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso)))
    expect(formatUpdatedAt('not a date')).toBe('not a date')
  })

  it('sorts newest first, unparsable dates last, ties by name then id, without mutating the input', () => {
    const input = [
      summary('3', 'B', '2026-01-01T00:00:00Z'), summary('1', 'bad', 'nope'), summary('4', 'A', '2026-01-01T00:00:00Z'),
      summary('2', 'new', '2026-05-01T00:00:00Z'), summary('5', 'A', '2026-01-01T00:00:00Z'),
    ]
    const copy = [...input]
    expect(sortProjectsByUpdatedAt(input).map((project) => project.projectId)).toEqual(['2', '4', '5', '3', '1'])
    expect(input).toEqual(copy)
  })
})
