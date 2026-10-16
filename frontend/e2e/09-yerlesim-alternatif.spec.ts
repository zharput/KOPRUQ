/**
 * docs/e2e/09-yerlesim-alternatif.md
 *
 * Otomatikleştirilen: 1-2 (/layout-generator varsayılan form, GENERATE LAYOUTS, POST /api/layout/generate 200, aday/uygun sayısı yanıttan),
 * 3 (uygun satır seç, USE THIS LAYOUT IN GENERATE), 4 (/bridge-alternatives: Bridge Length ve Span alanları seçilen satırdan), 5 (kernel-state ve
 * alternatives gövdeleri aynı ve seçilen yerleşimle eşleşir).
 * Yerine konan / manuel: form varsayılanları sabit yazılmaz (yanıttan türetilir); uygun aday çıkmazsa spec açık mesajla FAIL eder (atlamaz).
 * Uygunsuz satır varsa: seçilince "Why <id> was rejected" görünür ve USE düğmesi yoktur. Yönlendirme `?project` parametresini geçici düşürür,
 * oturum geri yazar (plan bulgusu B8); URL kontrolü yeniden denenir. Fast Solver / terrain isteği olmadığı kontrol edilir.
 */
import { jsonOf } from './support/api.ts'
import { E2E_API_BASE } from './support/env.ts'
import { expect, test } from './support/fixtures.ts'
import { createProjectViaUi, gotoInProject, uniqueProjectName } from './support/projects.ts'

type LayoutRow = { id: string; bridgeLengthM: number; spanLengthM: number; spanCount: number; feasible: boolean }
type KernelBody = { totalLengthM: number; minSpanM: number; maxSpanM: number; [key: string]: unknown }

const isPost = (path: string) => (r: { url(): string; request(): { method(): string } }) => r.request().method() === 'POST' && r.url() === `${E2E_API_BASE}${path}`

test('09 Yerleşim seçimini yapısal alternatiflere aktar', async ({ page, diagnostics, writes }) => {
  const { projectId } = await createProjectViaUi(page, uniqueProjectName('09'))
  await gotoInProject(page, writes, projectId, '/layout-generator')

  let rows: LayoutRow[] = []
  await test.step('1-2. GENERATE LAYOUTS: 200 ve özet', async () => {
    const [response] = await Promise.all([page.waitForResponse(isPost('/api/layout/generate')), page.getByRole('button', { name: 'GENERATE LAYOUTS' }).click()])
    expect(response.status()).toBe(200)
    rows = await jsonOf<LayoutRow[]>(response)
    const feasible = rows.filter((r) => r.feasible).length
    expect(rows.length, 'Layout API aday döndürmedi; varsayılan form için aday bekleniyordu').toBeGreaterThan(0)
    expect(feasible, 'Uygun (Feasible = Yes) aday yok; senaryo 3. adımı çalıştırılamaz').toBeGreaterThan(0)
    await expect(page.getByRole('heading', { name: `${rows.length} candidate layout(s), ${feasible} feasible.` })).toBeVisible()
  })

  const tableRows = page.locator('table.spn-table tbody tr')

  await test.step('Uygunsuz satır (varsa): gerekçe görünür, USE düğmesi yok', async () => {
    const index = rows.findIndex((r) => !r.feasible)
    test.info().annotations.push({ type: 'observed', description: `layout candidates=${rows.length}, infeasible row ${index < 0 ? 'yok (gerekçe kontrolü atlandı)' : 'var (gerekçe kontrol edildi)'}` })
    if (index < 0) return
    await tableRows.nth(index).click()
    await expect(tableRows.nth(index).locator('td').last()).toHaveText('No')
    await expect(page.getByRole('heading', { name: `Why ${rows[index].id} was rejected` })).toBeVisible()
    await expect(page.getByRole('button', { name: /USE THIS LAYOUT IN GENERATE/ })).toHaveCount(0)
  })

  const index = rows.findIndex((r) => r.feasible)
  const chosen = rows[index]

  await test.step('3. Uygun satır -> USE THIS LAYOUT IN GENERATE', async () => {
    await tableRows.nth(index).click()
    await expect(tableRows.nth(index).locator('td').last()).toHaveText('Yes')
    await expect(page.getByRole('heading', { name: chosen.id, exact: true })).toBeVisible()
    await expect(page.getByText(`Bridge length ${chosen.bridgeLengthM.toFixed(2)} m - ${chosen.spanCount} x ${chosen.spanLengthM.toFixed(2)} m spans.`)).toBeVisible()
    await page.getByRole('button', { name: /USE THIS LAYOUT IN GENERATE/ }).click()
  })

  await test.step('4. /bridge-alternatives: değerler satırdan gelir', async () => {
    await expect(page).toHaveURL(new RegExp(`/bridge-alternatives\\?project=${projectId}$`))
    await expect(page.getByText('Bridge length and span locked from a Site & Layout candidate')).toBeVisible()
    await expect(page.getByText(`${chosen.bridgeLengthM} m total, ${chosen.spanLengthM} m spans`)).toBeVisible()
    const length = page.locator('label.spn-field').filter({ has: page.locator('span', { hasText: /^Bridge Length \(m\)$/ }) }).locator('input')
    expect(Number(await length.inputValue())).toBeCloseTo(chosen.bridgeLengthM, 6)
    const span = page.locator('.spn-range-field').filter({ has: page.locator('.spn-range-label', { hasText: /^Span \(m\)$/ }) }).locator('input')
    expect(Number(await span.nth(0).inputValue())).toBeCloseTo(chosen.spanLengthM, 6)
    expect(Number(await span.nth(1).inputValue())).toBeCloseTo(chosen.spanLengthM, 6)
  })

  await test.step('5. GENERATE ALTERNATIVES: kernel-state ve alternatives', async () => {
    const [kernel, alternatives] = await Promise.all([
      page.waitForResponse(isPost('/api/kernel-state')),
      page.waitForResponse(isPost('/api/alternatives')),
      page.getByRole('button', { name: 'GENERATE ALTERNATIVES' }).click(),
    ])
    expect(kernel.status()).toBe(200)
    expect(alternatives.status()).toBe(200)
    const kernelBody = JSON.parse(kernel.request().postData() ?? 'null') as KernelBody
    const alternativesBody = JSON.parse(alternatives.request().postData() ?? 'null') as KernelBody
    expect(alternativesBody, 'İki istek aynı gövdeyi taşır').toEqual(kernelBody)
    expect(kernelBody.totalLengthM).toBeCloseTo(chosen.bridgeLengthM, 6)
    expect(kernelBody.minSpanM).toBeCloseTo(chosen.spanLengthM, 6)
    expect(kernelBody.maxSpanM).toBeCloseTo(chosen.spanLengthM, 6)
    const result = await jsonOf<unknown[]>(alternatives)
    const summary = result.length === 0 ? '0 feasible alternatives - widen the ranges.' : `${result.length} feasible alternative(s).`
    await expect(page.getByRole('heading', { name: summary })).toBeVisible()
  })

  await test.step('Fast Solver / terrain isteği yok', () => {
    expect(diagnostics.apiCalls({ url: '/api/fast-solver' })).toHaveLength(0)
    expect(diagnostics.apiCalls({ url: '/api/terrain' })).toHaveLength(0)
  })

  diagnostics.expectClean()
})
