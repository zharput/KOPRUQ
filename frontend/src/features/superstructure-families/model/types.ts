export interface CrossSectionValues {
  platformWidthM: number
  leftWalkwayM: number
  rightWalkwayM: number
  spaceOfGirderM: number
  numberOfGirders: number
}

export const INITIAL_CROSS_SECTION_VALUES: CrossSectionValues = {
  platformWidthM: 13.8,
  leftWalkwayM: 1.0,
  rightWalkwayM: 1.5,
  spaceOfGirderM: 2.0,
  numberOfGirders: 5,
}

/**
 * Carriageway = horizontal distance at the base of the sidewalk
 * (platform width minus both walkways) - the engineer's own definition
 * (2026-09-13), computed here so both Superstructure Families (where
 * it's displayed) and Loads' Self Weight & Permanent breakdown (where
 * it feeds the Asphalt row's width term) read the same value.
 */
export function carriagewayWidthM(values: CrossSectionValues): number {
  return values.platformWidthM - values.leftWalkwayM - values.rightWalkwayM
}
