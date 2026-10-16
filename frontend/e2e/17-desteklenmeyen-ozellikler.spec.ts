/**
 * docs/e2e/17-desteklenmeyen-ozellikler.md
 *
 * Otomatikleştirilen: 1 (/optimization), 2 (/bim-export), 3 (Loads > Traffic > LM2), 4 (/bridge-definition/assembly/validation).
 * Yerine konan / manuel: belgenin "veri girilmez" ön koşulu 4. adımın Validation tablosu için bir köprü gerektirir (köprüsüz ekran yalnız
 * boş durum gösterir); spec önce köprüsüz boş durumu kontrol eder, sonra Project > Bridge Information'dan test köprüsü ekler (plan bulgusu B6).
 * "Dört ekran görüntüsü" -> rapora ekran görüntüsü ekleri. "Sahte sayı/başarı rozeti yok" yalnız metin/yapı düzeyinde doğrulanır.
 */
import { attachScreenshot } from './support/evidence.ts'
import { addBridgeViaUi } from './support/bridges.ts'
import { expect, test } from './support/fixtures.ts'
import { openLoadsTab, openTrafficSubTab, trafficPanel } from './support/navigation.ts'
import { createProjectViaUi, gotoInProject, uniqueProjectName } from './support/projects.ts'
import { BRIDGE_A } from './support/scenarioData.ts'

test('17 Desteklenmeyen ekranların dürüst durumu', async ({ page, diagnostics, writes }, testInfo) => {
  const { projectId } = await createProjectViaUi(page, uniqueProjectName('17'))

  await test.step('1. /optimization yalnız iskelet', async () => {
    await gotoInProject(page, writes, projectId, '/optimization')
    await expect(page.getByRole('heading', { level: 1, name: 'Optimization Workspace' })).toBeVisible()
    await expect(page.getByText('Design Variables — workspace placeholder')).toBeVisible()
    await expect(page.getByText(/pareto/i)).toHaveCount(0)
    await expect(page.locator('table')).toHaveCount(0)
    await attachScreenshot(testInfo, page, '17-1-optimization')
  })

  await test.step('2. /bim-export dışa aktarma yok', async () => {
    await gotoInProject(page, writes, projectId, '/bim-export')
    await expect(page.getByRole('heading', { level: 1, name: 'BIM / Export Workspace' })).toBeVisible()
    await expect(page.getByText('Allplan — workspace placeholder')).toBeVisible()
    await expect(page.locator('table')).toHaveCount(0)
    expect(diagnostics.downloads).toBe(0)
    await attachScreenshot(testInfo, page, '17-2-bim-export')
  })

  await test.step('3. Loads > Traffic > LM2: NOT IMPLEMENTED, kontrol yok', async () => {
    await gotoInProject(page, writes, projectId, '/loads')
    await openLoadsTab(page, 'Traffic')
    await openTrafficSubTab(page, 'LM2')
    const panel = trafficPanel(page)
    await expect(panel.getByText('NOT IMPLEMENTED')).toBeVisible()
    await expect(panel.locator('button, input, select, textarea')).toHaveCount(0)
    await attachScreenshot(testInfo, page, '17-3-lm2')
  })

  await test.step('4a. Köprüsüz validation: yalnız boş durum', async () => {
    await gotoInProject(page, writes, projectId, '/bridge-definition/assembly/validation')
    await expect(page.getByText(/Add a bridge in Project > Bridge Information/)).toBeVisible()
    await expect(page.getByText('Engineering validation')).toHaveCount(0)
  })

  await test.step('4b. Köprüyle validation: yalnız yapılandırma envanteri', async () => {
    await gotoInProject(page, writes, projectId, '/project/bridge-information')
    await addBridgeViaUi(page, projectId, BRIDGE_A)
    await gotoInProject(page, writes, projectId, '/bridge-definition/assembly/validation')
    await expect(page.getByRole('heading', { level: 1, name: 'Validation' })).toBeVisible()
    await expect(page.getByText('Configuration inventory only; this is not an engineering validation.')).toBeVisible()
    await expect(page.getByRole('row', { name: /Engineering validation\s+Not implemented/ })).toBeVisible()
    await attachScreenshot(testInfo, page, '17-4-validation')
  })

  diagnostics.expectClean()
})
