/**
 * docs/e2e/02-proje-kalici-veri.md
 *
 * Otomatikleştirilen: 1 (New Project, POST), 2 (Edit Project -> Project Name -> Save, PUT workspace, Kaydedildi bildirimi),
 * 3 (Length = mm, PUT workspace, bildirim), 4 (GET revision, ad, uzunluk birimi), 5 (Exit, Open..., yenileme).
 * Yerine konan / manuel: belgedeki `E2E Proje 02` oluşturma adı `E2E-02-<ts>-<hex>` olur, `E2E Proje 02 Güncel` adı
 * listede benzersiz kalsın diye `E2E Proje 02 Güncel · <runId>` kullanılır;
 * "üst çubukta kalıcı yazı yok" -> bildirim sayacı + `diagnostics`; yeniden açma ekran görüntüsü rapora ek olarak eklenir.
 */
import { attachScreenshot } from './support/evidence.ts'
import { expect, test } from './support/fixtures.ts'
import { openProjectSection, setProjectUnit, unitSelect } from './support/navigation.ts'
import { createProjectViaUi, editProjectName, exitProjectViaFileMenu, expectActiveProjectName, openProjectViaFileMenu, reloadSettled, runId, uniqueProjectName } from './support/projects.ts'
import { savedToastCount, settleWrites } from './support/writes.ts'

test('02 Sunucu projesini kaydet ve yeniden aç', async ({ page, diagnostics, writes, projectApi }, testInfo) => {
  const run = runId()
  const createdName = uniqueProjectName('02') // docs/e2e/02 adım 1: `E2E Proje 02` (benzersiz E2E- adı)
  const updatedName = `E2E Proje 02 Güncel · ${run}` // docs/e2e/02 adım 2: `E2E Proje 02 Güncel`

  const created = await test.step('1. New Project', () => createProjectViaUi(page, createdName))
  const { projectId } = created

  await test.step('2. Edit Project: ad -> PUT workspace + Kaydedildi', async () => {
    const put = await editProjectName(page, projectId, updatedName)
    expect(put.response.value).toMatchObject({ project: { name: updatedName } })
    await expect.poll(() => savedToastCount(page)).toBe(1)
    await expectActiveProjectName(page, updatedName)
  })

  await test.step('3. Units & Preferences: Length = mm', async () => {
    await openProjectSection(page, 'Units & Preferences')
    const put = await setProjectUnit(page, projectId, 'length', 'mm')
    expect(put, 'Başlangıç birimi zaten mm değil beklenir').not.toBeNull()
    expect(put?.response.value).toMatchObject({ project: { units: { length: 'mm' } } })
    await expect.poll(() => savedToastCount(page)).toBe(2)
  })

  await test.step('4. GET /api/projects/<id>: revision, ad, birim', async () => {
    await settleWrites(writes)
    const document = await projectApi.getProject(projectId)
    expect(document.revision).toBeGreaterThan(created.revision)
    expect(document.workspace.project.name).toBe(updatedName)
    expect(document.workspace.project.units.length).toBe('mm')
  })

  await test.step('5a. Exit -> karşılama ekranı', async () => {
    await exitProjectViaFileMenu(page)
    await expect(page.getByRole('main', { name: 'KOPRUQ Welcome' })).toBeVisible()
    expect(new URL(page.url()).searchParams.has('project')).toBe(false)
  })

  await test.step('5b. Open... -> aynı proje, ad ve mm', async () => {
    await openProjectViaFileMenu(page, updatedName, projectId)
    await expectActiveProjectName(page, updatedName)
    await openProjectSection(page, 'Units & Preferences')
    await expect(unitSelect(page, 'length')).toHaveValue('mm')
    await attachScreenshot(testInfo, page, '02-yeniden-acma')
  })

  await test.step('5c. Sayfa yenileme', async () => {
    await reloadSettled(page, writes, projectId)
    await expect(page).toHaveURL(new RegExp(`[?&]project=${projectId}(&|$)`))
    await expectActiveProjectName(page, updatedName)
    await openProjectSection(page, 'Units & Preferences')
    await expect(unitSelect(page, 'length')).toHaveValue('mm')
  })

  expect(diagnostics.fileChoosers, 'Dosya seçici beklenmez').toBe(0)
  expect(diagnostics.downloads, '.kopruq dışa aktarımı beklenmez').toBe(0)
  diagnostics.expectClean()
})
