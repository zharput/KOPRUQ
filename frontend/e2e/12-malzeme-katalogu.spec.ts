/**
 * docs/e2e/12-malzeme-katalogu.md
 *
 * Otomatikleştirilen: 1 (ilk satır Drilled piles sınıfı okunur), 2 (C35/45 seçimi, diğer satırlar değişmez), 3 (PUT families/materials,
 * Kaydedildi, GET families.materials), 4 (Exit/Open sonrası seçim korunur), 5 (hesap/solver POST'u yok).
 * Yerine konan / manuel: "Önce/sonra tablo" ekran görüntüsü yerine satır-sınıf eşlemesi önce/sonra karşılaştırılır.
 * Not: ilk ziyarette varsayılan katalog için ayrıca bir PUT gidebilir; spec yalnız DRILLED_PILES=C35/45 içeren PUT'u bekler.
 */
import { expect, test } from './support/fixtures.ts'
import { createProjectViaUi, exitProjectViaFileMenu, gotoInProject, openProjectViaFileMenu, uniqueProjectName } from './support/projects.ts'
import { MATERIAL_CHOICE } from './support/scenarioData.ts'
import { savedToastCount, settleWrites, waitForSectionPut } from './support/writes.ts'
import type { Page } from '@playwright/test'

type MaterialRow = { id: string; concreteClass: string }

async function readRows(page: Page): Promise<{ id: string; element: string; concreteClass: string }[]> {
  const rows = page.locator('[data-testid^="materials-row-"]')
  await expect(rows).toHaveCount(8)
  return rows.evaluateAll((trs) => trs.map((tr) => ({
    id: (tr.getAttribute('data-testid') ?? '').replace('materials-row-', ''),
    element: tr.querySelectorAll('td')[1].textContent ?? '',
    concreteClass: (tr.querySelector('[data-testid^="materials-concrete-class-"]') as HTMLSelectElement).value,
  })))
}

const byId = <T extends { id: string }>(rows: T[], id: string) => rows.find((r) => r.id === id)
const exceptDrilledPiles = <T extends { id: string }>(rows: T[]) => rows.filter((r) => r.id !== 'DRILLED_PILES')

test('12 Malzeme seçimi sunucu projesine kaydediliyor mu', async ({ page, diagnostics, writes, projectApi }) => {
  const name = uniqueProjectName('12')
  const { projectId } = await createProjectViaUi(page, name)
  await gotoInProject(page, writes, projectId, '/materials')

  const before = await readRows(page)
  await expect(page.getByTestId('materials-row-DRILLED_PILES')).toContainText('Drilled piles')
  expect(byId(before, 'DRILLED_PILES')?.concreteClass).not.toBe(MATERIAL_CHOICE)

  await test.step('2-3. Drilled piles -> C35/45 ve PUT families/materials', async () => {
    const savedBefore = await savedToastCount(page)
    const put = waitForSectionPut<MaterialRow[]>(page, projectId, 'families/materials', {
      predicate: (r) => Array.isArray(r.value) && r.value.some((m) => m.id === 'DRILLED_PILES' && m.concreteClass === MATERIAL_CHOICE),
    })
    await page.getByTestId('materials-concrete-class-DRILLED_PILES').selectOption(MATERIAL_CHOICE)
    await put
    await settleWrites(writes)
    await expect.poll(() => savedToastCount(page)).toBeGreaterThan(savedBefore)
    const after = await readRows(page)
    expect(byId(after, 'DRILLED_PILES')?.concreteClass).toBe(MATERIAL_CHOICE)
    expect(exceptDrilledPiles(after), 'Diğer 7 satır değişmez').toEqual(exceptDrilledPiles(before))
    const stored = (await projectApi.getProject(projectId)).families.materials
    expect(stored.find((m) => m.id === 'DRILLED_PILES')?.concreteClass).toBe(MATERIAL_CHOICE)
  })

  await test.step('4. Exit -> Open... -> /materials', async () => {
    await settleWrites(writes)
    await exitProjectViaFileMenu(page)
    await openProjectViaFileMenu(page, name, projectId)
    await gotoInProject(page, writes, projectId, '/materials')
    const reopened = await readRows(page)
    expect(byId(reopened, 'DRILLED_PILES')?.concreteClass).toBe(MATERIAL_CHOICE)
  })

  await test.step('5. Hesap/solver isteği yok', () => {
    const nonProjectPosts = diagnostics.apiCalls({ method: 'POST' }).filter((call) => call.path !== '/api/projects')
    expect(nonProjectPosts.map((call) => call.path)).toEqual([])
  })

  diagnostics.expectClean()
})
