import type { Page, TestInfo } from '@playwright/test'

/** Screenshot attached to the report as evidence (the manual scenarios ask for screenshots). Never asserted. */
export async function attachScreenshot(testInfo: TestInfo, page: Page, name: string): Promise<void> {
  await testInfo.attach(name, { body: await page.screenshot({ fullPage: false }), contentType: 'image/png' })
}
