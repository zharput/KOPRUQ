/**
 * docs/e2e/19-yuk-birimleri.md
 *
 * Otomatikleştirilen: 1-8 (Self Weight, Force=tonf, Mass, Length=mm/cm, Traffic Carriageway ve LM1, Wind ze, Temperature °F/K/°C, Seismic notu,
 * birim değişimlerinde loads PUT yok, kN/m/°C/t'ye dönüşte Self Weight başlangıçla aynı).
 * Belge ↔ kod notu (plan bulgusu B4): belgenin 3. adımı cm ile bitip 4. adımda `Width (mm)` bekler; spec birimleri açıkça seçer (Traffic
 * için Length=mm, LM1 için Length=m). Belgedeki `0.004000 kN/mm` ve `2.400e-8` örnekleri kN+mm içindir; spec tonf+mm'de yalnız belgedeki
 * `0.0004079 tonf/mm`, kalınlık `100.0`/`10.000` ve birim ağırlık için `d.ddde-N` biçim kuralını doğrular.
 * Yerine konan / manuel: backend'in hesapladığı sayılar (şerit genişlikleri, LM1 değerleri, sıcaklık farkları) yanıttan türetilir;
 * sabit belge değerleri `scenarioData.ts` (UNITS_DOC) içindedir. Ekran görüntüleri rapora ek olarak eklenir.
 */
import type { Page } from '@playwright/test'
import { jsonOf } from './support/api.ts'
import { attachScreenshot } from './support/evidence.ts'
import { expect, test } from './support/fixtures.ts'
import { openLoadsTab, openTrafficSubTab, rowInputValues, selfWeightResult, selfWeightRow, setProjectUnit, temperatureResultCells, trafficPanel, type UnitDimension } from './support/navigation.ts'
import { createProjectViaUi, gotoInProject, uniqueProjectName } from './support/projects.ts'
import { KN_PER_TONF, SEISMIC, UNITS_DOC } from './support/scenarioData.ts'
import { expectNoPutDuring, settleWrites, type WriteTracker } from './support/writes.ts'

test.setTimeout(180_000)

type Lanes = { lanes: { number: number; widthM: number }[]; remainingAreaWidthM: number }
type Resolve = { notionalLanes: Lanes }
type Defaults = { tandemSystem: { characteristicValue: { value: number } }[]; udl: { characteristicValue: { value: number } }[] }
type TemperatureResult = { status: string; effectiveMinimumC: number | null; effectiveMaximumC: number | null; initialTemperatureC: number | null; contractionC: number | null; expansionC: number | null }

const signedFixed = (value: number, label: string) => `${value > 0 ? '+' : ''}${(Object.is(value, -0) ? 0 : value).toFixed(2)} ${label}`

async function selfWeightSignature(page: Page) {
  const rows = page.locator('[data-testid^="self-weight-row-"]')
  await expect(rows.first()).toBeVisible()
  return rows.evaluateAll((els) => els.map((row) => ({
    key: (row.getAttribute('data-testid') ?? '').replace('self-weight-row-', ''),
    inputs: Array.from(row.querySelectorAll('input')).map((input) => (input as HTMLInputElement).value),
    result: row.querySelector('[data-testid^="self-weight-result-"]')?.textContent ?? null,
  })))
}

