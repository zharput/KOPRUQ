/**
 * docs/e2e/04-kopru-kimligi.md
 *
 * Otomatikleştirilen: 1 (Bridge Information'da E2E-A ve E2E-B, PUT workspace + bridge-definitions), 2 (A: Graph adı `A grafiği` + Number düğümü),
 * 3 (B: boş graph, `B grafiği`), 4 (A'ya dönüş: ad ve düğüm korunur), 5 (yenileme: GET graphs, iki graph, farklı bridgeId; tekrar geçiş).
 * Yerine konan / manuel: "ekran görüntüleri" rapora ek olarak eklenir; yenileme sonrası hangi köprünün seçili açıldığı assert edilmez (belgeye uygun).
 * Node Library düğmesi tıklanarak eklenir (belge sürükleme de kabul eder).
 * Bulgu N2: yeni projede köprüye bağlı olmayan varsayılan "Untitled Graph" da sunucuya yazılır; GET graphs 3 öğedir. Spec köprüye bağlı (bridgeId != null)
 * graph'ların tam 2 olduğunu, bridgeId'lerin farklı ve workspace köprüleriyle eşleştiğini doğrular.
 */
import { attachScreenshot } from './support/evidence.ts'
import { addBridgeViaUi } from './support/bridges.ts'
import { expect, test } from './support/fixtures.ts'
import { addLibraryNode, canvasNodes } from './support/graph.ts'
import { createProjectViaUi, gotoInProject, reloadSettled, uniqueProjectName } from './support/projects.ts'
import { BRIDGE_A, BRIDGE_B, GRAPH_NAME_A, GRAPH_NAME_B } from './support/scenarioData.ts'
import { settleWrites, waitForSectionPut } from './support/writes.ts'

type GraphValue = { id: string; name: string; bridgeId: string; nodes: { id: string; type: string }[]; connections: unknown[] }

test('04 Köprü envanteri ile Graph sahipliği', async ({ page, diagnostics, writes, projectApi }, testInfo) => {
  const { projectId } = await createProjectViaUi(page, uniqueProjectName('04'))

  const a = await test.step('1a. E2E-A', () => addBridgeViaUi(page, projectId, BRIDGE_A))
  const b = await test.step('1b. E2E-B', () => addBridgeViaUi(page, projectId, BRIDGE_B))

  await gotoInProject(page, writes, projectId, '/graph')
  const bridgeSelect = page.getByLabel('Bridge', { exact: true })
  const graphName = page.getByLabel('Graph name')
  const graphDocument = page.getByLabel('Graph document')

  await test.step('2. A: Graph adı ve Number düğümü', async () => {
    await bridgeSelect.selectOption(a.id)
    await expect(graphName).toHaveValue(BRIDGE_A.no)
    const renamed = waitForSectionPut<GraphValue>(page, projectId, /^graphs\/.+/, { predicate: (r) => r.value.name === GRAPH_NAME_A && r.value.bridgeId === a.id })
    await graphName.fill(GRAPH_NAME_A)
    await renamed
    const added = waitForSectionPut<GraphValue>(page, projectId, /^graphs\/.+/, { predicate: (r) => r.value.bridgeId === a.id && r.value.nodes.length === 1 && r.value.nodes[0].type === 'input.number' })
    await addLibraryNode(page, 'Number')
    const put = await added
    expect(put.request.value.name).toBe(GRAPH_NAME_A)
    await attachScreenshot(testInfo, page, '04-A-grafigi')
  })

  await test.step('3. B: boş graph, B grafiği', async () => {
    await bridgeSelect.selectOption(b.id)
    await expect(graphName).toHaveValue(BRIDGE_B.no)
    await expect(canvasNodes(page)).toHaveCount(0)
    const renamed = waitForSectionPut<GraphValue>(page, projectId, /^graphs\/.+/, { predicate: (r) => r.value.name === GRAPH_NAME_B && r.value.bridgeId === b.id })
    await graphName.fill(GRAPH_NAME_B)
    const put = await renamed
    expect(put.request.value.nodes).toHaveLength(0)
    await attachScreenshot(testInfo, page, '04-B-grafigi')
  })

  await test.step('4. A\'ya dönüş: ad ve düğüm korunur, B içeriği taşınmaz', async () => {
    await bridgeSelect.selectOption(a.id)
    await expect(graphName).toHaveValue(GRAPH_NAME_A)
    await expect(canvasNodes(page)).toHaveCount(1)
  })

  await test.step('5. Yenileme: iki graph, farklı köprüler', async () => {
    await settleWrites(writes)
    await reloadSettled(page, writes, projectId)
    const project = await projectApi.getProject(projectId)
    // Yeni projede köprüye bağlı olmayan bir varsayılan "Untitled Graph" da kalıcıdır (bkz. başlık notu); köprüye bağlı graph'lar sayılır.
    const bridged = project.graphs.filter((graph) => graph.bridgeId !== null)
    expect(bridged).toHaveLength(2)
    const byBridge = new Map(bridged.map((graph) => [graph.bridgeId, graph]))
    expect([...byBridge.keys()].sort()).toEqual([a.id, b.id].sort())
    expect(project.workspace.bridges.map((bridge) => bridge.id).sort()).toEqual([a.id, b.id].sort())
    expect(byBridge.get(a.id)?.name).toBe(GRAPH_NAME_A)
    expect(byBridge.get(a.id)?.nodes).toHaveLength(1)
    expect(byBridge.get(b.id)?.name).toBe(GRAPH_NAME_B)
    expect(byBridge.get(b.id)?.nodes).toHaveLength(0)

    await bridgeSelect.selectOption(a.id)
    await expect(graphName).toHaveValue(GRAPH_NAME_A)
    await expect(canvasNodes(page)).toHaveCount(1)
    await bridgeSelect.selectOption(b.id)
    await expect(graphName).toHaveValue(GRAPH_NAME_B)
    await expect(canvasNodes(page)).toHaveCount(0)
    await expect(graphDocument.locator('option', { hasText: GRAPH_NAME_A })).toHaveCount(1)
    await expect(graphDocument.locator('option', { hasText: GRAPH_NAME_B })).toHaveCount(1)
  })

  diagnostics.expectClean()
})
