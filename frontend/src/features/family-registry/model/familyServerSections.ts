import { createActiveSection } from '../../../shared/project-store/activeProject'
import type { ServerSection } from '../../../shared/project-store/serverSection'
import { FAMILY_SECTIONS, GIRDER_LIBRARY_SECTION, type FamilyRecordOf } from './familyWire'
import type { FamilyRepositoryCategory } from './familyRepository'

/** Server section instances of the five family lists and the girder library (M5b: not wired into the application yet). */
export const FAMILY_SERVER_SECTIONS: { [C in FamilyRepositoryCategory]: ServerSection<FamilyRecordOf<C>[]> } = {
  PIER: createActiveSection(FAMILY_SECTIONS.PIER),
  PIER_CAP: createActiveSection(FAMILY_SECTIONS.PIER_CAP),
  FOUNDATION: createActiveSection(FAMILY_SECTIONS.FOUNDATION),
  BEARING: createActiveSection(FAMILY_SECTIONS.BEARING),
  MATERIAL: createActiveSection(FAMILY_SECTIONS.MATERIAL),
}
export const GIRDER_LIBRARY_SERVER_SECTION = createActiveSection(GIRDER_LIBRARY_SECTION)
