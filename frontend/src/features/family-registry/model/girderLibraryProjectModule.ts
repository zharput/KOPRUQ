import { z } from 'zod'
import { createProjectModule } from '../../../shared/project-file/projectModuleStore'
import { PRECAST_GIRDER_STORAGE_KEY, savePrecastGirderDefinition } from './familyRepository'

const girderLibrarySchema = z.union([z.array(z.unknown()), z.object({}).passthrough()])

export const GIRDER_LIBRARY_MODULE = createProjectModule('girderLibrary', PRECAST_GIRDER_STORAGE_KEY, girderLibrarySchema, { write: (value) => savePrecastGirderDefinition(value), reset: () => savePrecastGirderDefinition([]) })
