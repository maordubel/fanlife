/**
 * The 1990 gate, on its own: with the ticket in hand, does walking through the doorway
 * under the stand take the boy into the tunnel? Both directions, both ways in (walking
 * through the zone; pressing A on the door prompt).
 *
 *   node scripts/life/gate-probe.mjs [http://127.0.0.1:3000]
 */
import { chromium } from 'playwright'

const BASE = process.argv[2] ?? 'http://127.0.0.1:3000'
const EXECUTABLE = process.env.PW_CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const browser = await chromium.launch({ executablePath: EXECUTABLE, args: ['--no-sandbox', '--disable-gpu'] })
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
const page = await context.newPage()
await page.route('**://{pagead2.googlesyndication.com,www.googletagmanager.com,www.google.com,accounts.google.com}/**', (r) => r.abort())
const read = () => page.evaluate(() => ({
  place: document.querySelector('[data-life="place"]')?.textContent?.trim() ?? null,
  prompt: (document.querySelector('[data-life="prompt"]')?.textContent?.trim() ?? '').replace(/^A\s*/, '') || null,
  dialogue: document.querySelector('[data-life="dialogue"]')?.textContent?.trim()?.replace(/\s+/g, ' ').slice(0, 60) ?? null,
  board: document.querySelector('[data-life="scoreboard"]')?.textContent?.trim()?.replace(/\s+/g, ' ') ?? null,
  px: window.__life?.debug?.where?.() ?? null,
}))
const BASE_EVENTS = [
  { t: 'flag.raised', flag: 'prologue:done' }, { t: 'chapter.entered', chapter: '1986' },
  { t: 'flag.raised', flag: 'onboard:moved' }, { t: 'flag.raised', flag: 'onboard:acted' }, { t: 'flag.raised', flag: 'onboard:street' },
  { t: 'chapter.completed', chapter: '1986' },
]
const seed = async (minute, flags, where) => {
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
  await page.evaluate(([events]) => {
    window.localStorage.setItem('the-worker:life', JSON.stringify({ version: 3, identity: { name: 'פוגי', sex: 'boy', birthYear: 1978 }, year: 1986, events, savedAt: new Date().toISOString() }))
    window.sessionStorage.setItem('the-worker:life:opening', '1'); window.localStorage.setItem('the-worker:life:probe', '1')
  }, [[...BASE_EVENTS, { t: 'year.entered', year: 1990, weekday: 6, minute }, { t: 'chapter.entered', chapter: '1990' }, { t: 'flag.raised', flag: 'life:passage-1990' }, ...flags.map((flag) => ({ t: 'flag.raised', flag })), { t: 'moved', to: where }]])
  await page.goto(`${BASE}/life`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('canvas'); await page.waitForTimeout(3500)
}
const clear = async () => { for (let i = 0; i < 12; i += 1) { if ((await page.locator('[data-life="dialogue"]').count()) === 0) return; await page.keyboard.press('e'); await page.waitForTimeout(400) } }

// A: ticket already in hand, walk right from the road end through the doorway
await seed(15 * 60 + 50, ['knows:math', 'math:six', 'went:withKobi', 'kobi:left', 'saw:ground', 'entry:granted', 'entry:kobi'], 'bloomfield-outside')
console.log('A start', JSON.stringify(await read()))
for (let i = 0; i < 14; i += 1) {
  await page.keyboard.down('ArrowRight'); await page.waitForTimeout(700); await page.keyboard.up('ArrowRight'); await page.waitForTimeout(200)
  const r = await read(); console.log(`A ${i} ${r.place} prompt=${r.prompt} dlg=${r.dialogue} ${JSON.stringify(r.px)}`)
  if (r.dialogue) await clear()
  if (r.place !== 'בלומפילד — מבחוץ') break
}
await page.waitForTimeout(4000); console.log('A end', JSON.stringify(await read()))
await page.screenshot({ path: '/tmp/shots/gate-A.png' })

// B: from Kobi (the reunion at the gate), walk LEFT into the doorway
await seed(15 * 60 + 50, ['knows:math', 'math:six', 'went:withKobi', 'kobi:left', 'saw:ground'], 'bloomfield-outside')
// walk right to Kobi and press A when he is named
for (let i = 0; i < 16; i += 1) {
  const r = await read()
  if (r.prompt && r.prompt.includes('קובי')) { await page.keyboard.press('e'); await page.waitForTimeout(700); break }
  await page.keyboard.down('ArrowRight'); await page.waitForTimeout(700); await page.keyboard.up('ArrowRight'); await page.waitForTimeout(200)
}
await clear()
console.log('B after Kobi', JSON.stringify(await read()))
for (let i = 0; i < 14; i += 1) {
  await page.keyboard.down('ArrowLeft'); await page.waitForTimeout(700); await page.keyboard.up('ArrowLeft'); await page.waitForTimeout(200)
  const r = await read(); console.log(`B ${i} ${r.place} prompt=${r.prompt} dlg=${r.dialogue} ${JSON.stringify(r.px)}`)
  if (r.dialogue) await clear()
  if (r.place !== 'בלומפילד — מבחוץ') break
}
await page.waitForTimeout(4000); console.log('B end', JSON.stringify(await read()))
await page.screenshot({ path: '/tmp/shots/gate-B.png' })
await browser.close()
