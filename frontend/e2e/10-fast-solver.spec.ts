/**
 * docs/e2e/10-fast-solver.md
 *
 * Otomatikleştirilen: 1 (5 Span + 4 P height alanı), 2 (RUN ANALYSIS, POST /api/fast-solver/solve), 3 (COMPLETED ise üç tablo başlığı,
 * NaN/Infinity yok, toplamlar yanıtla uyumlu), 4 (Span 1 silinince alan hatası ve yeni istek yok), 5 (değer geri konunca hata kalkar, yeni POST 200).
 * Yerine konan / manuel: form başlangıç değerleri sabit yazılmaz (UI'dan `inputValue()` ile okunup geri konur); alan hatası metni
 * (zod NaN iletisi doğrulanmadı) assert edilmez, yalnız `.spn-error` varlığı; "Match" yalnız yazılımın denge göstergesidir (mühendislik kabulü değil);
 * birim etiketleri "(m)" alan etiketlerinde kontrol edilir. Önceki sonuç tabloları geçersiz girişten sonra ekranda kalır (plan bulgusu B7), assert edilmez.
 */
import { jsonOf } from './support/api.ts'
import { expect, test } from './support/fixtures.ts'
import { createProjectViaUi, gotoInProject, uniqueProjectName } from './support/projects.ts'

type SolveResponse = {
  status: string
  errorMessage: string | null
  reactions: unknown[]
  deckDisplacements: unknown[]
  totalAppliedLoadKn: number
  totalReactionKn: number
}

const isSolve = (r: { url(): string; request(): { method(): string } }) => r.request().method() === 'POST' && new URL(r.url()).pathname === '/api/fast-solver/solve'

test('10 Fast Solver çağrısı ve sonuç durumu', async ({ page, diagnostics, writes }) => {
  const { projectId } = await createProjectViaUi(page, uniqueProjectName('10'))
  await gotoInProject(page, writes, projectId, '/kopruq-fast-solver')
  const solveCalls = () => diagnostics.apiCalls({ method: 'POST', url: '/api/fast-solver/solve' }).length
  const field = (label: string) => page.locator('label.spn-field').filter({ has: page.locator('span', { hasText: new RegExp(`^${label.replace(/[()]/g, '\\$&')}$`) }) })

  await test.step('1. Beş Span ve dört P height alanı', async () => {
    for (let i = 1; i <= 5; i++) await expect(field(`Span ${i} (m)`)).toBeVisible()
    for (let i = 1; i <= 4; i++) await expect(field(`P${i} height (m)`)).toBeVisible()
  })

  await test.step('2-3. RUN ANALYSIS ve sonuç', async () => {
    const [response] = await Promise.all([page.waitForResponse(isSolve), page.getByRole('button', { name: 'RUN ANALYSIS' }).click()])
    expect(response.status()).toBe(200)
    const body = await jsonOf<SolveResponse>(response)
    test.info().annotations.push({ type: 'observed', description: `fast-solver status=${body.status}` })
    if (body.status !== 'COMPLETED') {
      await expect(page.locator('p.spn-error').first()).toContainText(body.errorMessage ?? `Solver status: ${body.status}`)
      throw new Error(`Fast Solver COMPLETED dönmedi: ${body.status} / ${body.errorMessage ?? '-'}`)
    }
    expect(body.errorMessage ?? '').toBe('')
    await expect(page.getByRole('heading', { name: 'Equilibrium check' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Support reactions' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Deck displacements' })).toBeVisible()
    const equilibrium = page.locator('.spn-card').filter({ has: page.getByRole('heading', { name: 'Equilibrium check' }) }).last().locator('p')
    await expect(equilibrium).toContainText(`${body.totalAppliedLoadKn.toFixed(2)} kN`)
    await expect(equilibrium).toContainText(`${body.totalReactionKn.toFixed(2)} kN`)
    await expect(equilibrium).toContainText(/Match|MISMATCH/)
    const reactionRows = page.locator('.spn-card').filter({ has: page.getByRole('heading', { name: 'Support reactions' }) }).last().locator('tbody tr')
    await expect(reactionRows).toHaveCount(body.reactions.length)
    const displacementRows = page.locator('.spn-card').filter({ has: page.getByRole('heading', { name: 'Deck displacements' }) }).last().locator('tbody tr')
    await expect(displacementRows).toHaveCount(body.deckDisplacements.length)
    await expect(page.locator('form')).not.toContainText(/NaN|Infinity/)
  })

  const span1 = field('Span 1 (m)').locator('input')
  const original = await span1.inputValue()
  expect(original).not.toBe('')

  await test.step('4. Span 1 boş: alan hatası, yeni istek yok', async () => {
    const before = solveCalls()
    await span1.fill('')
    await page.getByRole('button', { name: 'RUN ANALYSIS' }).click()
    await expect(field('Span 1 (m)').locator('.spn-error')).toBeVisible()
    expect(solveCalls(), 'Geçersiz girişle istek gitmez').toBe(before)
  })

  await test.step('5. Değer geri konur: hata kalkar, yeni POST 200', async () => {
    await span1.fill(original)
    const [response] = await Promise.all([page.waitForResponse(isSolve), page.getByRole('button', { name: 'RUN ANALYSIS' }).click()])
    expect(response.status()).toBe(200)
    await expect(field('Span 1 (m)').locator('.spn-error')).toHaveCount(0)
  })

  diagnostics.expectClean()
})
