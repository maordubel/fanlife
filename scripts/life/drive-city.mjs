import { chromium } from 'playwright'
const shots = JSON.parse(process.argv[2])
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader','--enable-unsafe-swiftshader'] })
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true })
page.on('console', (m) => { if (m.type() === 'error' && !/TUNNEL/.test(m.text())) console.log('CONSOLE', m.text().slice(0,180)) })
for (const s of shots) {
  await page.goto(`http://localhost:3311/city?${new URLSearchParams(s.q)}`, { waitUntil: 'networkidle' })
  await page.waitForSelector('[data-ready="1"]', { timeout: 20000 }).catch(() => console.log('NOT READY'))
  await page.waitForTimeout(700)
  if (s.drive) {
    // grab the stick and hold it
    // the stick itself, not a guessed corner: the deck moves with the band height
    const stick = await page.locator('[data-life="deck"] [data-life="stick"], [data-life="deck"]').first().boundingBox()
    const sx = s.drive.x ?? (stick ? stick.x + 52 : 70)
    const sy = s.drive.y ?? (stick ? stick.y + stick.height / 2 : 700)
    await page.mouse.move(sx, sy)
    await page.mouse.down()
    await page.mouse.move(sx + (s.drive.dx ?? 0), sy + (s.drive.dy ?? -55), { steps: 6 })
    await page.waitForTimeout(s.drive.ms ?? 1800)
    await page.screenshot({ path: `/tmp/cityproof/${s.name}.png` })
    const along = await page.evaluate(() => document.querySelector('[data-along]')?.getAttribute('data-along'))
    console.log('  along', along, 'm')
    await page.mouse.up()
  } else {
    await page.screenshot({ path: `/tmp/cityproof/${s.name}.png` })
  }
  console.log('shot', s.name)
}
await browser.close()
