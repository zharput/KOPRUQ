/**
 * docs/e2e/06-trafik-yukleri.md
 *
 * Otomatikleştirilen: 1 (lm1-defaults ve resolve istekleri), 2 (ilk α değeri ve `Project overrides (LM1)` sayısı), 3 (α = 1.1 + Enter: yeni
 * resolve, PROJECT_OVERRIDE, etkin değer ve override sayısı değişir), 4 (EN default: α başlangıca, sayı önceki seviyeye), 5 (LM2: NOT IMPLEMENTED,
 * kontrol yok), 6 (α = 1.1 yeniden; PUT loads/traffic-lm1; yenileme).
 * Yerine konan / manuel: backend varsayılanları (Q1k vb.) sabit yazılmaz; ilk α alanı etiketinden türetilir. Ön koşul: ilk α ≠ 1.1.
 * Override sayısı göreli (N -> N+1 -> N) doğrulanır. Etkin değer yalnız "değişti ve '—' değil" olarak kontrol edilir.
 */
import { jsonOf } from './support/api.ts'
import { expect, test } from './support/fixtures.ts'
import { openLoadsTab, openTrafficSubTab, trafficPanel } from './support/navigation.ts'
import { createProjectViaUi, gotoInProject, reloadSettled, uniqueProjectName } from './support/projects.ts'
import { LM1_ALPHA } from './support/scenarioData.ts'
import { settleWrites, waitForSectionPut } from './support/writes.ts'
import type { Page } from '@playwright/test'

type Factor = { value: number | null; provenance: string }
type Lm1 = { tandemSystem: { label: string; adjustmentFactor: Factor }[] }
type ResolveBody = { lm1: Lm1 }

const resolveRequest = (r: { url(): string; request(): { method(): string; postData(): string | null } }) =>
  r.request().method() === 'POST' && new URL(r.url()).pathname === '/api/traffic-loads/resolve'

async function overrideCount(page: Page): Promise<number> {
  await openTrafficSubTab(page, 'Preview & Validation')
  const cell = trafficPanel(page).locator('tr', { hasText: 'Project overrides (LM1)' }).locator('td').nth(1)
  await expect(cell).toHaveText(/^\d+$/)
  return Number(await cell.textContent())
}

test('06 Trafik yükleri: LM1 override ve LM2 durumu', async ({ page, diagnostics, writes, projectApi }) => {
  const { projectId } = await createProjectViaUi(page, uniqueProjectName('06'))
  await gotoInProject(page, writes, projectId, '/loads')

  await test.step('1. Loads > Traffic: lm1-defaults ve resolve', async () => {
    const [defaults, resolve] = await Promise.all([
      page.waitForResponse((r) => r.request().method() === 'GET' && r.url().includes('/api/traffic-loads/lm1-defaults')),
      page.waitForResponse(resolveRequest),
      openLoadsTab(page, 'Traffic'),
    ])
    expect(defaults.status()).toBe(200)
    expect(resolve.status()).toBe(200)
  })

  await openTrafficSubTab(page, 'LM1')
  const alphaInput = trafficPanel(page).getByRole('textbox', { name: / α$/ }).first()
  await expect(alphaInput).toBeVisible()
  const alphaLabel = (await alphaInput.getAttribute('aria-label')) ?? ''
  const rowLabel = alphaLabel.replace(/ α$/, '')
  const row = trafficPanel(page).locator('tr').filter({ has: page.getByRole('textbox', { name: alphaLabel, exact: true }) })
  const effective = row.locator('td').nth(3)
  const resetButton = page.getByRole('button', { name: `Reset ${rowLabel} α to EN default`, exact: true })

  await expect(effective).not.toHaveText('—')
  const initialAlpha = await alphaInput.inputValue()
  expect(initialAlpha, 'Ön koşul: ilk α değeri 1.1 olmamalı').not.toBe(LM1_ALPHA)
  const initialEffective = await effective.textContent()
  const initialCount = await overrideCount(page)

  await test.step('3. α = 1.1 + Enter: yeni resolve, PROJECT_OVERRIDE', async () => {
    await openTrafficSubTab(page, 'LM1')
    const [response] = await Promise.all([
      page.waitForResponse((r) => resolveRequest(r) && (JSON.parse(r.request().postData() ?? 'null') as ResolveBody).lm1.tandemSystem[0].adjustmentFactor.value === Number(LM1_ALPHA)),
      alphaInput.fill(LM1_ALPHA).then(() => alphaInput.press('Enter')),
    ])
    const sent = (JSON.parse(response.request().postData() ?? 'null') as ResolveBody).lm1.tandemSystem[0]
    expect(sent.label).toBe(rowLabel)
    expect(sent.adjustmentFactor).toMatchObject({ value: Number(LM1_ALPHA), provenance: 'PROJECT_OVERRIDE' })
    expect((await jsonOf<{ lm1: Lm1 }>(response)).lm1.tandemSystem[0].adjustmentFactor.value).toBe(Number(LM1_ALPHA))
    await expect(effective).not.toHaveText(initialEffective ?? '')
    await expect(effective).not.toHaveText('—')
    expect(await overrideCount(page)).toBe(initialCount + 1)
  })

  await test.step('4. EN default: α başlangıca, sayı önceki seviyeye', async () => {
    await openTrafficSubTab(page, 'LM1')
    await resetButton.click()
    await expect(alphaInput).toHaveValue(initialAlpha)
    await expect(resetButton).toBeDisabled()
    expect(await overrideCount(page)).toBe(initialCount)
  })

  await test.step('5. LM2: NOT IMPLEMENTED, kontrol yok', async () => {
    await openTrafficSubTab(page, 'LM2')
    const panel = trafficPanel(page)
    await expect(panel.getByText('NOT IMPLEMENTED')).toBeVisible()
    await expect(panel.locator('button, input, select, textarea')).toHaveCount(0)
  })

  await test.step('6. α = 1.1 yeniden: PUT loads/traffic-lm1 ve yenileme', async () => {
    await openTrafficSubTab(page, 'LM1')
    const put = waitForSectionPut<Lm1>(page, projectId, 'loads/traffic-lm1', {
      predicate: (r) => r.value.tandemSystem[0].adjustmentFactor.value === Number(LM1_ALPHA),
    })
    await alphaInput.fill(LM1_ALPHA)
    await alphaInput.press('Enter')
    const result = await put
    expect(result.request.value.tandemSystem[0].adjustmentFactor).toMatchObject({ value: Number(LM1_ALPHA), provenance: 'PROJECT_OVERRIDE' })
    await settleWrites(writes)
    const stored = (await projectApi.getProject(projectId)).loads as { trafficLm1?: Lm1 }
    expect(stored.trafficLm1?.tandemSystem[0].adjustmentFactor).toMatchObject({ value: Number(LM1_ALPHA), provenance: 'PROJECT_OVERRIDE' })

    await reloadSettled(page, writes, projectId)
    await openLoadsTab(page, 'Traffic')
    await openTrafficSubTab(page, 'LM1')
    await expect(alphaInput).toHaveValue(LM1_ALPHA)
  })

  diagnostics.expectClean()
})
