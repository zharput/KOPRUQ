import { expect, type Page } from '@playwright/test'
import { randomBytes } from 'node:crypto'
import { E2E_API_BASE } from './env.ts'
import { jsonOf } from './api.ts'
import { settleWrites, waitForSectionPut, type SectionPut, type WriteTracker } from './writes.ts'

const pad = (n: number) => String(n).padStart(2, '0')

/** `E2E-<NN>-<yyyyMMdd-HHmmss>-<4 hex>`; the `projectCleanup` fixture deletes the project (DELETE /api/projects/{id}) in teardown; the prefix marks it as test data. */
export function uniqueProjectName(scenario: string): string {
  const d = new Date()
  const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
  return `E2E-${scenario}-${stamp}-${randomBytes(2).toString('hex')}`
}

/** `<yyyyMMdd-HHmmss>-<4 hex>` suffix for names that must not start with the `E2E-NN-` pattern (scenarios 02 and 18 documents). */
export function runId(): string {
  return uniqueProjectName('x').slice('E2E-x-'.length)
}

export type CreatedProject = { projectId: string; revision: number }

/** Welcome screen -> "New Project" -> dialog -> "Oluştur". Asserts POST /api/projects 201 and that the URL carries the returned id. */
export async function createProjectViaUi(page: Page, name: string): Promise<CreatedProject> {
  await page.goto('/')
  await page.getByRole('main', { name: 'KOPRUQ Welcome' }).getByRole('button', { name: 'New Project' }).click()
  const dialog = page.getByRole('dialog', { name: 'Yeni proje' })
  await dialog.getByLabel('Proje adı').fill(name)
  const [response] = await Promise.all([
    page.waitForResponse((r) => r.request().method() === 'POST' && new URL(r.url()).pathname === '/api/projects' && r.url().startsWith(E2E_API_BASE)),
    dialog.getByRole('button', { name: 'Oluştur' }).click(),
  ])
  expect(response.status(), 'POST /api/projects').toBe(201)
  const body = await jsonOf<{ projectId: string; revision: number }>(response)
  expect(body.projectId, 'POST /api/projects projectId').toBeTruthy()
  await expect(page).toHaveURL(new RegExp(`[?&]project=${body.projectId}(&|$)`))
  await expectActiveProjectName(page, name)
  return { projectId: body.projectId, revision: body.revision }
}

/** The title block of the top bar shows the open project's name. */
export async function expectActiveProjectName(page: Page, name: string): Promise<void> {
  await expect(page.locator('.spn-active-project strong')).toHaveText(name)
}

/** File -> Exit (closes the session only). */
export async function exitProjectViaFileMenu(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'File', exact: true }).click()
  await page.getByRole('button', { name: '× Exit', exact: true }).click()
}

/** File -> Open... -> row whose text contains `name`; resolves after the project document GET succeeded. */
export async function openProjectViaFileMenu(page: Page, name: string, projectId: string): Promise<void> {
  await page.getByRole('button', { name: 'File', exact: true }).click()
  await page.getByRole('button', { name: 'Open...', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Proje aç' })
  const row = dialog.getByRole('button', { name }).first()
  await Promise.all([waitForProjectGet(page, projectId), row.click()])
  await expect(page).toHaveURL(new RegExp(`[?&]project=${projectId}(&|$)`))
}

function waitForProjectGet(page: Page, projectId: string) {
  return page.waitForResponse((r) => r.request().method() === 'GET' && r.url() === `${E2E_API_BASE}/api/projects/${projectId}` && r.status() === 200)
}

/** Settles pending writes (beforeunload warning), then navigates in the same project and waits for the document GET. */
export async function gotoInProject(page: Page, writes: WriteTracker, projectId: string, path: string): Promise<void> {
  await settleWrites(writes)
  await Promise.all([waitForProjectGet(page, projectId), page.goto(`${path}${path.includes('?') ? '&' : '?'}project=${projectId}`)])
}

/** Settles pending writes, then reloads and waits for the document GET. */
export async function reloadSettled(page: Page, writes: WriteTracker, projectId: string): Promise<void> {
  await settleWrites(writes)
  await Promise.all([waitForProjectGet(page, projectId), page.reload()])
}

/** Project Overview -> Edit Project -> Project Name -> Save; resolves with the PUT workspace whose project name is `name` (asserts status 200 unless `options.status` says otherwise). */
export async function editProjectName(page: Page, projectId: string, name: string, options: { status?: number } = {}): Promise<SectionPut<{ project: { name: string } }>> {
  await page.locator('main.spn-project-center').getByRole('button', { name: 'Edit Project' }).click()
  const aside = page.getByRole('complementary', { name: 'Project Properties' })
  await aside.getByLabel('Project Name').fill(name)
  const put = waitForSectionPut<{ project: { name: string } }>(page, projectId, 'workspace', { predicate: (r) => r.value.project.name === name, status: options.status })
  await aside.getByRole('button', { name: 'Save' }).click()
  return put
}
