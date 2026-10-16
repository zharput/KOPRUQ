/**
 * docs/e2e/13-kopru-tanimi.md
 *
 * Otomatikleştirilen: ön koşul (E2E-A köprüsü, docs/e2e/04 tablosu), 1 (Span Layout, doğru köprü seçili), 2 (`30, 40, 50` -> toplam 120 m),
 * 3 (Axis Definition: A1 0, P1 30, P2 70, A2 120), 4 (Plan/Profile/3D), 5 (PUT bridge-definitions, yenileme ve Exit/Open sonrası korunma).
 * Yerine konan / manuel: "Kaydedildi" bildirimi PUT yanıtı + bildirim sayacıyla kanıtlanır; 3B modunda arazi yüklenmediği için yalnız boş durum
 * metni ve canvas yokluğu kontrol edilir. Seçili aks ve görünüm modu yenileme sonrası assert edilmez (arayüz durumu, belgeye uygun).
 * Görünüm değişimi için `bridge-definitions` PUT'u beklenmez (expectNoPutDuring).
 */
import { addBridgeViaUi } from './support/bridges.ts'
import { expect, test } from './support/fixtures.ts'
import { createProjectViaUi, exitProjectViaFileMenu, gotoInProject, openProjectViaFileMenu, reloadSettled, uniqueProjectName } from './support/projects.ts'
import { AXES_30_40_50, BRIDGE_A, SPAN_TEXT, SPAN_TOTAL_M } from './support/scenarioData.ts'
import { expectNoPutDuring, savedToastCount, settleWrites, waitForSectionPut } from './support/writes.ts'
import type { Page } from '@playwright/test'

type Definitions = { definitions: { bridgeId: string; spanLengthsM: number[]; axes: { name: string; type: string; chainageM: number }[] }[] }

async function expectAxisTable(page: Page) {
  const rows = page.locator('table.spn-bd-axis-table tbody tr')
  await expect(rows).toHaveCount(AXES_30_40_50.length)
  for (const [index, axis] of AXES_30_40_50.entries()) {
    const cells = rows.nth(index).locator('td')
    await expect(cells.nth(0)).toHaveText(axis.name)
    await expect(cells.nth(1)).toHaveText(axis.type)
    await expect(cells.nth(2)).toHaveText(String(axis.chainageM))
  }
}

test('13 Bridge Definition açıklıkları ve aksları', async ({ page, diagnostics, writes, projectApi }) => {
  const name = uniqueProjectName('13')
  const { projectId } = await createProjectViaUi(page, name)
  const bridge = await addBridgeViaUi(page, projectId, BRIDGE_A)

  await gotoInProject(page, writes, projectId, '/bridge-definition/span-arrangement/span-layout')
  const selector = page.getByLabel('Bridge selector')
  const spans = page.getByLabel('Selected span lengths')

  await test.step('1. Span Layout: doğru köprü seçili', async () => {
    await expect(selector).toBeVisible()
    await expect(selector).toHaveValue(bridge.id)
    await expect(page.getByRole('heading', { level: 1, name: 'Span Layout' })).toBeVisible()
  })

  await test.step('2. 30, 40, 50 -> toplam ve aks tablosu', async () => {
    const savedBefore = await savedToastCount(page)
    const put = waitForSectionPut<Definitions>(page, projectId, 'bridge-definitions', {
      predicate: (r) => r.value.definitions.some((d) => d.bridgeId === bridge.id && d.spanLengthsM.join(',') === SPAN_TEXT.replace(/ /g, '')),
    })
    await spans.fill(SPAN_TEXT)
    await expect(page.locator('.spn-bd-fact', { hasText: 'Selected total span length' }).locator('strong')).toHaveText(`${SPAN_TOTAL_M} m`)
    await expectAxisTable(page)
    const result = await put
    const sent = result.request.value.definitions.find((d) => d.bridgeId === bridge.id)!
    expect(sent.axes.map((axis) => ({ name: axis.name, type: axis.type, chainageM: axis.chainageM }))).toEqual(AXES_30_40_50)
    await expect.poll(() => savedToastCount(page)).toBeGreaterThan(savedBefore)
  })

  await test.step('3. Axis Definition: A1, P1, P2, A2', async () => {
    await page.getByRole('complementary', { name: 'Bridge Definition sections' }).getByRole('button', { name: 'Axis Definition', exact: true }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Axis Definition' })).toBeVisible()
    await expectAxisTable(page)
  })

  await test.step('4. Bridge Overview: Plan, Profile, 3D (PUT yok)', async () => {
    await settleWrites(writes)
    await page.getByRole('complementary', { name: 'Bridge Definition sections' }).getByRole('button', { name: 'Bridge Overview', exact: true }).click()
    const modes = page.locator('.spn-bd-view-modes')
    await expectNoPutDuring(writes, 'bridge-definitions', async () => {
      await modes.getByRole('button', { name: 'Plan', exact: true }).click()
      await expect(page.getByRole('img', { name: `Bridge plan view for ${BRIDGE_A.no}` })).toBeVisible()
      await modes.getByRole('button', { name: 'Profile', exact: true }).click()
      await expect(page.getByRole('img', { name: `Bridge profile view for ${BRIDGE_A.no}` })).toBeVisible()
      await expect(page.getByText(`Span arrangement: ${SPAN_TEXT.replace(/, /g, ' · ')} m`)).toBeVisible()
      await modes.getByRole('button', { name: '3D', exact: true }).click()
      await expect(page.getByText('No project terrain dataset is loaded.')).toBeVisible()
      await expect(page.locator('canvas')).toHaveCount(0)
    })
  })

  await test.step('5a. Sunucu: açıklıklar ve aks konumları', async () => {
    await settleWrites(writes)
    const stored = (await projectApi.getProject(projectId)).bridgeDefinitions.definitions.find((d) => d.bridgeId === bridge.id)!
    expect(stored.spanLengthsM).toEqual(SPAN_TEXT.split(',').map(Number))
    expect(stored.axes.map((axis) => ({ name: axis.name, type: axis.type, chainageM: axis.chainageM }))).toEqual(AXES_30_40_50)
  })

  await test.step('5b. Yenileme sonrası korunur', async () => {
    await reloadSettled(page, writes, projectId)
    await gotoInProject(page, writes, projectId, '/bridge-definition/span-arrangement/span-layout')
    await expect(spans).toHaveValue(SPAN_TEXT)
    await expectAxisTable(page)
  })

  await test.step('5c. Exit -> Open... sonrası korunur', async () => {
    await settleWrites(writes)
    await exitProjectViaFileMenu(page)
    await openProjectViaFileMenu(page, name, projectId)
    await gotoInProject(page, writes, projectId, '/bridge-definition/span-arrangement/span-layout')
    await expect(spans).toHaveValue(SPAN_TEXT)
    await expectAxisTable(page)
  })

  diagnostics.expectClean()
})
