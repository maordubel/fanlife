/**
 * שלב ב׳ — the passage, the table, the terrace: does 1986 become 1990 in a browser?
 *
 *   node scripts/life/stageb-probe.mjs [http://127.0.0.1:3000]
 */
import { chromium } from 'playwright'

const BASE = process.argv[2] ?? 'http://127.0.0.1:3000'
const EXECUTABLE = process.env.PW_CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const SHOT = process.env.PROBE_SHOT ?? '/tmp/shots/stageb'
const browser = await chromium.launch({ executablePath: EXECUTABLE, args: ['--no-sandbox', '--disable-gpu'] })
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
const page = await context.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
page.on('console', (m) => { const t = m.text(); if (m.type() === 'error' && !/ERR_FAILED|GL Driver/.test(t)) errors.push('console:' + t.slice(0, 200)) })
await page.route('**://{pagead2.googlesyndication.com,www.googletagmanager.com,www.google.com,accounts.google.com}/**', (r) => r.abort())
const BASE_EVENTS = [
  { t: 'flag.raised', flag: 'prologue:done' }, { t: 'chapter.entered', chapter: '1986' },
  { t: 'flag.raised', flag: 'onboard:moved' }, { t: 'flag.raised', flag: 'onboard:acted' }, { t: 'flag.raised', flag: 'onboard:street' },
]
const seed = (events) => page.evaluate((events) => {
  window.localStorage.setItem('the-worker:life', JSON.stringify({ version: 3, identity: { name: 'פוגי', sex: 'boy', birthYear: 1978 }, year: 1986, events, savedAt: new Date().toISOString() }))
  window.sessionStorage.setItem('the-worker:life:opening', '1')
  window.localStorage.setItem('the-worker:life:probe', '1')
}, events)
const read = () => page.evaluate(() => ({
  place: document.querySelector('[data-life="place"]')?.textContent?.trim() ?? null,
  date: document.querySelector('[data-life="date"]')?.textContent?.trim() ?? null,
  prompt: document.querySelector('[data-life="prompt"]')?.textContent?.trim() ?? null,
  dialogue: document.querySelector('[data-life="dialogue"]')?.textContent?.trim()?.slice(0, 80) ?? null,
  card: document.querySelector('[data-life="title-card"]')?.textContent?.trim() ?? null,
  board: document.querySelector('[data-life="scoreboard"]')?.textContent?.trim()?.replace(/\s+/g, ' ') ?? null,
  chapter: JSON.parse(window.localStorage.getItem('the-worker:life') ?? '{}').events?.filter((e) => e.t === 'chapter.entered').map((e) => e.chapter).join(',') ?? null,
}))
const rect = async () => page.evaluate(() => { const r = document.querySelector('canvas').getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height } })
const clear = async (max = 12) => {
  for (let i = 0; i < max; i += 1) {
    if ((await page.locator('[data-life="dialogue"]').count()) === 0) return
    await page.keyboard.press('e'); await page.waitForTimeout(260)
  }
}
const out = []
await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })

// ---- 1. the passage: a life that finished 1986
await seed([...BASE_EVENTS, { t: 'moved', to: 'home' }, { t: 'flag.raised', flag: 'found:kobi' }, { t: 'chapter.completed', chapter: '1986' }])
await page.goto(`${BASE}/life`, { waitUntil: 'domcontentloaded' })
await page.waitForSelector('canvas'); await page.waitForTimeout(3000)
out.push(`passage: ${JSON.stringify(await read())}`)
await page.screenshot({ path: `${SHOT}-1-passage.png` })
// walk to the nearest unseen object (the runtime says where they are), press E on the prompt
const where = () => page.evaluate(() => window.__life?.debug?.where?.() ?? null)
for (let step = 0; step < 4; step += 1) {
  let found = false
  for (let i = 0; i < 60 && !found; i += 1) {
    const w = await where()
    if (!w || w.paused) { await clear(); await page.waitForTimeout(300); continue }
    const p = await read()
    if (p.prompt) { await page.keyboard.press('e'); await page.waitForTimeout(500); found = true; break }
    const target = (w.spots ?? []).sort((a, b) => Math.abs(a - w.x) - Math.abs(b - w.x))[0]
    if (target === undefined) break
    const dir = target > w.x ? 'ArrowRight' : 'ArrowLeft'
    await page.keyboard.down(dir); await page.waitForTimeout(220); await page.keyboard.up(dir)
    await page.waitForTimeout(80)
  }
  await clear(); await page.waitForTimeout(1200); await clear()
  out.push(`  look ${step + 1}: found=${found} ${JSON.stringify(await read())}`)
  if (step === 1) await page.screenshot({ path: `${SHOT}-2-older.png` })
}
await page.waitForTimeout(2500)
out.push(`after four looks: ${JSON.stringify(await read())}`)
await page.screenshot({ path: `${SHOT}-3-card.png` })
await page.waitForTimeout(4500)
out.push(`1990: ${JSON.stringify(await read())}`)
await page.screenshot({ path: `${SHOT}-4-kitchen.png` })
await clear(14)
out.push(`after table talk: ${JSON.stringify(await read())}`)

// ---- 2. the terrace at kickoff, 1990
await seed([...BASE_EVENTS, { t: 'chapter.completed', chapter: '1986' }, { t: 'year.entered', year: 1990, weekday: 6, minute: 16 * 60 }, { t: 'chapter.entered', chapter: '1990' },
  { t: 'flag.raised', flag: 'knows:math' }, { t: 'flag.raised', flag: 'math:six' }, { t: 'flag.raised', flag: 'entry:granted' }, { t: 'flag.raised', flag: 'saw:reveal' }, { t: 'moved', to: 'bloomfield-inside' }])
await page.goto(`${BASE}/life`, { waitUntil: 'domcontentloaded' })
await page.waitForSelector('canvas'); await page.waitForTimeout(3500)
out.push(`terrace: ${JSON.stringify(await read())}`)
await page.screenshot({ path: `${SHOT}-5-terrace.png` })
// talk to whoever is in reach, a few times over the match
for (let i = 0; i < 6; i += 1) {
  await page.waitForTimeout(9000)
  await clear()
  const r = await read()
  out.push(`  t+${(i + 1) * 9}s board="${r.board}" prompt="${r.prompt}"`)
  if (r.prompt) { await page.keyboard.press('e'); await page.waitForTimeout(500); const d = await read(); out.push(`    said: ${d.dialogue}`); await clear() }
}
await page.screenshot({ path: `${SHOT}-6-match.png` })
await page.waitForTimeout(150000)
await clear()
out.push(`late: ${JSON.stringify(await read())}`)
await page.screenshot({ path: `${SHOT}-7-over.png` })
console.log(out.join('\n'))
console.log(`errors: ${errors.length ? errors.join(' | ') : 'none'}`)
await browser.close()
