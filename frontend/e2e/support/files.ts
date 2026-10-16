import type { Locator, Page } from '@playwright/test'
import { fileURLToPath } from 'node:url'
import * as XLSX from 'xlsx'

/** Backend test fixture used by scenario 08 (4 points, 2 faces, surface "Existing Ground", alignment "Main Alignment"). */
export const LANDXML_FIXTURE = fileURLToPath(new URL('../../../backend/src/test/resources/sample.landxml', import.meta.url))

export type FilePayload = string | { name: string; mimeType: string; buffer: Buffer }

/** In-memory .xlsx with one sheet named "Sheet1" built from array-of-arrays rows (first row = header). */
export function xlsxBuffer(rows: (string | number)[][]): Buffer {
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), 'Sheet1')
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}

export const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

/** Clicks `trigger` (a button that opens the native chooser) and answers the file chooser with `payload`. */
export async function chooseFile(page: Page, trigger: Locator, payload: FilePayload): Promise<void> {
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), trigger.click()])
  await chooser.setFiles(payload)
}
