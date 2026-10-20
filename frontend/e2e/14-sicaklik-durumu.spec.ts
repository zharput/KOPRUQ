/**
 * docs/e2e/14-sicaklik-durumu.md
 *
 * Otomatikleştirilen: 1 (alanlar boş: istek yok, hücreler '—'), 2 (yalnız Te,min = 0: istek ve INVALID/eksik parametre durumu),
 * 3-4 (Te,max = 20 ve T0 = 10: sonuç yanıttan, Details), 5 (PUT loads/temperature, yenileme sonrası üç girdi geri gelir).
 * Yerine konan / manuel: sayısal sonuçlar (contraction/expansion) sabit yazılmaz; yalnız biçim kuralı (`+` işareti, 2 ondalık, birim etiketi)
 * ile yanıttaki değerden türetilir. "Gecikmiş eski yanıt yenisini ezmez" ayrıca simüle edilmez (sorgu anahtarı girdileri taşır).
 */
import { jsonOf } from './support/api.ts'
import { expect, test } from './support/fixtures.ts'
import { openLoadsTab, temperatureResultCells } from './support/navigation.ts'
import { createProjectViaUi, gotoInProject, reloadSettled, uniqueProjectName } from './support/projects.ts'
import { TEMPERATURE } from './support/scenarioData.ts'
import { settleWrites, waitForSectionPut } from './support/writes.ts'

type TemperatureResult = {
  status: string
  missingParameters: string[]
  effectiveMinimumC: number | null
  effectiveMaximumC: number | null
  initialTemperatureC: number | null
  contractionC: number | null
  expansionC: number | null
}
type ResolveBody = { effectiveMinimumTemperatureC: number | null; effectiveMaximumTemperatureC: number | null; initialTemperatureC: number | null }

/** Display rule of the temperature cells (default unit °C): sign only for positive values, two decimals, unit label. */
const celsius = (value: number | null) => (value == null ? '—' : `${value > 0 ? '+' : ''}${(Object.is(value, -0) ? 0 : value).toFixed(2)} °C`)

const isResolve = (match: (body: ResolveBody) => boolean) => (r: { url(): string; request(): { method(): string; postData(): string | null } }) =>
  r.request().method() === 'POST' && new URL(r.url()).pathname === '/api/temperature/uniform/resolve' && match(JSON.parse(r.request().postData() ?? 'null') as ResolveBody)

test('14 Sıcaklık servisinin giriş ve sonuç durumu', async ({ page, diagnostics, writes, projectApi }) => {
  const { projectId } = await createProjectViaUi(page, uniqueProjectName('14'))
  await gotoInProject(page, writes, projectId, '/loads')
  await openLoadsTab(page, 'Temperature')

  const minInput = page.getByLabel('Effective Minimum Temperature, Te,min')
  const maxInput = page.getByLabel('Effective Maximum Temperature, Te,max')
  const t0Input = page.getByLabel('Initial Temperature, T0')
  const resultCells = temperatureResultCells(page)
  const resolveCalls = () => diagnostics.apiCalls({ method: 'POST', url: '/api/temperature/uniform/resolve' }).length

  await test.step('1. Boş alanlar: istek yok, hücreler —', async () => {
    await expect(minInput).toHaveValue('')
    await expect(resultCells).toHaveText(['—', '—', '—', '—'])
    expect(resolveCalls()).toBe(0)
  })

  await test.step('2. Yalnız Te,min = 0: INVALID/eksik parametre', async () => {
    const [response] = await Promise.all([
      page.waitForResponse(isResolve((b) => b.effectiveMinimumTemperatureC === Number(TEMPERATURE.min) && b.effectiveMaximumTemperatureC === null && b.initialTemperatureC === null)),
      minInput.fill(TEMPERATURE.min),
    ])
    const body = await jsonOf<TemperatureResult>(response)
    expect(body.status, 'Eksik girişle sonuç VALID olmamalı').not.toBe('VALID')
    const alert = page.locator('div[role=alert]').filter({ hasText: `Result is ${body.status}` })
    await expect(alert).toBeVisible()
    await expect(alert.locator('li')).toHaveText(body.missingParameters)
    await expect(resultCells).toHaveText(['—', '—', '—', '—'])
  })

  await test.step('3-4. Te,max = 20, T0 = 10: sonuç yanıttan', async () => {
    const put = waitForSectionPut<{ min: string; max: string; t0: string }>(page, projectId, 'loads/temperature', {
      predicate: (r) => r.value.min === TEMPERATURE.min && r.value.max === TEMPERATURE.max && r.value.t0 === TEMPERATURE.t0,
    })
    await maxInput.fill(TEMPERATURE.max)
    const [response] = await Promise.all([
      page.waitForResponse(isResolve((b) => b.effectiveMinimumTemperatureC === Number(TEMPERATURE.min) && b.effectiveMaximumTemperatureC === Number(TEMPERATURE.max) && b.initialTemperatureC === Number(TEMPERATURE.t0))),
      t0Input.fill(TEMPERATURE.t0),
    ])
    const body = await jsonOf<TemperatureResult>(response)
    test.info().annotations.push({ type: 'observed', description: `temperature resolve status=${body.status}` })
    await page.getByRole('button', { name: 'Details ▾' }).click()
    if (body.status === 'VALID') {
      await expect(resultCells).toHaveText([celsius(body.contractionC), celsius(body.expansionC), celsius(body.contractionC), celsius(body.expansionC)])
      const detail = (label: string) => page.locator('.spn-seismic-report-rows > div').filter({ has: page.locator('span', { hasText: new RegExp(`^${label}$`) }) }).locator('strong')
      await expect(detail('Minimum Temperature, Te,min')).toHaveText(celsius(body.effectiveMinimumC))
      await expect(detail('Maximum Temperature, Te,max')).toHaveText(celsius(body.effectiveMaximumC))
      await expect(detail('Reference Temperature, T0')).toHaveText(celsius(body.initialTemperatureC))
    } else {
      await expect(page.locator('div[role=alert]').filter({ hasText: `Result is ${body.status}` })).toBeVisible()
      await expect(resultCells).toHaveText(['—', '—', '—', '—'])
    }
    await put
  })

  await test.step('5. PUT loads/temperature ve yenileme', async () => {
    await settleWrites(writes)
    expect((await projectApi.getProject(projectId)).loads).toMatchObject({ temperature: { min: TEMPERATURE.min, max: TEMPERATURE.max, t0: TEMPERATURE.t0 } })
    await reloadSettled(page, writes, projectId)
    await openLoadsTab(page, 'Temperature')
    await expect.poll(async () => [Number(await minInput.inputValue()), Number(await maxInput.inputValue()), Number(await t0Input.inputValue())])
      .toEqual([Number(TEMPERATURE.min), Number(TEMPERATURE.max), Number(TEMPERATURE.t0)])
  })

  diagnostics.expectClean()
})
