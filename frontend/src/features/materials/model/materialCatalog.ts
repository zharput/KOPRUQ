/** Existing concrete strength classes shared by Materials UI and Graph references. */
export const EN_CONCRETE_CLASS_IDS = [
  'C12/15', 'C16/20', 'C20/25', 'C25/30', 'C30/37', 'C35/45', 'C40/50',
  'C45/55', 'C50/60', 'C55/67', 'C60/75', 'C70/85', 'C80/95', 'C90/105',
] as const

/** EN 10025 grade identifiers supported by the Structural Steel node.
 * Strength values are intentionally not inferred here; they require the
 * product standard and thickness band to be selected and verified.
 */
export const EN_STRUCTURAL_STEEL_GRADES = ['S235', 'S275', 'S355', 'S420', 'S460'] as const
export const STRUCTURAL_STEEL_OPTIONS = EN_STRUCTURAL_STEEL_GRADES.map(value => ({ value, label: value }))
