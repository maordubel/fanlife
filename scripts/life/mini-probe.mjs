import { chromium } from 'playwright'
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const page = await (await browser.newContext({ viewport: { width: Number(process.env.VW ?? 390), height: Number(process.env.VH ?? 844) }, hasTouch: true, isMobile: true })).newPage()
page.on('pageerror', (e) => console.log('PAGEERROR', e.message))
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('CONSOLE', m.type(), m.text().slice(0, 200)) })
await page.goto('http://127.0.0.1:3000/', { waitUntil: 'domcontentloaded' })
await page.evaluate((seed) => window.localStorage.setItem('mini:seed', JSON.stringify(seed)), JSON.parse(process.argv[2]))
await page.evaluate(() => {
  const base = [{ t: 'flag.raised', flag: 'life:opening' }, { t: 'flag.raised', flag: 'prologue:done' }, { t: 'chapter.entered', chapter: '1986' }, { t: 'flag.raised', flag: 'onboard:moved' }, { t: 'flag.raised', flag: 'onboard:acted' }, { t: 'flag.raised', flag: 'onboard:street' }]
  const seed = JSON.parse(window.localStorage.getItem('mini:seed') || '[]')
  window.localStorage.setItem('the-worker:life', JSON.stringify({ version: 3, identity: { name: 'פוגי', sex: 'boy', birthYear: 1978 }, year: 1986, events: [...base, ...seed], savedAt: new Date().toISOString() }))
  window.localStorage.setItem('the-worker:life:probe', '1')
})
await page.goto('http://127.0.0.1:3000/life', { waitUntil: 'domcontentloaded' })
await page.waitForSelector('canvas')
for (let i = 0; i < Number(process.argv[3] ?? 6); i += 1) {
  await page.waitForTimeout(1500)
  const r = await page.evaluate(() => ({ where: window.__life?.debug?.where?.(), reveal: !!document.querySelector('[data-life="reveal"]'), dialogue: document.querySelector('[data-life="dialogue"]')?.textContent?.slice(0, 60), card: document.querySelector('[data-life="chapter-card"],[data-life="title-card"]')?.textContent?.slice(0, 40), flags: Object.keys(window.__life?.snapshot?.().state?.flags ?? {}).filter((f) => !f.startsWith('onboard') && !f.startsWith('prologue') && f !== 'life:opening'), choices: [...document.querySelectorAll('[data-life="choice"]')].map((b) => b.getAttribute('data-choice')) }))
  console.log(JSON.stringify(r))
  if (r.reveal) await page.locator('[data-life="reveal-close"]').click().catch(() => {})
  if (r.dialogue && !r.choices.length && process.argv[4] === 'advance') await page.evaluate(() => window.__life.advance())
}
await page.screenshot({ path: `data/life-shots/mini-${process.env.TAG ?? 'x'}.png` })
await browser.close()
