import { chromium } from 'playwright'

/**
 * המשימה הראשונה, מאפס — a2-alley, the way a person who pressed "new game" meets it.
 *
 * Maor started over and reported that the father is not in the game at all and there is
 * no way forward. This run takes no shortcut: clean storage, the opening, the prologue,
 * and then it stands in the first room and asks who is actually there, what the objective
 * says, what the room says when the player is stuck, and whether any door opens.
 */
const BASE = process.argv[2] ?? 'http://127.0.0.1:3000'
const browser = await chromium.launch({
  executablePath: process.env.PW_CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox', '--disable-gpu'],
})
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })).newPage()
const errors = []
page.on('pageerror', (e) => errors.push(e.message.slice(0, 160)))

await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('the-worker:life:probe', '1') })
await page.goto(`${BASE}/life`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(4000)

// through the opening film
for (let i = 0; i < 14; i += 1) {
  const skip = await page.$('[data-life="opening-skip"]')
  if (!skip) break
  await skip.click().catch(() => {})
  await page.waitForTimeout(1200)
}
await page.waitForSelector('canvas', { timeout: 30000 }).catch(() => {})
await page.waitForTimeout(2500)
// through the prologue
for (let i = 0; i < 30; i += 1) {
  const w = await page.evaluate(() => window.__life?.debug?.where?.() ?? null)
  if (w?.scene && w.scene !== 'prologue') break
  await page.evaluate(() => window.__life?.skipIntro?.())
  await page.waitForTimeout(1200)
}
await page.waitForTimeout(3500)

const report = await page.evaluate(() => {
  const l = window.__life
  const snap = l?.snapshot?.() ?? {}
  return {
    where: l?.debug?.where?.() ?? null,
    chapter: snap.state?.chapter ?? null,
    minute: snap.state?.minute ?? null,
    bodies: (l?.debug?.bodies?.() ?? []).map((b) => b.who),
    objective: document.querySelector('[data-life="objective"]')?.textContent?.trim() ?? null,
    hud: document.querySelector('[data-life="place"]')?.textContent?.trim() ?? null,
    flags: Object.keys(snap.state?.flags ?? {}),
  }
})
console.log(JSON.stringify(report, null, 1))
await page.screenshot({ path: '/tmp/a2-room.png' })

// what does the room say when you are stuck
await page.evaluate(() => window.__life?.debug?.stuck?.())
await page.waitForTimeout(800)
console.log('errors:', errors.length ? errors : 'none')
await browser.close()
