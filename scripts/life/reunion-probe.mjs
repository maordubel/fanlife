/**
 * After the whistle, 1990: walk the terrace from the tunnel end until Kobi is named.
 *   node scripts/life/reunion-probe.mjs
 */
import { chromium } from 'playwright'
const BASE = process.argv[2] ?? 'http://127.0.0.1:3000'
const EXECUTABLE = process.env.PW_CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const browser = await chromium.launch({ executablePath: EXECUTABLE, args: ['--no-sandbox', '--disable-gpu'] })
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
const page = await context.newPage()
await page.route('**://{pagead2.googlesyndication.com,www.googletagmanager.com,www.google.com,accounts.google.com}/**', (r) => r.abort())
const read = () => page.evaluate(() => ({
  prompt: (document.querySelector('[data-life="prompt"]')?.textContent?.trim() ?? '').replace(/^A\s*/, '') || null,
  dialogue: document.querySelector('[data-life="dialogue"]')?.textContent?.trim()?.replace(/\s+/g, ' ').slice(0, 50) ?? null,
  w: window.__life?.debug?.where?.() ?? null,
}))
const BASE_EVENTS = [
  { t: 'flag.raised', flag: 'prologue:done' }, { t: 'chapter.entered', chapter: '1986' },
  { t: 'flag.raised', flag: 'onboard:moved' }, { t: 'flag.raised', flag: 'onboard:acted' }, { t: 'flag.raised', flag: 'onboard:street' },
  { t: 'chapter.completed', chapter: '1986' },
]
await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
await page.evaluate(([events]) => {
  window.localStorage.setItem('the-worker:life', JSON.stringify({ version: 3, identity: { name: 'פוגי', sex: 'boy', birthYear: 1978 }, year: 1986, events, savedAt: new Date().toISOString() }))
  window.sessionStorage.setItem('the-worker:life:opening', '1'); window.localStorage.setItem('the-worker:life:probe', '1')
}, [[...BASE_EVENTS, { t: 'year.entered', year: 1990, weekday: 6, minute: 17 * 60 + 46 }, { t: 'chapter.entered', chapter: '1990' }, { t: 'flag.raised', flag: 'life:passage-1990' },
  ...['knows:math', 'math:six', 'went:withKobi', 'entry:granted', 'entry:kobi', 'knows:pillar', 'match:over', 'saw:goal', 'net:six'].map((flag) => ({ t: 'flag.raised', flag })), { t: 'moved', to: 'bloomfield-inside' }]])
await page.goto(`${BASE}/life`, { waitUntil: 'domcontentloaded' })
await page.waitForSelector('canvas'); await page.waitForTimeout(3500)
console.log('start', JSON.stringify(await read()))
const t0 = Date.now()
while (Date.now() - t0 < 90000) {
  await page.keyboard.down('ArrowRight'); await page.waitForTimeout(900); await page.keyboard.up('ArrowRight'); await page.waitForTimeout(150)
  const r = await read(); console.log(`${((Date.now() - t0) / 1000).toFixed(0)}s x=${r.w?.x} y=${r.w?.y} prompt=${r.prompt}`)
  if (r.prompt?.includes('קובי')) { await page.keyboard.press('e'); await page.waitForTimeout(1200); console.log('said', (await read()).dialogue); break }
}
await page.screenshot({ path: '/tmp/shots/reunion.png' })
await browser.close()
