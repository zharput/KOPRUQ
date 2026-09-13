import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

/**
 * Single place the app's cross-cutting providers live (architecture
 * migration, 2026-09-12). Today that's just TanStack Query, used by the
 * 3 screens that call the real backend (GenerateWorkflow, SiteLayoutPanel,
 * FastSolverPanel - see each feature's `hooks/` once Milestone 3 wires
 * them onto `useMutation`). One shared `QueryClient` for the whole app,
 * matching TanStack Query's own recommended setup.
 */
const queryClient = new QueryClient()

export default function AppProviders({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
