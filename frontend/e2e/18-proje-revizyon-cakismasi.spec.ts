/**
 * docs/e2e/18-proje-revizyon-cakismasi.md
 *
 * Otomatikleştirilen: ön koşul (iki sayfa, aynı `?project`), 1 (A: PUT 200), 2 (B: eski revizyon, PUT 409), 3 (kırmızı bildirim, 8 sn
 * sonra kalkma, Ctrl+S ile geri gelme, yeni istek yok), 4 (Exit -> "Kaydedilmemiş değişiklikler", TEKRAR DENE pasif, İPTAL), 5 (Yeniden yükle).
 * Yerine konan / manuel: belgedeki ayrı "sekmeler" aynı tarayıcı bağlamında iki `Page`dir; "fare üstündeyken bildirim kalkmaz" davranışı
 * yalnız dolaylı doğrulanır (fare uzaklaştırılıp bildirimin kalkması beklenir). Proje adları belgedeki `E2E Çakışma A` / `E2E Çakışma B`
 * metnine çalıştırma kimliği eklenerek benzersiz yapılır.
 * İzin (yalnız bu test): sayfa B'de PUT /workspace 409 ve Chromium'un buna ait "Failed to load resource" console mesajı.
 */
import { expect, test } from './support/fixtures.ts'
import { createProjectViaUi, editProjectName, uniqueProjectName, runId } from './support/projects.ts'
import { E2E_API_BASE } from './support/env.ts'
import { failedToastCount, savedToastCount, settleWrites } from './support/writes.ts'

test.setTimeout(120_000)

test('18 İki sekmede proje revizyonu çakışması', async ({ page: pageA, context, diagnostics, writes, projectApi }) => {
  const run = runId()
  const nameA = `E2E Çakışma A · ${run}` // docs/e2e/18 adım 1: `E2E Çakışma A`
  const nameB = `E2E Çakışma B · ${run}` // docs/e2e/18 adım 2: `E2E Çakışma B`
  const putUrl = (id: string) => `${E2E_API_BASE}/api/projects/${id}/workspace`

  const created = await createProjectViaUi(pageA, uniqueProjectName('18'))
  const { projectId } = created
  diagnostics.allowApiStatus({ method: 'PUT', url: putUrl(projectId), status: 409 }, 'docs/e2e/18 adım 2: eski revizyonla giden yazma 409 ile reddedilir')

  const pageB = await context.newPage()
  diagnostics.attach(pageB)
  writes.attach(pageB)

  await test.step('Ön koşul: iki sayfa Project Overview', async () => {
    await pageA.goto(`/project?project=${projectId}`)
    await pageB.goto(`/project?project=${projectId}`)
    for (const page of [pageA, pageB]) {
      await expect(page.locator('main.spn-project-center').getByRole('button', { name: 'Edit Project' })).toBeVisible()
    }
  })

  const alertB = pageB.getByRole('alert', { name: 'Kayıt bildirimi' })
  let revisionA = 0

  await test.step('1. A: ad -> PUT 200', async () => {
    const put = await editProjectName(pageA, projectId, nameA)
    expect(put.request.expectedRevision).toBe(created.revision)
    revisionA = put.response.revision ?? 0
    expect(revisionA).toBeGreaterThan(created.revision)
    await expect.poll(() => savedToastCount(pageA)).toBeGreaterThanOrEqual(1)
  })

  await test.step('2. B: eski revizyon -> 409', async () => {
    const put = await editProjectName(pageB, projectId, nameB, { status: 409 })
    expect(put.response.code).toBe('PROJECT_REVISION_CONFLICT')
    expect(put.request.expectedRevision).toBeLessThan(revisionA)
    expect((await projectApi.getProject(projectId)).workspace.project.name, 'Sunucuda A değeri korunur').toBe(nameA)
  })

  await test.step('3. B: çakışma bildirimi, kalkma, Ctrl+S ile geri gelme', async () => {
    await expect(alertB.getByText('Çakışma: proje başka bir yerde değiştirildi.')).toBeVisible()
    await expect(alertB.getByRole('button', { name: 'Yeniden yükle' })).toBeVisible()
    expect(await savedToastCount(pageB), 'B için Kaydedildi bildirimi çıkmaz').toBe(0)
    expect(await failedToastCount(pageB)).toBeGreaterThanOrEqual(1)

    await pageB.mouse.move(0, 0)
    await expect(alertB).toBeHidden({ timeout: 12_000 })

    const putsBefore = diagnostics.apiCalls({ method: 'PUT' }).length
    await pageB.keyboard.press('Control+S')
    await expect(alertB.getByText('Çakışma: proje başka bir yerde değiştirildi.')).toBeVisible()
    await settleWrites(writes)
    expect(diagnostics.apiCalls({ method: 'PUT' }).length, 'Ctrl+S çakışmada yeni istek göndermez').toBe(putsBefore)
  })

  await test.step('4. B: Exit -> Kaydedilmemiş değişiklikler, İPTAL', async () => {
    await pageB.mouse.move(0, 0)
    await pageB.getByRole('button', { name: 'File', exact: true }).click()
    await pageB.getByRole('button', { name: '× Exit', exact: true }).click()
    const dialog = pageB.getByRole('dialog', { name: 'Kaydedilmemiş değişiklikler' })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'TEKRAR DENE' })).toBeDisabled()
    await expect(dialog.getByRole('button', { name: 'DEĞİŞİKLİKLERİ AT' })).toBeEnabled()
    await expect(dialog.getByRole('button', { name: 'İPTAL' })).toBeEnabled()
    await dialog.getByRole('button', { name: 'İPTAL' }).click()
    await expect(dialog).toBeHidden()
    await expect(pageB).toHaveURL(new RegExp(`[?&]project=${projectId}(&|$)`))
  })

  await test.step('5. B: Yeniden yükle -> sunucu verisi (A)', async () => {
    if (!(await alertB.isVisible())) {
      await pageB.mouse.move(0, 0)
      await pageB.keyboard.press('Control+S')
      await expect(alertB).toBeVisible()
    }
    await pageB.mouse.move(0, 0)
    const savedBefore = await savedToastCount(pageB)
    const putsBefore = diagnostics.apiCalls({ method: 'PUT' }).length
    const getResponse = pageB.waitForResponse((r) => r.request().method() === 'GET' && r.url() === `${E2E_API_BASE}/api/projects/${projectId}`)
    await alertB.getByRole('button', { name: 'Yeniden yükle' }).click()
    expect((await getResponse).status()).toBe(200)
    await expect(pageB.locator('.spn-active-project strong')).toHaveText(nameA)
    await expect(alertB).toBeHidden()
    expect(await savedToastCount(pageB), 'Yeniden yükleme Kaydedildi bildirimi üretmez').toBe(savedBefore)
    await settleWrites(writes)
    expect(diagnostics.apiCalls({ method: 'PUT' }).length, 'Yeniden yükleme yazma yapmaz').toBe(putsBefore)
  })

  diagnostics.expectClean()
})
