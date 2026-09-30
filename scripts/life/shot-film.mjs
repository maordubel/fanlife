import { chromium } from 'playwright'
const BASE = process.argv[2] ?? 'http://127.0.0.1:3000'
const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--disable-gpu'] })
for (const [name, vp, mobile] of [['phone', { width: 390, height: 844 }, true], ['desk', { width: 1280, height: 720 }, false]]) {
  const ctx = await browser.newContext({ viewport: vp, hasTouch: mobile, isMobile: mobile })
  const page = await ctx.newPage()
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('the-worker:life:probe', '1') })
  await page.goto(`${BASE}/life`, { waitUntil: 'domcontentloaded' })
  // the six beats hold 4800/4600/5600/6000/4400/6000 ms; sample the middle of each
  const holds = [4800, 4600, 5600, 6000, 4400, 6000]
  let t = 0
  for (let i = 0; i < holds.length; i += 1) {
    const mid = t + holds[i] / 2
    await page.waitForTimeout(Math.max(400, mid - (await page.evaluate(() => performance.now()))))
    await page.screenshot({ path: `/tmp/film-${name}-${i + 1}.png` })
    t += holds[i]
  }
  await ctx.close()
}
await browser.close()
console.log('shots written')
