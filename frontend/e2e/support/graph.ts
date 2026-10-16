import { expect, type Locator, type Page } from '@playwright/test'

/** Node Library button for a node label (e.g. "Number", "Steel Girder", "Structural Steel"); a click adds the node to the canvas. */
export function libraryButton(page: Page, label: string): Locator {
  return page.locator('.spn-graph-library').getByRole('button', { name: label, exact: true })
}

/** All nodes currently on the canvas. */
export const canvasNodes = (page: Page): Locator => page.locator('.react-flow__node:not(.react-flow__node-graphGroup)')

/** Adds a node from the library and waits until the canvas shows one more node; returns the new node's React Flow id. */
export async function addLibraryNode(page: Page, label: string): Promise<string> {
  const before = await canvasNodes(page).evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-id') ?? ''))
  await libraryButton(page, label).click()
  await expect(canvasNodes(page)).toHaveCount(before.length + 1)
  const after = await canvasNodes(page).evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-id') ?? ''))
  const added = after.find((id) => !before.includes(id))
  if (!added) throw new Error(`"${label}" düğmesi yeni bir düğüm eklemedi.`)
  return added
}

/** Node root by React Flow id. */
export const nodeById = (page: Page, id: string): Locator => page.locator(`.react-flow__node[data-id="${id}"]`)

/**
 * Drags from the source handle to the target handle with real mouse events (React Flow connects on mouseup over a handle).
 * The nodes must be visible on the canvas (use Fit View first); the handles' positions must be stable (the Fit View animation is over).
 */
export async function dragHandleToHandle(page: Page, source: Locator, target: Locator): Promise<void> {
  const stableBox = async (handle: Locator) => {
    let previous: { x: number; y: number } | null = null
    await expect.poll(async () => {
      const box = await handle.boundingBox()
      const same = box !== null && previous !== null && Math.abs(box.x - previous.x) < 0.5 && Math.abs(box.y - previous.y) < 0.5
      previous = box ? { x: box.x, y: box.y } : null
      return same
    }, { message: 'Handle konumu kararlı hale gelmedi (Fit View animasyonu bitmedi veya handle görünmüyor)' }).toBe(true)
    return (await handle.boundingBox())!
  }
  const sb = await stableBox(source)
  const tb = await stableBox(target)
  await page.mouse.move(sb.x + sb.width / 2, sb.y + sb.height / 2)
  await page.mouse.down()
  await page.mouse.move(tb.x + tb.width / 2, tb.y + tb.height / 2, { steps: 15 })
  await page.mouse.up()
}

/**
 * Connects `sourceHandle` of `sourceNodeId` to `targetHandle` of `targetNodeId` and verifies the edge count. At most two attempts;
 * fails with an explicit message otherwise (this drag is the most fragile step of the Graph scenarios).
 */
export async function connectHandles(page: Page, link: { sourceNodeId: string; sourceHandle: string; targetNodeId: string; targetHandle: string }, expectedEdges: number): Promise<void> {
  const source = nodeById(page, link.sourceNodeId).locator(`.react-flow__handle.source[data-handleid="${link.sourceHandle}"]`)
  const target = nodeById(page, link.targetNodeId).locator(`.react-flow__handle.target[data-handleid="${link.targetHandle}"]`)
  for (let attempt = 1; attempt <= 2; attempt++) {
    await dragHandleToHandle(page, source, target)
    try {
      await expect(page.locator('.react-flow__edge')).toHaveCount(expectedEdges, { timeout: attempt === 1 ? 3000 : 10_000 })
      return
    } catch (error) {
      if (attempt === 2) throw new Error(`Bağlantı ${attempt} denemede kurulamadı (${link.sourceHandle} -> ${link.targetHandle}): ${String(error)}`)
    }
  }
}

/** Open the GRAPH LOG panel (closed by default) and return its `role=log` locator. */
export async function openGraphLog(page: Page): Promise<Locator> {
  const log = page.getByRole('log')
  if (!(await log.isVisible())) await page.getByRole('button', { name: /GRAPH LOG/ }).click()
  await expect(log).toBeVisible()
  return log
}

/** Run button of the Graph toolbar. */
export const runGraphButton = (page: Page): Locator => page.locator('button[title="Run graph"]')
