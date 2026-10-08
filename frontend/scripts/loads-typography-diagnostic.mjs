import { chromium } from 'playwright'

const url = process.env.KOPRUQ_URL ?? 'http://127.0.0.1:5173/loads'
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()
await page.goto(url, { waitUntil: 'networkidle' })

const report = await page.evaluate(() => {
  const read = (element) => {
    if (!element) return { found: false }
    const style = getComputedStyle(element)
    return {
      found: true,
      text: element.textContent?.trim().replace(/\\s+/g, ' ').slice(0, 120),
      tag: element.tagName,
      className: element.className,
      fontSize: style.fontSize,
      color: style.color,
    }
  }
  const text = (value) => [...document.querySelectorAll('*')].find((element) => element.textContent?.trim() === value)
  const content = document.querySelector('.spn-loads-workspace')
  return {
    root: read(content),
    tabs: [...document.querySelectorAll('.spn-loads-workspace .spn-step-sub')].map(read),
    samples: {
      concrete: read(text('Concrete Self Weight')),
      asphalt: read(text('Asphalt')),
      description: read(document.querySelector('.spn-loads-workspace .spn-card-subtitle')),
      temperatureNote: read(text('EN 1991-1-5 · Uniform temperature component')),
      windNote: read(text('EN 1991-1-4 · Wind actions on bridges')),
    },
  }
})

console.log(JSON.stringify(report, null, 2))
await browser.close()
