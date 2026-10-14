import { createActiveCollection } from '../../../shared/project-store/activeProject'
import { GRAPH_COLLECTION } from './graphWire'

/** Server collection instance of the graph documents, one PUT per graph (M5b: not wired into the application yet). */
export const GRAPH_SERVER_COLLECTION = createActiveCollection(GRAPH_COLLECTION)
