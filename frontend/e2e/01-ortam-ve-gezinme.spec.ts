/**
 * docs/e2e/01-ortam-ve-gezinme.md
 *
 * Otomatikleştirilen adımlar: 1 (sağlık `UP`), 2 (New Project, POST 201, `?project=<id>`), 3 (Project/Graph/Family/Loads gezinmesi),
 * 4 (Graph ve Family doğrudan URL + yenileme, geri/ileri), 5 (Console/Network kontrolü).
 * Otomatikleştirilmeyen / yerine konan: "başlık ve ana çalışma alanı görünsün" -> yol, `aria-current="page"` ve `?project` kontrolü
 * (başlık metinleri sabit yazılmadı); 5. adımdaki F12 ekran görüntüsü -> `diagnostics.expectClean()` (pageerror, console.error, 4xx/5xx).
 */
import { HEALTH_URL } from './support/env.ts'
import { expect, test } from './support/fixtures.ts'
import { createProjectViaUi, gotoInProject, reloadSettled, uniqueProjectName } from './support/projects.ts'

test('01 Ortam açılışı ve gezinme', async ({ page, request, diagnostics, writes }) => {
  const name = uniqueProjectName('01')

  await test.step('1. Sağlık yanıtı UP', async () => {
    const response = await request.get(HEALTH_URL)
    expect(response.status()).toBe(200)
    expect((await response.json()) as { status: string }).toMatchObject({ status: 'UP' })
  })

  const { projectId } = await test.step('2. New Project: POST 201 ve URL ?project=<id>', () => createProjectViaUi(page, name))
  const nav = page.getByRole('navigation', { name: 'Workspaces' })

  await test.step('3. Project, Graph, Family, Loads gezinmesi', async () => {
    const stops = [
      { label: 'Project', path: '/project' },
      { label: 'Graph', path: '/graph' },
      { label: 'Family', path: '/family-tables' },
      { label: 'Loads', path: '/loads' },
    ]
    for (const { label, path } of stops) {
      await nav.getByRole('link', { name: label, exact: true }).click()
      await expect(page).toHaveURL(new RegExp(`${path}\\?project=${projectId}$`))
      await expect(nav.getByRole('link', { name: label, exact: true })).toHaveAttribute('aria-current', 'page')
    }
  })

  await test.step('4. Doğrudan URL, yenileme, geri/ileri', async () => {
    await gotoInProject(page, writes, projectId, '/graph')
    await expect(page).toHaveURL(new RegExp(`/graph\\?project=${projectId}$`))
    await reloadSettled(page, writes, projectId)
    await expect(page).toHaveURL(new RegExp(`/graph\\?project=${projectId}$`))
    await expect(nav.getByRole('link', { name: 'Graph', exact: true })).toHaveAttribute('aria-current', 'page')

    await gotoInProject(page, writes, projectId, '/family-tables')
    await reloadSettled(page, writes, projectId)
    await expect(page).toHaveURL(new RegExp(`/family-tables\\?project=${projectId}$`))
    await expect(nav.getByRole('link', { name: 'Family', exact: true })).toHaveAttribute('aria-current', 'page')

    await page.goBack()
    await expect(page).toHaveURL(new RegExp(`/graph\\?project=${projectId}$`))
    await page.goForward()
    await expect(page).toHaveURL(new RegExp(`/family-tables\\?project=${projectId}$`))
  })

  await test.step('5. Console ve Network temiz', () => { diagnostics.expectClean() })
})
