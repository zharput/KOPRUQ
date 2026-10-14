import { createActiveCollection } from '../../../shared/project-store/activeProject'
import { GRAPH_COLLECTION } from './graphWire'

/** Server collection instance of the graph documents, one PUT per graph (the data store of the feature since M5c). */
export const GRAPH_SERVER_COLLECTION = createActiveCollection(GRAPH_COLLECTION)