test('19 Yük birimlerinin proje tercihine göre gösterimi', async ({ page, diagnostics, writes }, testInfo) => {
  const { projectId } = await createProjectViaUi(page, uniqueProjectName('19'))
  const nav = page.getByRole('navigation', { name: 'Workspaces' })

  /** Changes one project unit on the Project page; asserts that no `loads/*` section is written meanwhile (step 8). */
  async function changeUnit(dimension: UnitDimension, value: string) {
    await settleWrites(writes)
    await expectNoPutDuring(writes as WriteTracker, 'loads/', async () => {
      await nav.getByRole('link', { name: 'Project', exact: true }).click()
      await setProjectUnit(page, projectId, dimension, value)
    })
    await nav.getByRole('link', { name: 'Loads', exact: true }).click()
  }
  const toLoads = () => nav.getByRole('link', { name: 'Loads', exact: true }).click()

  await gotoInProject(page, writes, projectId, '/loads')
  const guardrail = selfWeightRow(page, 'guardrail')
  const asphalt = selfWeightRow(page, 'asphalt')
  const concrete = selfWeightRow(page, 'concrete')
  const card = page.locator('.spn-card').filter({ has: page.getByRole('heading', { name: 'Self Weight & Permanent' }) }).last()

  let initialSignature: Awaited<ReturnType<typeof selfWeightSignature>> = []
  await test.step('1. Varsayılan birimler (kN, m, °C)', async () => {
    await expect(selfWeightResult(page, 'guardrail')).toHaveText(UNITS_DOC.defaults.guardrailResult)
    expect((await rowInputValues(guardrail))[1]).toBe(UNITS_DOC.defaults.guardrailUnitLoad)
    await expect(card).toContainText('kN/m³')
    initialSignature = await selfWeightSignature(page)
    await attachScreenshot(testInfo, page, '19-1-varsayilan')
  })

  await test.step('2. Force = tonf; Mass değişimi Loads değerlerini değiştirmez', async () => {
    await changeUnit('force', 'tonf')
    await expect(selfWeightResult(page, 'guardrail')).toHaveText(UNITS_DOC.tonf.guardrailResult)
    expect((await rowInputValues(guardrail))[1]).toBe(UNITS_DOC.tonf.guardrailUnitLoad)
    expect(await rowInputValues(concrete)).toEqual([UNITS_DOC.tonf.concreteUnitWeight])
    expect((await rowInputValues(asphalt))[2]).toBe(UNITS_DOC.tonf.asphaltUnitWeight)
    await expect(card).toContainText('tonf/m³')
    const before = await selfWeightSignature(page)
    await changeUnit('mass', 'kg')
    expect(await selfWeightSignature(page), 'Mass tercihi Loads değerlerini değiştirmez').toEqual(before)
    await attachScreenshot(testInfo, page, '19-2-tonf')
  })

  await test.step('3. Length = mm ve cm', async () => {
    await changeUnit('length', 'mm')
    expect((await rowInputValues(asphalt))[0]).toBe(UNITS_DOC.mm.asphaltThickness)
    expect((await rowInputValues(asphalt))[2], 'Birim ağırlık mm³ biçimi: 4 anlamlı hane').toMatch(/^\d\.\d{3}e-\d+$/)
    await expect(selfWeightResult(page, 'guardrail')).toHaveText(UNITS_DOC.mm.guardrailResult)
    await expect(card).toContainText('tonf/mm³')
    await attachScreenshot(testInfo, page, '19-3-mm')
    await changeUnit('length', 'cm')
    expect((await rowInputValues(asphalt))[0]).toBe(UNITS_DOC.cm.asphaltThickness)
  })

  let defaults: Defaults
  let lanes: Lanes
  await test.step('4a. Traffic > Carriageway & Notional Lanes: Width (mm)', async () => {
    await changeUnit('length', 'mm')
    const [defaultsResponse, resolveResponse] = await Promise.all([
      page.waitForResponse((r) => r.request().method() === 'GET' && r.url().includes('/api/traffic-loads/lm1-defaults')),
      page.waitForResponse((r) => r.request().method() === 'POST' && new URL(r.url()).pathname === '/api/traffic-loads/resolve'),
      openLoadsTab(page, 'Traffic'),
    ])
    defaults = await jsonOf<Defaults>(defaultsResponse)
    lanes = (await jsonOf<Resolve>(resolveResponse)).notionalLanes
    await openTrafficSubTab(page, 'Carriageway & Notional Lanes')
    const panel = trafficPanel(page)
    await expect(panel.locator('th', { hasText: 'Width (mm)' })).toBeVisible()
    for (const lane of lanes.lanes) {
      await expect(panel.locator('tr', { hasText: `Lane ${lane.number}` }).locator('td').nth(1)).toHaveText((lane.widthM * 1000).toFixed(1))
    }
    await openTrafficSubTab(page, 'Preview & Validation')
    await expect(panel.locator('tr', { hasText: 'Carriageway width' }).locator('td').nth(1)).toContainText(/ mm$/)
  })

  await test.step('4b. LM1: Tandem ve UDL tonf (Length = m), α değişmez', async () => {
    await changeUnit('length', 'm')
    await openLoadsTab(page, 'Traffic')
    await openTrafficSubTab(page, 'LM1')
    const panel = trafficPanel(page)
    const tandemRow = panel.getByTestId('lm1-row-tandemSystem-0')
    const udlRow = panel.getByTestId('lm1-row-udl-0')
    const alphas = async () => [await tandemRow.locator('input').inputValue(), await udlRow.locator('input').inputValue()]
    const alphaBefore = await alphas()
    const tandem = (defaults.tandemSystem[0].characteristicValue.value / KN_PER_TONF).toFixed(2)
    const udl = (defaults.udl[0].characteristicValue.value / KN_PER_TONF).toFixed(4)
    await expect(panel.getByTestId('lm1-base-tandemSystem-0')).toHaveText(tandem)
    await expect(panel.getByTestId('lm1-unit-tandemSystem-0')).toHaveText('tonf')
    await expect(panel.getByTestId('lm1-base-udl-0')).toHaveText(udl)
    await expect(panel.getByTestId('lm1-unit-udl-0')).toHaveText('tonf/m²')
    // Belge değerleri (adım 4): 300 kN -> 30.59 tonf, UDL -> 0.9177 tonf/m²; yukarıdaki türetilmiş değerle de uyumlu olmalı.
    expect(tandem).toBe(UNITS_DOC.lm1.tandem)
    expect(udl).toBe(UNITS_DOC.lm1.udl)
    await changeUnit('length', 'mm')
    await openLoadsTab(page, 'Traffic')
    await openTrafficSubTab(page, 'LM1')
    expect(await alphas(), 'α birim değişiminde değişmez').toEqual(alphaBefore)
    await changeUnit('length', 'm')
    await attachScreenshot(testInfo, page, '19-4-lm1')
  })

  await test.step('5. Wind: ze mm -> POST zeM = 10; m: 10.0000, STALE yok', async () => {
    await changeUnit('length', 'mm')
    await openLoadsTab(page, 'Wind')
    await page.getByLabel('Basic Wind Velocity, vb').fill(UNITS_DOC.wind.vb)
    await page.getByLabel('Reference Height, ze').fill(UNITS_DOC.wind.zeInMm)
    const [response] = await Promise.all([
      page.waitForResponse((r) => r.request().method() === 'POST' && new URL(r.url()).pathname === '/api/wind-loads/resolve'),
      page.getByRole('button', { name: 'Calculate Wind' }).click(),
    ])
    expect(response.status()).toBe(200)
    expect((JSON.parse(response.request().postData() ?? 'null') as { zeM: number }).zeM, 'İstek kanonik metre taşır').toBe(Number(UNITS_DOC.wind.zeInMm) / 1000)
    await changeUnit('length', 'm')
    await openLoadsTab(page, 'Wind')
    await expect(page.getByLabel('Reference Height, ze')).toHaveValue(UNITS_DOC.wind.zeInM)
    await expect(page.locator('p.spn-hint strong', { hasText: 'STALE' })).toHaveCount(0)
    await expect(page.getByText(UNITS_DOC.windNote)).toBeVisible()
  })

  await test.step('6. Temperature: °F -> istek °C, ΔT °F farkı; K; °C', async () => {
    await changeUnit('temperature', 'F')
    await openLoadsTab(page, 'Temperature')
    const [response] = await Promise.all([
      page.waitForResponse((r) => {
        if (r.request().method() !== 'POST' || new URL(r.url()).pathname !== '/api/temperature/uniform/resolve') return false
        const b = JSON.parse(r.request().postData() ?? 'null') as Record<string, number | null>
        return b.effectiveMinimumTemperatureC !== null && b.effectiveMaximumTemperatureC !== null && b.initialTemperatureC !== null
      }),
      (async () => {
        await page.getByLabel('Effective Minimum Temperature, Te,min').fill(UNITS_DOC.temperatureF.min)
        await page.getByLabel('Effective Maximum Temperature, Te,max').fill(UNITS_DOC.temperatureF.max)
        await page.getByLabel('Initial Temperature, T0').fill(UNITS_DOC.temperatureF.t0)
      })(),
    ])
    const sent = JSON.parse(response.request().postData() ?? 'null') as { effectiveMinimumTemperatureC: number; effectiveMaximumTemperatureC: number; initialTemperatureC: number }
    // Belge adım 6: -4 °F, 104 °F, 50 °F -> -20, 40, 10 °C (°C = (°F - 32) x 5/9).
    expect(sent.effectiveMinimumTemperatureC).toBeCloseTo(-20, 6)
    expect(sent.effectiveMaximumTemperatureC).toBeCloseTo(40, 6)
    expect(sent.initialTemperatureC).toBeCloseTo(10, 6)
    const body = await jsonOf<TemperatureResult>(response)
    const cells = temperatureResultCells(page)
    const expectDeltas = async (factor: number, label: string) => {
      if (body.status !== 'VALID' || body.contractionC === null || body.expansionC === null) return
      const c = signedFixed(body.contractionC * factor, label)
      const e = signedFixed(body.expansionC * factor, label)
      await expect(cells).toHaveText([c, e, c, e])
    }
    await expectDeltas(9 / 5, '°F')
    await attachScreenshot(testInfo, page, '19-6-fahrenheit')
    await settleWrites(writes)
    await changeUnit('temperature', 'K')
    await openLoadsTab(page, 'Temperature')
    await expectDeltas(1, 'K')
    await expect.poll(async () => Number(await page.getByLabel('Effective Minimum Temperature, Te,min').inputValue())).toBeCloseTo((body.effectiveMinimumC ?? NaN) + 273.15, 1)
    await changeUnit('temperature', 'C')
    await openLoadsTab(page, 'Temperature')
    await expectDeltas(1, '°C')
    await expect.poll(async () => Number(await page.getByLabel('Effective Minimum Temperature, Te,min').inputValue())).toBeCloseTo(body.effectiveMinimumC ?? NaN, 1)
    await expect.poll(async () => Number(await page.getByLabel('Effective Maximum Temperature, Te,max').inputValue())).toBeCloseTo(body.effectiveMaximumC ?? NaN, 1)
    await expect.poll(async () => Number(await page.getByLabel('Initial Temperature, T0').inputValue())).toBeCloseTo(body.initialTemperatureC ?? NaN, 1)
  })

  let seismicBefore: string[] = []
  await test.step('7. Seismic: g ve s notu, değerler birimden bağımsız', async () => {
    await openLoadsTab(page, 'Seismic')
    await page.getByLabel('Reference PGA, agR').fill(SEISMIC.agR)
    await expect(page.getByText(UNITS_DOC.seismicNote)).toBeVisible()
    const values = async () => [await page.getByLabel('Reference PGA, agR').inputValue(), await page.getByLabel('Importance Factor, γI').inputValue()]
    seismicBefore = await values()
    await changeUnit('force', 'kN')
    await openLoadsTab(page, 'Seismic')
    await expect(page.getByText(UNITS_DOC.seismicNote)).toBeVisible()
    expect(await values(), 'Seismic girdileri birimden etkilenmez').toEqual(seismicBefore)
  })

  await test.step('8. kN, m, °C ve t: Self Weight başlangıçla aynı', async () => {
    await changeUnit('length', 'm')
    await changeUnit('mass', 't')
    await changeUnit('temperature', 'C')
    await toLoads()
    await openLoadsTab(page, 'Self Weight & Permanent')
    expect(await selfWeightSignature(page)).toEqual(initialSignature)
    await openLoadsTab(page, 'Seismic')
    await expect(page.getByLabel('Reference PGA, agR')).toHaveValue(seismicBefore[0])
    await attachScreenshot(testInfo, page, '19-8-geri-donus')
  })

  diagnostics.expectClean()
})
