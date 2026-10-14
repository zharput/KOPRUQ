import type { ProjectSummary } from '../../shared/project-store/projectApi'

/** A project without a name is shown as "Untitled". */
export function displayProjectName(name: string): string {
  return name.trim() === '' ? 'Untitled' : name
}

export function shortProjectId(projectId: string): string {
  return projectId.slice(0, 8)
}

/** Local short date and time; an unparsable value is shown as received. */
export function formatUpdatedAt(iso: string): string {
  const time = Date.parse(iso)
  if (Number.isNaN(time)) return iso
  return new Intl.DateTimeFormat('tr-TR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(time))
}

/** Newest first; unparsable dates last; ties by name, then by project id. Returns a new array. */
export function sortProjectsByUpdatedAt(projects: readonly ProjectSummary[]): ProjectSummary[] {
  const timeOf = (summary: ProjectSummary) => Date.parse(summary.updatedAt)
  return [...projects].sort((a, b) => {
    const ta = timeOf(a)
    const tb = timeOf(b)
    const aBad = Number.isNaN(ta)
    const bBad = Number.isNaN(tb)
    if (aBad !== bBad) return aBad ? 1 : -1
    if (!aBad && ta !== tb) return tb - ta
    return a.name.localeCompare(b.name) || a.projectId.localeCompare(b.projectId)
  })
}
