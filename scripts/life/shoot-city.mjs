import { chromium } from 'playwright'
import fs from 'node:fs'

const OUT = '/tmp/cityproof'
fs.mkdirSync(OUT, { recursive: true })
const shots = JSON.parse(process.argv[2])
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })
page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE', m.text().slice(0, 200)) })
for (const s of shots) {
  const url = `http://localhost:3311/city?${new URLSearchParams(s.q)}`
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.waitForSelector('[data-ready="1"]', { timeout: 20000 }).catch(() => console.log('NOT READY', s.name))
  await page.waitForTimeout(900)
  await page.screenshot({ path: `${OUT}/${s.name}.png` })
  console.log('shot', s.name)
}
await browser.close()
