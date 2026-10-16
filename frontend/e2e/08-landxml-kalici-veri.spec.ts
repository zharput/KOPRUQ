/**
 * docs/e2e/08-landxml-kalici-veri.md
 *
 * Otomatikleştirilen: ön koşul (E2E-A köprüsü; Bridge Definition ekranı köprü ister), 1 (Import Terrain ile sample.landxml), 2 (POST /api/landxml/inspect,
 * Surface = Existing Ground, 4 nokta / 2 yüz / metre), 3 (Coordinate 1 = Y; coordinate 2 = X ve Alignment = Main Alignment; CRS etiketi değiştirilmez),
 * 4 (Import selected TIN, POST /api/landxml/import, özet), 5 (önizleme canvas'ı, GET /api/terrain/<terrainId>/mesh, proje arazi/aktarım referansları),
 * 6'nın ikamesi (yenileme ve YENİ bir istek bağlamıyla mesh GET).
 * MANUEL KALAN: 6. adımın backend süreci durdurup aynı veritabanıyla yeniden başlatma kısmı Playwright ile yapılmaz (backend'i başlatmak/durdurmak kapsam
 * dışı). İkame yeniden başlatmayı KANITLAMAZ: yalnız verinin sunucuda bulunduğunu ve tarayıcı oturumundan bağımsız okunabildiğini gösterir.
 * Yerine konan / manuel: 3B görüntünün doğruluğu manuel (yalnız canvas varlığı); durum `VALID` veya `REVIEW_REQUIRED` olabilir (sabitlenmez), uyarılar ekranda aranır.
 */
import { jsonOf } from './support/api.ts'
import { addBridgeViaUi } from './support/bridges.ts'
import { E2E_API_BASE } from './support/env.ts'
import { chooseFile, LANDXML_FIXTURE } from './support/files.ts'
import { expect, test } from './support/fixtures.ts'
import { createProjectViaUi, gotoInProject, reloadSettled, uniqueProjectName } from './support/projects.ts'
import { BRIDGE_A, LANDXML_DOC } from './support/scenarioData.ts'
import { settleWrites } from './support/writes.ts'

type ImportResult = { status: string; id: string; terrainId: string; pointCount: number; triangleCount: number; hasAlignment: boolean; warnings: string[]; source: { surfaceName: string; coordinateOrder: string } }

test('08 LandXML içe aktarma ve backend kalıcılığı', async ({ page, playwright, diagnostics, writes, projectApi }) => {
  const { projectId } = await createProjectViaUi(page, uniqueProjectName('08'))
  await addBridgeViaUi(page, projectId, BRIDGE_A)
  await gotoInProject(page, writes, projectId, '/bridge-definition/alignment/terrain-reference')
  const center = page.locator('main.spn-bridge-center')
  const field = (label: RegExp) => center.locator('label.spn-field').filter({ has: page.locator('span', { hasText: label }) }).locator('select')

  await test.step('1-2. Import Terrain: inspect ve önizleme', async () => {
    await expect(center.getByRole('heading', { name: 'Terrain Reference' })).toBeVisible()
    await expect(center.getByText('No terrain dataset referenced')).toBeVisible()
    const [inspect] = await Promise.all([
      page.waitForResponse((r) => r.request().method() === 'POST' && new URL(r.url()).pathname === '/api/landxml/inspect'),
      chooseFile(page, center.getByRole('button', { name: 'Import Terrain' }), LANDXML_FIXTURE),
    ])
    expect(inspect.status()).toBe(200)
    await expect(center.getByText(`Units: ${LANDXML_DOC.units}`)).toBeVisible()
    await field(/^Surface$/).selectOption(LANDXML_DOC.surface)
    await expect(center.getByText(`Points: ${LANDXML_DOC.points} | Faces: ${LANDXML_DOC.faces}`)).toBeVisible()
  })

  let result: ImportResult
  await test.step('3-4. Eşleme, güzergâh ve Import selected TIN', async () => {
    await field(/^Source coordinate mapping/).selectOption(LANDXML_DOC.coordinateOrder)
    await field(/^Alignment \(optional/).selectOption(LANDXML_DOC.alignment)
    const [response] = await Promise.all([
      page.waitForResponse((r) => r.request().method() === 'POST' && new URL(r.url()).pathname === '/api/landxml/import'),
      center.getByRole('button', { name: 'Import selected TIN' }).click(),
    ])
    expect(response.status()).toBe(200)
    result = await jsonOf<ImportResult>(response)
    // Multipart istek gövdesi Playwright'ta okunamaz; seçilen yüzey ve eşleme içe aktarma yanıtındaki `source` alanından doğrulanır.
    expect(result.source).toMatchObject({ surfaceName: LANDXML_DOC.surface, coordinateOrder: LANDXML_DOC.coordinateOrder })
    expect(['VALID', 'REVIEW_REQUIRED']).toContain(result.status)
    test.info().annotations.push({ type: 'observed', description: `landxml import status=${result.status}, warnings=${result.warnings.length}` })
    expect(result.pointCount).toBe(LANDXML_DOC.points)
    expect(result.triangleCount).toBe(LANDXML_DOC.faces)
    expect(result.hasAlignment).toBe(true)
    await expect(center.getByRole('heading', { name: `Import summary - ${result.status}` })).toBeVisible()
    await expect(center.getByText(`Mapping: ${LANDXML_DOC.coordinateOrder}`)).toBeVisible()
    await expect(center.getByText(new RegExp(`Points: ${LANDXML_DOC.points} / source ${LANDXML_DOC.points} \\| Triangles: ${LANDXML_DOC.faces} / source ${LANDXML_DOC.faces}`))).toBeVisible()
    for (const warning of result.warnings) await expect(center.getByText(warning, { exact: true }).first()).toBeVisible()
  })

  await test.step('5. Önizleme, mesh ve proje referansları', async () => {
    await expect(center.locator('canvas').first()).toBeVisible()
    const mesh = await projectApi.get(`/api/terrain/${result.terrainId}/mesh`)
    expect(mesh.status).toBe(200)
    await settleWrites(writes)
    await expect.poll(async () => (await projectApi.getProject(projectId)).workspace.project.environment.terrainDatasetId).toBe(result.terrainId)
    expect((await projectApi.getProject(projectId)).workspace.project.environment.landXmlImportId).toBe(result.id)
  })

  await test.step('6 (ikame). Yenileme ve yeni istek bağlamıyla mesh', async () => {
    await reloadSettled(page, writes, projectId)
    await expect(center.locator('.spn-bd-editor-title span')).toHaveText(result.terrainId)
    const document = await projectApi.getProject(projectId)
    expect(document.workspace.project.environment.terrainDatasetId).toBe(result.terrainId)
    expect(document.workspace.project.environment.landXmlImportId).toBe(result.id)
    const fresh = await playwright.request.newContext()
    try {
      expect((await fresh.get(`${E2E_API_BASE}/api/terrain/${result.terrainId}/mesh`)).status()).toBe(200)
    } finally {
      await fresh.dispose()
    }
  })

  diagnostics.expectClean()
})
