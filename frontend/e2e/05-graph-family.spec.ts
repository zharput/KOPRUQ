/**
 * docs/e2e/05-graph-family.md
 *
 * Otomatikleştirilen: ön koşul (E2E-A köprüsü, boş graph), 1 (Steel Girder), 2 (Structural Steel, Steel Class S355), 3 (bağlama: PUT'ta connection,
 * kenar sayısı 1, log "Connection created:"), 4 (Run: SUCCESS, log, aday), 5 (Family: VALID, CANDIDATE SECTIONS), 6-7 (Girder Height 2.5 -> 2.6, Run
 * yapmadan Family: STALE; sonra Run: VALID ve yeni değer), 8 (yenileme: düğümler, bağlantı, parametre korunur; Family adayları geri gelmez).
 * Yerine konan / manuel: belge 1. ve 3. adımda "Run öncesi ERROR" der; kodda ERROR ve `Input Structural Steel is not connected.` yalnız bir Run SONRASI çıkar
 * (plan bulgusu B1) -> spec bağlamadan bir Run yapıp bunu doğrular, Run öncesi ERROR assert etmez. Düğümler sürüklenmeden eklenir (Node Library tıklaması,
 * Fit View ile handle'lar görünür); sürükle-bırak yalnız bağlantıda kullanılır. Adım 9 (isteğe bağlı negatif kontrol: başka köprüde Family) MANUEL kalır.
 * Ekran görüntüleri rapora ek olarak eklenir. Aday sayısı yazılı değildir: düğümde gösterilen sayıdan okunur.
 */
import type { Page } from '@playwright/test'
import { addBridgeViaUi } from './support/bridges.ts'
import { attachScreenshot } from './support/evidence.ts'
import { expect, test } from './support/fixtures.ts'
import { addLibraryNode, canvasNodes, connectHandles, nodeById, openGraphLog, runGraphButton } from './support/graph.ts'
import { createProjectViaUi, gotoInProject, reloadSettled, uniqueProjectName } from './support/projects.ts'
import { BRIDGE_A, GIRDER_HEIGHT, GIRDER_NOT_CONNECTED, STEEL_CLASS } from './support/scenarioData.ts'
import { settleWrites, waitForSectionPut } from './support/writes.ts'

test.setTimeout(180_000)

type GraphValue = {
  id: string
  bridgeId: string
  nodes: { id: string; type: string; parameters: { key: string; value: unknown }[] }[]
  connections: { sourceNodeId: string; sourcePortId: string; targetNodeId: string; targetPortId: string }[]
}

const GRAPH_PUT = /^graphs\/.+/

async function openSteelGirderFamily(page: Page) {
  await page.getByRole('navigation', { name: 'Workspaces' }).getByRole('link', { name: 'Family', exact: true }).click()
  await page.locator('aside[aria-label="Family Library"]').getByRole('button', { name: 'Steel Girder', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'STEEL GIRDER FAMILY' })).toBeVisible()
}
const freshness = (page: Page) => page.locator('[aria-label="Result freshness"] .family-freshness-badge strong')

async function openGraph(page: Page) {
  await page.getByRole('navigation', { name: 'Workspaces' }).getByRole('link', { name: 'Graph', exact: true }).click()
  await expect(runGraphButton(page)).toBeVisible()
}

