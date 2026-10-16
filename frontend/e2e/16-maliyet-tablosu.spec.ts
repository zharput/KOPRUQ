/**
 * docs/e2e/16-maliyet-tablosu.md
 *
 * Otomatikleştirilen: 1 (boş durum + From Excel), 2 (.xlsx seçimi, dosya adı, `1 row(s)`, başlıklar, veri satırı),
 * 3 (backend'e fiyat/kost isteği gitmez), 4 (yenileme sonrası tablo kaybolur = bilinen yerel durum sınırı; maliyet özeti/karbon yok).
 * Yerine konan / manuel: belgedeki "hazırlanan .xlsx" Node'da `xlsx` paketiyle bellekte üretilir (Kalem/BirimFiyat, E2E örnek, 1);
 * "maliyet özeti veya karbon çıktısı görünmemeli" yalnız metin düzeyinde (zayıf kontrol) doğrulanır.
 */
import { chooseFile, XLSX_MIME, xlsxBuffer } from './support/files.ts'
import { expect, test } from './support/fixtures.ts'
import { openProjectSection } from './support/navigation.ts'
import { createProjectViaUi, reloadSettled, uniqueProjectName } from './support/projects.ts'
import { COST_SHEET } from './support/scenarioData.ts'

test('16 Cost Database Excel içe aktarma sınırı', async ({ page, diagnostics, writes }) => {
  const { projectId } = await createProjectViaUi(page, uniqueProjectName('16'))
  await openProjectSection(page, 'Cost Database')
  const center = page.locator('main.spn-project-center')
  const fileName = 'e2e-maliyet.xlsx'

  await test.step('1. Boş durum ve From Excel', async () => {
    await expect(center.getByRole('heading', { name: 'Cost Database' })).toBeVisible()
    await expect(center.getByText('(no data yet - use "From Excel" above)')).toBeVisible()
    await expect(center.getByRole('button', { name: 'From Excel' })).toBeVisible()
  })

  const callsBefore = diagnostics.calls.length
  await test.step('2. .xlsx içe aktarma', async () => {
    await chooseFile(page, center.getByRole('button', { name: 'From Excel' }), { name: fileName, mimeType: XLSX_MIME, buffer: xlsxBuffer(COST_SHEET) })
    await expect(center.getByText(`${fileName} - 1 row(s).`)).toBeVisible()
    const table = center.locator('table.spn-table')
    await expect(table.locator('th')).toHaveText(COST_SHEET[0].map(String))
    await expect(table.locator('tbody tr')).toHaveCount(1)
    await expect(table.locator('tbody td')).toHaveText(COST_SHEET[1].map(String))
    await expect(center.locator('.spn-error')).toHaveCount(0)
  })

  await test.step('3. Backend fiyat/kost isteği yok', async () => {
    const after = diagnostics.calls.slice(callsBefore)
    expect(after.filter((call) => !call.path.startsWith('/api/projects')).map((call) => `${call.method} ${call.path}`)).toEqual([])
  })

  await test.step('4. Yenileme: tablo kaybolur (yerel durum), maliyet özeti yok', async () => {
    await reloadSettled(page, writes, projectId)
    await expect(center.getByText('(no data yet - use "From Excel" above)')).toBeVisible()
    await expect(center.locator('table.spn-table')).toHaveCount(0)
    await expect(center).not.toContainText(/total cost|CO2|carbon/i)
  })

  diagnostics.expectClean()
})
