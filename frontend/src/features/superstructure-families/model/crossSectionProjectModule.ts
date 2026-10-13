import { z } from 'zod'
import { createProjectModule } from '../../../shared/project-file/projectModuleStore'

const number = z.number()
const crossSectionValuesSchema = z.object({ platformWidthM: number, leftWalkwayM: number, rightWalkwayM: number, spaceOfGirderM: number, numberOfGirders: number })

export const CROSS_SECTION_VALUES_MODULE = createProjectModule('crossSectionValues', 'kopruq.superstructure.cross-section.v1', crossSectionValuesSchema)