test('05 Graph çalıştır, Family sonucunun güncelliğini izle', async ({ page, diagnostics, writes, projectApi }, testInfo) => {
  const { projectId } = await createProjectViaUi(page, uniqueProjectName('05'))
  const bridge = await addBridgeViaUi(page, projectId, BRIDGE_A)
  await gotoInProject(page, writes, projectId, '/graph')
  await page.getByLabel('Bridge', { exact: true }).selectOption(bridge.id)
  await expect(canvasNodes(page)).toHaveCount(0)

  let girderId = ''
  let steelId = ''
  const girder = () => nodeById(page, girderId)

  await test.step('1-2. Steel Girder ve Structural Steel düğümleri', async () => {
    girderId = await addLibraryNode(page, 'Steel Girder')
    steelId = await addLibraryNode(page, 'Structural Steel')
    await expect(nodeById(page, steelId).getByRole('button', { name: 'Steel Class' })).toHaveText(new RegExp(STEEL_CLASS))
    await page.getByRole('button', { name: 'Fit View' }).click()
  })

  await test.step('B1. Bağlantısız Run: ERROR ve eksik bağlantı mesajı', async () => {
    await runGraphButton(page).click()
    await expect(girder()).toContainText('ERROR')
    await expect(girder()).toContainText(GIRDER_NOT_CONNECTED)
    await expect(await openGraphLog(page)).toContainText(GIRDER_NOT_CONNECTED)
    await attachScreenshot(testInfo, page, '05-baglantisiz-error')
  })

  await test.step('3. Bağlantı: material -> material', async () => {
    const put = waitForSectionPut<GraphValue>(page, projectId, GRAPH_PUT, { predicate: (r) => r.value.connections.length === 1 })
    await connectHandles(page, { sourceNodeId: steelId, sourceHandle: 'material', targetNodeId: girderId, targetHandle: 'material' }, 1)
    const { request } = await put
    expect(request.value.connections[0]).toMatchObject({ sourceNodeId: steelId, sourcePortId: 'material', targetNodeId: girderId, targetPortId: 'material' })
    await expect(await openGraphLog(page)).toContainText('Connection created:')
  })

  let candidates = 0
  await test.step('4. Run: SUCCESS, log, aday', async () => {
    await runGraphButton(page).click()
    await expect(girder()).toContainText('SUCCESS')
    await expect(girder()).not.toContainText(GIRDER_NOT_CONNECTED)
    await expect(await openGraphLog(page)).toContainText('Graph execution started.')
    const match = /(\d+) candidates?/.exec(await girder().innerText())
    expect(match, 'Düğümde "N candidate(s)" çıktısı').not.toBeNull()
    candidates = Number(match![1])
    await attachScreenshot(testInfo, page, '05-basarili-run')
  })

  await test.step('5. Family: VALID ve adaylar', async () => {
    await openSteelGirderFamily(page)
    await expect(freshness(page)).toContainText('VALID')
    await expect(page.getByTestId('family-candidate-sections-panel')).toContainText(`CANDIDATE SECTIONS (${candidates})`)
    await attachScreenshot(testInfo, page, '05-family-valid')
  })

  await test.step('6-7. Girder Height 2.5 -> 2.6: STALE; Run: VALID', async () => {
    await openGraph(page)
    const height = page.getByLabel('Girder Height local default')
    await expect(height).toHaveValue(String(GIRDER_HEIGHT.initial))
    await height.fill(String(GIRDER_HEIGHT.changed))
    await height.press('Enter')
    await openSteelGirderFamily(page)
    await expect(freshness(page)).toContainText('STALE')
    await expect(page.getByText('Results are not current - run the graph again.')).toBeVisible()
    await attachScreenshot(testInfo, page, '05-family-stale')

    await openGraph(page)
    await runGraphButton(page).click()
    await expect(girder()).toContainText('SUCCESS')
    await openSteelGirderFamily(page)
    await expect(freshness(page)).toContainText('VALID')
    await expect(page.getByText('Results are not current - run the graph again.')).toHaveCount(0)
    await expect(page.locator('tr', { hasText: 'Girder Height' }).first()).toContainText(GIRDER_HEIGHT.changed.toFixed(2))
  })

  await test.step('8. Yenileme: graph tanımı korunur, Family adayları geri gelmez', async () => {
    await settleWrites(writes)
    const stored = (await projectApi.getProject(projectId)).graphs.find((graph) => graph.bridgeId === bridge.id)
    expect(stored?.nodes).toHaveLength(2)
    expect(stored?.connections).toHaveLength(1)
    expect(JSON.stringify(stored?.nodes.find((node) => node.type === 'structural.girder.steel')?.parameters)).toContain(String(GIRDER_HEIGHT.changed))

    await reloadSettled(page, writes, projectId)
    await gotoInProject(page, writes, projectId, '/graph')
    await page.getByLabel('Bridge', { exact: true }).selectOption(bridge.id)
    await expect(canvasNodes(page)).toHaveCount(2)
    await expect(page.locator('.react-flow__edge')).toHaveCount(1)
    await expect(page.getByLabel('Girder Height local default')).toHaveValue(String(GIRDER_HEIGHT.changed))
    await openSteelGirderFamily(page)
    await expect(page.getByTestId('family-candidate-sections-panel')).toContainText('CANDIDATE SECTIONS (0)')
  })

  diagnostics.expectClean()
})
