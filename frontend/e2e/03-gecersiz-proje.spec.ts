/**
 * docs/e2e/03-gecersiz-proje.md
 *
 * Otomatikleştirilen: 1 (bekleyen yazma yok -> settleWrites), 2 (bulunmayan UUID, GET 404), 3 (hata ekranı, üç düğme, Tekrar dene),
 * 4 (Proje listesi ile gerçek projeyi açma, ad ve mm).
 * Yerine konan / manuel: belgedeki "02'deki proje" bu spec'te kendi projesidir (spec'ler bağımsız); `crypto.randomUUID()` Console
 * adımı yerine Node `randomUUID()`; Network'te 404 kaydı -> `waitForResponse` + `X-Correlation-ID`.
 * İzin (yalnız bu test): GET /api/projects/<bulunmayan-uuid> 404 ve Chromium'un buna ait "Failed to load resource" console mesajı.
 */
import { randomUUID } from 'node:crypto'
import { jsonOf } from './support/api.ts'
import { E2E_API_BASE } from './support/env.ts'
import { expect, test } from './support/fixtures.ts'
import { openProjectSection, setProjectUnit, unitSelect } from './support/navigation.ts'
import { createProjectViaUi, expectActiveProjectName, uniqueProjectName } from './support/projects.ts'
import { settleWrites } from './support/writes.ts'

test('03 Bulunmayan proje kimliğiyle açma hatası', async ({ page, diagnostics, writes }) => {
  const name = uniqueProjectName('03')
  const missingId = randomUUID()
  const missingUrl = `${E2E_API_BASE}/api/projects/${missingId}`
  diagnostics.allowApiStatus({ method: 'GET', url: missingUrl, status: 404 }, 'docs/e2e/03 adım 2-3: bulunmayan proje kimliği için beklenen 404')

  const { projectId } = await createProjectViaUi(page, name)
  await openProjectSection(page, 'Units & Preferences')
  await setProjectUnit(page, projectId, 'length', 'mm')
  await settleWrites(writes)

  const alert = page.getByRole('alert')
  const notFoundCalls = () => diagnostics.apiCalls({ method: 'GET', url: missingUrl, status: 404 })

  await test.step('2. Bulunmayan UUID: GET 404 ve PROJECT_NOT_FOUND', async () => {
    const [response] = await Promise.all([
      page.waitForResponse((r) => r.url() === missingUrl && r.request().method() === 'GET'),
      page.goto(`/project?project=${missingId}`),
    ])
    expect(response.status()).toBe(404)
    expect(await jsonOf<{ code: string }>(response)).toMatchObject({ code: 'PROJECT_NOT_FOUND' })
    expect(notFoundCalls().length).toBeGreaterThanOrEqual(1)
  })

  await test.step('3. Hata ekranı', async () => {
    await expect(alert.getByRole('heading', { level: 1, name: 'Proje açılamadı' })).toBeVisible()
    await expect(alert.getByRole('button', { name: 'Tekrar dene' })).toBeVisible()
    await expect(alert.getByRole('button', { name: 'Proje listesi' })).toBeVisible()
    await expect(alert.getByRole('button', { name: 'Yeni proje' })).toBeVisible()
    const message = (await alert.locator('p').first().textContent()) ?? ''
    expect(message).toMatch(/^Proje bulunamadı: .*\(Ref: .+\)$/)
    const ref = /\(Ref: (.+)\)$/.exec(message)?.[1]
    expect(notFoundCalls().map((call) => call.correlationId), 'Ekrandaki Ref, 404 yanıtının X-Correlation-ID değeridir').toContain(ref)

    const before = notFoundCalls().length
    await alert.getByRole('button', { name: 'Tekrar dene' }).click()
    await expect.poll(() => notFoundCalls().length).toBeGreaterThan(before)
    await expect(alert.getByRole('heading', { name: 'Proje açılamadı' })).toBeVisible()
  })

  await test.step('4. Proje listesi -> gerçek proje, ad ve mm', async () => {
    await alert.getByRole('button', { name: 'Proje listesi' }).click()
    const dialog = page.getByRole('dialog', { name: 'Proje aç' })
    await Promise.all([
      page.waitForResponse((r) => r.url() === `${E2E_API_BASE}/api/projects/${projectId}` && r.status() === 200),
      dialog.getByRole('button', { name }).first().click(),
    ])
    await expect(page).toHaveURL(new RegExp(`[?&]project=${projectId}(&|$)`))
    await expectActiveProjectName(page, name)
    await openProjectSection(page, 'Units & Preferences')
    await expect(unitSelect(page, 'length')).toHaveValue('mm')
  })

  diagnostics.expectClean()
})
