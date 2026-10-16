import { expect, type Page } from '@playwright/test'
import { openProjectSection } from './navigation.ts'
import type { BridgeRow } from './scenarioData.ts'
import { waitForSectionPut } from './writes.ts'

export type AddedBridge = { id: string; no: string }

type WorkspaceValue = { bridges: { id: string; no: string }[] }
type DefinitionsValue = { definitions: { bridgeId: string }[] }

/**
 * Project > Bridge Information > "+ Add bridge": fills the form from `row`, saves, and waits for both writes of that save
 * (`PUT workspace`, then `PUT bridge-definitions`; both must be 200). Resolves with the new bridge's id from the workspace response.
 */
export async function addBridgeViaUi(page: Page, projectId: string, row: BridgeRow): Promise<AddedBridge> {
  const addButton = page.getByRole('button', { name: '+ Add bridge' })
  if (!(await addButton.isVisible())) await openProjectSection(page, 'Bridge Information')
  await expect(addButton).toBeVisible()
  const existing = await page.getByRole('button', { name: /^Edit (?!Project)/ }).count()
  await addButton.click()
  const form = page.locator('div.spn-card').filter({ has: page.getByRole('heading', { name: 'Add bridge' }) }).last()
  const field = (label: string) => form.locator('label.spn-field').filter({ has: page.locator('span', { hasText: new RegExp(`^${label.replace(/[()]/g, '\\$&')}$`) }) }).locator('input')
  await field('No').fill(row.no)
  await field('KM').fill(row.km)
  await field('Crossing Type').fill(row.crossingType)
  await field('Estimated Length (m)').fill(row.estimatedLengthM)
  await field('Road Width (m)').fill(row.roadWidthM)
  await field('Terrain').fill(row.terrain)
  await field('Status').fill(row.status)

  const workspacePut = waitForSectionPut<WorkspaceValue>(page, projectId, 'workspace', { predicate: (r) => r.value.bridges.some((b) => b.no === row.no) })
  const definitionsPut = waitForSectionPut<DefinitionsValue>(page, projectId, 'bridge-definitions', { predicate: (r) => r.value.definitions.length === existing + 1 })
  await form.getByRole('button', { name: 'Save', exact: true }).click()
  const workspace = await workspacePut
  await definitionsPut
  const bridge = workspace.request.value.bridges.find((b) => b.no === row.no)
  expect(bridge?.id, `Köprü ${row.no} için id`).toBeTruthy()
  await expect(page.getByRole('button', { name: `Edit ${row.no}`, exact: true })).toBeVisible()
  return { id: bridge!.id, no: row.no }
}
