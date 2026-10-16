/**
 * docs/e2e/15-deprem-durumu.md
 *
 * Otomatikleştirilen: 1 (agR boşken istek ve eğri yok), 2 (agR = 0.2, γI = 1; Ground Type B ve Spectrum Type "Type 1" varsayılanları,
 * POST /api/seismic/spectrum), 3 (VALID: eğri ve Details; INVALID: uyarı, eğri yok), 4 (agR silinince eğri kalkar, yeni istek yok; tekrar 0.2
 * girilince eğri döner), 5 (PUT loads/seismic, yenileme sonrası girdiler geri gelir).
 * Yerine konan / manuel: belge "γI boşken" der, arayüzde γI varsayılanı '1' (plan bulgusu B2); yalnız agR boşluğu test edilir, γI belge
 * değeri (1) yazılır. Eğri varlığı Recharts `.recharts-line-curve` ile; spektrum sayıları sabit yazılmaz. Tekrar 0.2 için yeni POST aranmaz
 * (sorgu önbelleği olabilir).
 */
import { jsonOf } from './support/api.ts'
import { expect, test } from './support/fixtures.ts'
import { openLoadsTab } from './support/navigation.ts'
import { createProjectViaUi, gotoInProject, reloadSettled, uniqueProjectName } from './support/projects.ts'
import { SEISMIC } from './support/scenarioData.ts'
import { settleWrites, waitForSectionPut } from './support/writes.ts'

type SpectrumRequest = { agR: number; importanceFactor: number; groundType: string; spectrumType: string }

test('15 Deprem spektrumu giriş durumu', async ({ page, diagnostics, writes, projectApi }) => {
  const { projectId } = await createProjectViaUi(page, uniqueProjectName('15'))
  await gotoInProject(page, writes, projectId, '/loads')
  await openLoadsTab(page, 'Seismic')

  const agR = page.getByLabel('Reference PGA, agR')
  const gamma = page.getByLabel('Importance Factor, γI')
  const curve = page.locator('.recharts-line-curve')
  const spectrumCalls = () => diagnostics.apiCalls({ method: 'POST', url: '/api/seismic/spectrum' }).length

  await test.step('1. agR boş: istek ve eğri yok', async () => {
    await expect(agR).toHaveValue('')
    await expect(page.getByLabel('Ground Type')).toHaveValue('B')
    await expect(page.getByLabel('Spectrum Type')).toHaveValue('Type 1')
    await expect(curve).toHaveCount(0)
    expect(spectrumCalls()).toBe(0)
  })

  let valid = false
  await test.step('2-3. agR = 0.2, γI = 1', async () => {
    const put = waitForSectionPut<{ a: string; i: string }>(page, projectId, 'loads/seismic', { predicate: (r) => r.value.a === SEISMIC.agR })
    await gamma.fill(SEISMIC.importanceFactor)
    const [response] = await Promise.all([
      page.waitForResponse((r) => r.request().method() === 'POST' && new URL(r.url()).pathname === '/api/seismic/spectrum' && (JSON.parse(r.request().postData() ?? 'null') as SpectrumRequest).agR === Number(SEISMIC.agR)),
      agR.fill(SEISMIC.agR),
    ])
    const request = JSON.parse(response.request().postData() ?? 'null') as SpectrumRequest
    expect(request).toEqual({ agR: Number(SEISMIC.agR), importanceFactor: Number(SEISMIC.importanceFactor), groundType: 'B', spectrumType: 'Type 1' })
    const body = await jsonOf<{ status: string }>(response)
    valid = body.status === 'VALID'
    test.info().annotations.push({ type: 'observed', description: `seismic spectrum status=${body.status}` })
    if (valid) {
      await expect(curve).toHaveCount(1)
      await page.getByRole('button', { name: 'Show Calculation Details ▾' }).click()
      await expect(page.locator('.spn-seismic-report-rows > div').filter({ has: page.locator('span', { hasText: /^Reference PGA, agR$/ }) }).locator('strong')).toHaveText(`${SEISMIC.agR} g`)
    } else {
      await expect(page.getByText('Spectrum result is INVALID for these inputs; no values are shown.')).toBeVisible()
      await expect(curve).toHaveCount(0)
    }
    await put
  })

  await test.step('4. agR silinir: eğri kalkar, yeni istek yok; 0.2 tekrar girilir', async () => {
    const before = spectrumCalls()
    await agR.fill('')
    await expect(curve).toHaveCount(0)
    await settleWrites(writes)
    expect(spectrumCalls(), 'Boş girişte istek gitmez').toBe(before)
    await agR.fill(SEISMIC.agR)
    if (valid) await expect(curve).toHaveCount(1)
    else await expect(page.getByText('Spectrum result is INVALID for these inputs; no values are shown.')).toBeVisible()
  })

  await test.step('5. PUT loads/seismic ve yenileme', async () => {
    await settleWrites(writes)
    expect((await projectApi.getProject(projectId)).loads).toMatchObject({ seismic: { a: SEISMIC.agR, i: SEISMIC.importanceFactor } })
    await reloadSettled(page, writes, projectId)
    await openLoadsTab(page, 'Seismic')
    await expect(agR).toHaveValue(SEISMIC.agR)
    await expect(gamma).toHaveValue(SEISMIC.importanceFactor)
  })

  diagnostics.expectClean()
})
