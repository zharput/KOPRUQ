import { useSyncExternalStore } from 'react'
import { getGraphStoreSnapshot, subscribeGraphStore } from './graphStore'

export function useGraphStore() { return useSyncExternalStore(subscribeGraphStore, getGraphStoreSnapshot, getGraphStoreSnapshot) }
