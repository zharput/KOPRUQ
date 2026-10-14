import { useQuery } from '@tanstack/react-query'
import { activeProjectApi } from '../../shared/project-store/activeProject'
import { sortProjectsByUpdatedAt } from './projectDisplay'

export const PROJECT_LIST_QUERY_KEY = ['projects'] as const

/** Server project list, newest first. Runs only while `enabled` (the dialog is open); no automatic retry. */
export function useProjectList(enabled: boolean) {
  return useQuery({
    queryKey: PROJECT_LIST_QUERY_KEY,
    queryFn: ({ signal }) => activeProjectApi().listProjects(signal),
    enabled, staleTime: 0, retry: false, select: sortProjectsByUpdatedAt,
  })
}
