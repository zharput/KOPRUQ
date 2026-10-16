/**
 * docs/e2e/11-api-hata-sozlesmesi.md
 *
 * Otomatikleştirilen: 1-2 (bozuk JSON'lu POST /api/alternatives: durum, code, message, path, correlationId, X-Correlation-ID),
 * 4 (/layout-generator: min span > max span -> alan hatası, istek yok, başarılı sonuç yok).
 * Yerine konan / manuel: 3. adım (backend logunda correlation ID araması) otomatik değildir; yerine yanıt gövdesi correlationId = başlık
 * eşitliği kontrol edilir. Belgenin "Min span / Max span" etiketleri arayüzde yoktur (plan bulgusu B3): alan "Span length (m)" aralığıdır
 * (iki etiketsiz input; solu min, sağı max). Min değeri UI'daki max değerinin 1 fazlası yapılır (değer arayüzden okunur).
 * İzin (yalnız bu test): POST /api/alternatives 400 ve Chromium'un buna ait "Failed to load resource" console mesajı.
 */
import { E2E_API_BASE } from './support/env.ts'
import { expect, test } from './support/fixtures.ts'
import { createProjectViaUi, gotoInProject, uniqueProjectName } from './support/projects.ts'
import { MALFORMED_BODY } from './support/scenarioData.ts'

test('11 API hata sözleşmesi ve correlation ID', async ({ page, diagnostics, writes }) => {
  const alternativesUrl = `${E2E_API_BASE}/api/alternatives`
  diagnostics.allowApiStatus({ method: 'POST', url: alternativesUrl, status: 400 }, 'docs/e2e/11 adım 1-2: bozuk JSON için beklenen 400 (negatif test)')

  const { projectId } = await createProjectViaUi(page, uniqueProjectName('11'))

  await test.step('1-2. Bozuk JSON -> 400 MALFORMED_REQUEST_BODY', async () => {
    const result = await page.evaluate(async ({ url, body }) => {
      const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body })
      return { status: response.status, correlationHeader: response.headers.get('X-Correlation-ID'), contentType: response.headers.get('Content-Type'), text: await response.text() }
    }, { url: alternativesUrl, body: MALFORMED_BODY })
    expect(result.status).toBe(400)
    expect(result.contentType).toContain('json')
    const body = JSON.parse(result.text) as { status: number; error: string; code: string; message: string; path: string; correlationId: string; violations?: unknown[] }
    expect(body).toMatchObject({ status: 400, error: 'Bad Request', code: 'MALFORMED_REQUEST_BODY', message: 'The request body is missing or malformed.', path: '/api/alternatives' })
    // `violations` is omitted from this response (not an empty array); both forms mean "no field violations".
    expect(body.violations ?? []).toEqual([])
    expect(result.correlationHeader, 'X-Correlation-ID başlığı boş olmamalı').toBeTruthy()
    expect(body.correlationId).toBe(result.correlationHeader)
    expect(result.text, 'İç istisna metni sızmamalı').not.toMatch(/Exception|JSON parse/)
  })

  await test.step('4. Layout formu: min span > max span -> alan hatası', async () => {
    await gotoInProject(page, writes, projectId, '/layout-generator')
    const range = page.locator('.spn-range-field').filter({ has: page.locator('.spn-range-label', { hasText: /^Span length \(m\)$/ }) })
    const [minInput, maxInput] = [range.locator('input').nth(0), range.locator('input').nth(1)]
    const max = Number(await maxInput.inputValue())
    expect(Number.isFinite(max)).toBe(true)
    await minInput.fill(String(max + 1))
    const layoutCalls = diagnostics.apiCalls({ method: 'POST', url: '/api/layout/generate' }).length
    await page.getByRole('button', { name: 'GENERATE LAYOUTS' }).click()
    await expect(range.getByText('Max span must be ≥ min span')).toBeVisible()
    await expect(page.getByRole('heading', { name: '(not generated yet)' })).toBeVisible()
    expect(diagnostics.apiCalls({ method: 'POST', url: '/api/layout/generate' }).length, 'Geçersiz formda istek gitmez').toBe(layoutCalls)
  })

  diagnostics.expectClean()
})
