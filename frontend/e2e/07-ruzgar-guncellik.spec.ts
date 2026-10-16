/**
 * docs/e2e/07-ruzgar-guncellik.md
 *
 * Otomatikleştirilen: 1-3 (vb 27, Terrain II, ze 10; Calculate Wind; POST /api/wind-loads/resolve; VALID ise Wind Actions ve Details,
 * INVALID ise açık mesaj; PUT loads/wind-snapshot), 4 (vb 28: STALE, sonuç gizli, yeni istek yok), 5 (Calculate: STALE kalkar),
 * 6 (yenileme: girdiler ve güncel anlık görüntü geri gelir, STALE yok), geçme ölçütü "ağ hatası/400": `page.route` ile simüle edilen 400.
 * Yerine konan / manuel: sayısal rüzgâr değerleri sabit yazılmaz (yanıttan türetilir). 200 dönen INVALID yanıt da anlık görüntü olarak yazılır
 * (plan bulgusu B5); "başarısız hesap için yeni anlık görüntü yazılmaz" ölçütü istek hatası (400) için doğrulanır. Gerçek ağ kesintisi (sunucu
 * kapalı) manuel kalır; hata yolu `page.route` ile simüle edilir.
 * İzin (yalnız bu test): simüle POST /api/wind-loads/resolve 400 ve Chromium'un buna ait "Failed to load resource" console mesajı.
 */
import { randomBytes } from 'node:crypto'
import { jsonOf } from './support/api.ts'
import { E2E_API_BASE, E2E_BASE_URL } from './support/env.ts'
import { expect, test } from './support/fixtures.ts'
import { openLoadsTab } from './support/navigation.ts'
import { createProjectViaUi, gotoInProject, reloadSettled, uniqueProjectName } from './support/projects.ts'
import { WIND } from './support/scenarioData.ts'
import { settleWrites, waitForSectionPut } from './support/writes.ts'

type WindRequest = { vbMs: number; terrainCategory: string; zeM: number }
type WindResult = { status: string; missing?: string; transverseKNm?: number | null }

const isResolve = (match?: (b: WindRequest) => boolean) => (r: { url(): string; request(): { method(): string; postData(): string | null } }) =>
  r.request().method() === 'POST' && new URL(r.url()).pathname === '/api/wind-loads/resolve' &&
  (!match || match(JSON.parse(r.request().postData() ?? 'null') as WindRequest))

