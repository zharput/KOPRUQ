import { expect, type Locator, type Page } from '@playwright/test'
import { waitForSectionPut, type SectionPut } from './writes.ts'

export type UnitDimension = 'length' | 'force' | 'moment' | 'stress' | 'mass' | 'temperature'

const UNIT_LABEL: Record<UnitDimension, string> = { length: 'Length', force: 'Force', moment: 'Moment', stress: 'Stress', mass: 'Mass', temperature: 'Temperature' }

/** Left navigation of the Project workspace (aside "Project sections"), e.g. "Units & Preferences", "Bridge Information", "Cost Database". */
export async function openProjectSection(page: Page, label: string): Promise<void> {
  await page.getByRole('complementary', { name: 'Project sections' }).getByRole('button', { name: label, exact: true }).click()
}

/** Select of one unit dimension on Project > Units & Preferences. */
export function unitSelect(page: Page, dimension: UnitDimension): Locator {
  return page.locator('main.spn-project-center').getByLabel(UNIT_LABEL[dimension], { exact: true })
}

/**
 * Project > Units & Preferences: selects `value` for `dimension` (units apply immediately and write `workspace`). When the value is
 * already selected nothing is done and null is returned; otherwise it resolves with the PUT workspace carrying the new unit.
 * The caller must be on a Project route (any section); the helper opens Units & Preferences itself.
 */
export async function setProjectUnit(page: Page, projectId: string, dimension: UnitDimension, value: string): Promise<SectionPut<{ project: { units: Record<string, string> } }> | null> {
  const select = unitSelect(page, dimension)
  if (!(await select.isVisible())) await openProjectSection(page, 'Units & Preferences')
  await expect(select).toBeVisible()
  if ((await select.inputValue()) === value) return null
  const put = waitForSectionPut<{ project: { units: Record<string, string> } }>(page, projectId, 'workspace', { predicate: (r) => r.value.project.units[dimension] === value })
  await select.selectOption(value)
  return put
}

export type LoadsTab = 'Self Weight & Permanent' | 'Traffic' | 'Temperature' | 'Wind' | 'Seismic'
export type TrafficSubTab = 'General' | 'Carriageway & Notional Lanes' | 'LM1' | 'LM2' | 'Preview & Validation'

/** Loads workspace top tab (Radix tabs; inactive content is unmounted). */
export async function openLoadsTab(page: Page, label: LoadsTab): Promise<void> {
  await page.getByRole('tab', { name: label, exact: true }).click()
}

/** Active panel of the Traffic sub-tabs. */
export const trafficPanel = (page: Page): Locator => page.locator('.spn-traffic-workspace [role=tabpanel][data-state=active]')

/** Traffic sub tab (call after `openLoadsTab(page, 'Traffic')`). */
export async function openTrafficSubTab(page: Page, label: TrafficSubTab): Promise<void> {
  await page.locator('.spn-traffic-workspace').getByRole('tab', { name: label, exact: true }).click()
}

/** One row of the Self Weight & Permanent formula list (label exactly as shown, e.g. "Guardrail", "TOTAL"). */
export function selfWeightRow(page: Page, label: string): Locator {
  return page.locator('.spn-formula-row').filter({ has: page.locator('.spn-formula-label', { hasText: new RegExp(`^${label}$`) }) })
}

/** Current values of all `input` elements of a row (display text as shown to the engineer). */
export async function rowInputValues(row: Locator): Promise<string[]> {
  await row.locator('input').first().waitFor()
  return row.locator('input').evaluateAll((inputs) => inputs.map((input) => (input as HTMLInputElement).value))
}
