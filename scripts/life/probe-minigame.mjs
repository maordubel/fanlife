import { chromium } from 'playwright'

/**
 * פנדלים, עם השוער שלו — a look at the minigame after Maor's art went in (6.9.2026).
 *
 * The keeper was three primitives; he is now five photographs on billboards. Nothing about
 * that is verifiable from a test, so this opens the card, takes the kick, and photographs
 * what a player would see: the pitch, the goal, and a boy in a red shirt standing in it.
 */
const BASE = process.argv[2] ?? 'http://127.0.0.1:3000'
const GAME = process.argv[3] ?? 'penalty'
const W = Number(process.argv[4] ?? 420)
const H = Number(process.argv[5] ?? 800)
const HOOPS = GAME === 'hoops'
const browser = await chromium.launch({
  executablePath: process.env.PW_CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
})
const page = await browser.newPage({ viewport: { width: W, height: H } })
const errors = []
page.on('pageerror', (err) => errors.push(String(err).slice(0, 200)))
page.on('requestfailed', (req) => {
  if (req.url().includes('/life/art/')) errors.push(`missing art: ${req.url().split('/').pop()}`)
})

await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
await page.evaluate((HOOPS) => {
  localStorage.setItem('the-worker:life:probe', '1')
  localStorage.setItem(
    'the-worker:life',
    JSON.stringify({
      version: 3,
      identity: { name: 'פוגי', sex: 'boy', birthYear: 1978 },
      year: HOOPS ? 1991 : 1986,
      events: [
        { t: 'flag.raised', flag: 'life:opening' },
        { t: 'flag.raised', flag: 'prologue:done' },
        { t: 'chapter.entered', chapter: HOOPS ? '1991' : '1986' },
        ...['onboard:street', 'onboard:moved', 'onboard:acted'].map((flag) => ({ t: 'flag.raised', flag })),
      ],
      savedAt: new Date().toISOString(),
    }),
  )
}, HOOPS)
await page.goto(`${BASE}/life`, { waitUntil: 'domcontentloaded' })
await page.waitForSelector('canvas', { timeout: 20000 })
await page.waitForTimeout(2500)

// open the card straight off the bus, the way the gig's effect does
await page.evaluate(() => {
  const bus = window.__life
  void bus
  window.dispatchEvent(new CustomEvent('noop'))
})
await page.evaluate((h) => window.__life?.debug.goTo(h ? 'schoolyard' : 'pitch'), HOOPS)
await page.waitForTimeout(3000)
await page.screenshot({ path: '/tmp/penalty-room.png' })

// the card itself: the gig's own effect is a bus event, so ask the bus for it directly
const opened = await page.evaluate((h) => {
  const runtime = window.__life
  if (!runtime) return false
  // the offer flag has to be up for the hotspot, but the CARD is just a bus value
  runtime.debug.raise(h ? 'work:offer:hoops-contest' : 'work:offer:penalty-contest')
  return true
}, HOOPS)
console.log('seeded:', opened)
await page.waitForTimeout(1200)
await page.evaluate((h) => window.__life?.talk(h ? 'gig-hoops-contest-1991' : 'gig-penalty-contest-1986'), HOOPS)
await page.waitForTimeout(1200)
for (let i = 0; i < 8; i += 1) {
  if (await page.$((HOOPS ? '[data-life="hoops-card"]' : '[data-life="penalty-card"]'))) break
  // walk the conversation: advance, then take the first choice
  await page.evaluate(() => window.__life?.advance())
  await page.waitForTimeout(500)
  await page.evaluate(() => window.__life?.choose('do'))
  await page.waitForTimeout(700)
}
const card = await page.$((HOOPS ? '[data-life="hoops-card"]' : '[data-life="penalty-card"]'))
console.log('penalty card on screen:', Boolean(card))
if (card) {
  await page.waitForTimeout(2500)
  await page.screenshot({ path: `/tmp/${GAME}-${W}.png` })
}
// what is actually in the scene, so a dark band on the pitch can be named
const graph = await page.evaluate(() => {
  const w = window
  return w.__penaltyDebug ?? null
})
console.log('graph:', JSON.stringify(graph))
console.log('errors:', errors.length ? errors : 'none')
await browser.close()