test('07 Rüzgâr sonucu güncelliğini kaybettiğinde saklama', async ({ page, diagnostics, writes }) => {
  const resolveUrl = `${E2E_API_BASE}/api/wind-loads/resolve`
  diagnostics.allowApiStatus({ method: 'POST', url: resolveUrl, status: 400 }, 'docs/e2e/07 geçme ölçütü: page.route ile simüle edilen 400 (hata yolu)')

  const { projectId } = await createProjectViaUi(page, uniqueProjectName('07'))
  await gotoInProject(page, writes, projectId, '/loads')
  await openLoadsTab(page, 'Wind')

  const vb = page.getByLabel('Basic Wind Velocity, vb')
  const terrain = page.getByLabel('Terrain Category')
  const ze = page.getByLabel('Reference Height, ze')
  const calculate = page.getByRole('button', { name: 'Calculate Wind' })
  const stale = page.locator('p.spn-hint strong', { hasText: 'STALE' })
  const transverse = page.locator('tr', { hasText: 'Without Traffic' }).locator('td').nth(1)
  const resolveCalls = () => diagnostics.apiCalls({ method: 'POST', url: '/api/wind-loads/resolve' }).length

  await test.step('1-3. vb 27, Terrain II, ze 10 -> Calculate Wind', async () => {
    await vb.fill(WIND.vb)
    await terrain.selectOption(WIND.terrain)
    await ze.fill(WIND.ze)
    const snapshotPut = waitForSectionPut<{ status: string; result: WindResult | null }>(page, projectId, 'loads/wind-snapshot')
    const [response] = await Promise.all([page.waitForResponse(isResolve()), calculate.click()])
    const request = JSON.parse(response.request().postData() ?? 'null') as WindRequest
    expect(request).toMatchObject({ vbMs: Number(WIND.vb), terrainCategory: WIND.terrain, zeM: Number(WIND.ze) })
    const body = await jsonOf<WindResult>(response)
    const put = await snapshotPut
    test.info().annotations.push({ type: 'observed', description: `wind resolve status=${body.status}` })
    expect(put.request.value.status).toBe(body.status)
    if (body.status === 'VALID') {
      expect(put.request.value.result, 'Başarılı hesapta result yazılır').not.toBeNull()
      await expect(transverse).not.toHaveText('—')
      if (typeof body.transverseKNm === 'number') await expect(transverse).toHaveText(`${body.transverseKNm.toFixed(4)} kN/m`)
      await page.getByRole('button', { name: 'Details ▾' }).click()
      await expect(page.getByText('INPUT PARAMETERS')).toBeVisible()
    } else {
      await expect(page.getByText(new RegExp(`Wind result is ${body.status}`))).toBeVisible()
      await expect(transverse).toHaveText('—')
    }
    await expect(stale).toHaveCount(0)
  })

  await test.step('4. vb 28: STALE, sonuç gizli, yeni istek yok', async () => {
    const before = resolveCalls()
    await vb.fill(WIND.vbChanged)
    await expect(stale).toBeVisible()
    await expect(transverse).toHaveText('—')
    await settleWrites(writes)
    expect(resolveCalls(), 'Girdi değişince otomatik hesap isteği gitmez').toBe(before)
  })

  await test.step('5. Calculate Wind: STALE kalkar', async () => {
    const [response] = await Promise.all([page.waitForResponse(isResolve((b) => b.vbMs === Number(WIND.vbChanged))), calculate.click()])
    expect((await jsonOf<WindResult>(response)).status).toBeTruthy()
    await expect(stale).toHaveCount(0)
  })

  await test.step('6. Yenileme: girdiler ve güncel sonuç', async () => {
    await settleWrites(writes)
    await reloadSettled(page, writes, projectId)
    await openLoadsTab(page, 'Wind')
    await expect(vb).toHaveValue(WIND.vbChanged)
    await expect.poll(async () => Number(await ze.inputValue())).toBeCloseTo(Number(WIND.ze), 6)
    await expect(stale).toHaveCount(0)
  })

  await test.step('Hata yolu: simüle 400 -> Ref kimliği, önceki sonuç notu, yeni anlık görüntü yok', async () => {
    const correlationId = `e2e-${randomBytes(4).toString('hex')}`
    const cors = { 'Access-Control-Allow-Origin': E2E_BASE_URL, 'Access-Control-Expose-Headers': 'X-Correlation-ID', 'Access-Control-Allow-Headers': 'Content-Type, X-Correlation-ID', 'Access-Control-Allow-Methods': 'GET, POST, PUT, HEAD' }
    await page.route(resolveUrl, async (route) => {
      if (route.request().method() === 'OPTIONS') { await route.fulfill({ status: 204, headers: cors }); return }
      await route.fulfill({
        status: 400, contentType: 'application/json', headers: { ...cors, 'X-Correlation-ID': correlationId },
        body: JSON.stringify({ status: 400, error: 'Bad Request', code: 'E2E_SIMULATED', message: 'Simulated wind failure', path: '/api/wind-loads/resolve', correlationId }),
      })
    })
    const snapshotPutsBefore = writes.count('loads/wind-snapshot')
    await calculate.click()
    const alert = page.locator('p[role=alert].spn-error')
    await expect(alert).toContainText(`(Ref: ${correlationId})`)
    await expect(alert).toContainText('The values below are from the previous calculation.')
    await settleWrites(writes)
    expect(writes.count('loads/wind-snapshot'), 'Başarısız hesap için yeni anlık görüntü yazılmaz').toBe(snapshotPutsBefore)
    await page.unroute(resolveUrl)
  })

  diagnostics.expectClean()
})
