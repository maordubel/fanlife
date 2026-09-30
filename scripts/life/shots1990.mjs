/**
 * Three stills of 12.5.1990, for eyes: the kitchen table, the board after the whistle,
 * the ending card. Seeds, no walking.
 *
 *   node scripts/life/shots1990.mjs [http://127.0.0.1:3000]
 */
import { chromium } from 'playwright'

const BASE = process.argv[2] ?? 'http://127.0.0.1:3000'
const EXECUTABLE = process.env.PW_CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const SHOT = process.env.PROBE_SHOT ?? '/tmp/shots/s1990'
const browser = await chromium.launch({ executablePath: EXECUTABLE, args: ['--no-sandbox', '--disable-gpu'] })
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
const page = await context.newPage()
await page.route('**://{pagead2.googlesyndication.com,www.googletagmanager.com,www.google.com,accounts.google.com}/**', (r) => r.abort())
const BASE_EVENTS = [
  { t: 'flag.raised', flag: 'prologue:done' }, { t: 'chapter.entered', chapter: '1986' },
  { t: 'flag.raised', flag: 'onboard:moved' }, { t: 'flag.raised', flag: 'onboard:acted' }, { t: 'flag.raised', flag: 'onboard:street' },
  { t: 'chapter.completed', chapter: '1986' },
]
const seed = async (minute, flags, where) => {
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
  await page.evaluate(([events]) => {
    window.localStorage.setItem('the-worker:life', JSON.stringify({ version: 3, identity: { name: 'פוגי', sex: 'boy', birthYear: 1978 }, year: 1986, events, savedAt: new Date().toISOString() }))
    window.sessionStorage.setItem('the-worker:life:opening', '1')
    window.localStorage.setItem('the-worker:life:probe', '1')
  }, [[...BASE_EVENTS, { t: 'year.entered', year: 1990, weekday: 6, minute }, { t: 'chapter.entered', chapter: '1990' }, { t: 'flag.raised', flag: 'life:passage-1990' }, ...flags.map((flag) => ({ t: 'flag.raised', flag })), { t: 'moved', to: where }]])
  await page.goto(`${BASE}/life`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('canvas'); await page.waitForTimeout(3500)
}
const clear = async () => { for (let i = 0; i < 14; i += 1) { if ((await page.locator('[data-life="dialogue"]').count()) === 0) return; await page.keyboard.press('e'); await page.waitForTimeout(400) } }

// 1. the kitchen: walk right a little so the table end of the room is in frame
await seed(12 * 60 + 35, ['saw:table'], 'kitchen')
await clear()
await page.keyboard.down('ArrowRight'); await page.waitForTimeout(26000); await page.keyboard.up('ArrowRight'); await page.waitForTimeout(900)
console.log('kitchen', JSON.stringify(await page.evaluate(() => ({ where: window.__life?.debug?.where?.(), prompt: document.querySelector('[data-life="prompt"]')?.textContent }))))
await page.screenshot({ path: `${SHOT}-kitchen.png` })

// 2. the terrace after the whistle: the board and the line under it
await seed(17 * 60 + 46, ['knows:math', 'math:six', 'went:withKobi', 'entry:granted', 'entry:kobi', 'knows:pillar', 'match:over', 'saw:goal', 'net:six'], 'bloomfield-inside')
await page.waitForTimeout(1500)
console.log('over', JSON.stringify(await page.evaluate(() => document.querySelector('[data-life="scoreboard"]')?.textContent)))
await page.screenshot({ path: `${SHOT}-over.png` })

// 3. the ending card: seed at home with Kobi found, talk to Rachel
await seed(18 * 60 + 30, ['knows:math', 'math:six', 'went:withKobi', 'entry:granted', 'match:over', 'saw:goal', 'net:six', 'found:kobi'], 'home')
for (let i = 0; i < 20; i += 1) {
  const p = await page.evaluate(() => document.querySelector('[data-life="prompt"]')?.textContent ?? '')
  if (p.includes('רחל')) { await page.keyboard.press('e'); break }
  await page.keyboard.down('ArrowLeft'); await page.waitForTimeout(600); await page.keyboard.up('ArrowLeft'); await page.waitForTimeout(200)
}
await page.waitForTimeout(600); await clear(); await page.waitForTimeout(1500)
console.log('ending', (await page.locator('[data-life="ending"]').count()) > 0)
await page.screenshot({ path: `${SHOT}-ending.png`, fullPage: false })
await browser.close()
