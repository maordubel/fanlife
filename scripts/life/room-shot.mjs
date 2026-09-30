/**
 * צילום חדר בפרק — **לראות, לא לקרוא** (כלל 52: "דלת ממוקמת בהסתכלות").
 *
 *   node scripts/life/room-shot.mjs <chapter> <room> [flag ...]
 *   WIDTH=390 HEIGHT=844 YEAR=1990 WEEKDAY=6 MINUTE=900 OUT=name node scripts/life/room-shot.mjs …
 *
 * כותב שמירה של אותו פרק (אותו סדר אירועים של `WorldScene.toNextChapter`), טוען, סוגר
 * כרטיסים, מחכה לחדר, ומצלם ל-`data/life-shots/room-<chapter>-<room>.png`. בלי טענות:
 * זה כלי להסתכל בו, והמסקנה היא של מי שמסתכל.
 */
import { mkdirSync, writeFileSync } from 'node:fs'

import { chromium } from 'playwright'

const [chapter, room, ...flags] = process.argv.slice(2)
if (!chapter || !room) {
  console.error('usage: room-shot.mjs <chapter> <room> [flag ...]')
  process.exit(2)
}
const BASE = process.env.BASE ?? 'http://127.0.0.1:3000'
const EXECUTABLE = process.env.PW_CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const W = Number(process.env.WIDTH ?? 1280)
const H = Number(process.env.HEIGHT ?? 820)
const YEAR = Number(process.env.YEAR ?? String(chapter).slice(0, 4)) || 1986
const WEEKDAY = Number(process.env.WEEKDAY ?? 6)
const MINUTE = Number(process.env.MINUTE ?? 15 * 60)
const OUT = 'data/life-shots'
const NAME = process.env.OUT ?? `room-${chapter}-${room}${W < 600 ? '-phone' : ''}`
const CARRIED = ['prologue:done', 'life:opening', 'life:knows:hall', 'onboard:moved', 'onboard:acted', 'onboard:street']

mkdirSync(OUT, { recursive: true })
const browser = await chromium.launch({ executablePath: EXECUTABLE })
const page = await (await browser.newContext({ viewport: { width: W, height: H } })).newPage()
await page.route('**://{pagead2.googlesyndication.com,www.googletagmanager.com,www.google.com,accounts.google.com}/**', (r) => r.abort())
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
await page.evaluate(
  ([id, where, raised, y, wd, min]) => {
    // the carried flags before the chapter, and the chapter's own AFTER it: `year.entered`
    // clears every day flag (`personFlags`), so a `b:night` raised first never arrived
    const carried = raised.filter((flag) => /^(life|onboard|prologue|own|went|owe|promise|album|scarf|met|cutscene):/.test(flag))
    const today = raised.filter((flag) => !carried.includes(flag))
    // `life:partner=dor` — a flag that carries a value (`flag.set`), for the people who stand
    // in a room only in one life
    const raise = (flag) => (flag.includes('=') ? { t: 'flag.set', flag: flag.split('=')[0], value: flag.split('=')[1] } : { t: 'flag.raised', flag })
    const events = carried.map(raise)
    if (id !== '1986') events.push({ t: 'year.entered', year: y, weekday: wd, minute: min })
    events.push({ t: 'chapter.entered', chapter: id })
    for (const flag of today) events.push(raise(flag))
    events.push({ t: 'moved', to: where })
    window.localStorage.setItem('the-worker:life', JSON.stringify({ version: 4, identity: { name: 'פוגי', sex: 'boy', birthYear: 1978 }, year: y, events, savedAt: new Date().toISOString() }))
    window.localStorage.setItem('the-worker:life:probe', '1')
  },
  [chapter, room, [...CARRIED, ...flags], YEAR, WEEKDAY, MINUTE],
)
await page.goto(`${BASE}/life`, { waitUntil: 'domcontentloaded' })
await page.waitForSelector('canvas', { timeout: 30000 }).catch(() => {})
for (let i = 0; i < 8; i += 1) {
  for (const selector of ['[data-life="cast-card"]', '[data-life="opening-skip"]', '[data-life="shirt-card"]', '[data-life="album-card"]', '[data-life="ticket-card"]', '[data-life="place-card"]', '[data-life="reveal-close"]', '[data-life="season-ticket"] button']) {
    const card = page.locator(selector)
    if ((await card.count()) > 0) await card.first().click({ timeout: 1500 }).catch(() => {})
  }
  await page.waitForTimeout(900)
}
/**
 * `WALK=0.9,0.8` — לגעת בנקודה על הזכוכית (שבר מרוחב ומגובה החלון) ולחכות שהוא יגיע.
 * `SPOT=<hotspot id>` — ללכת לנקודה החמה עצמה, דרך `debug.targets()`.
 */
if (process.env.WALK) {
  const [fx, fy] = process.env.WALK.split(',').map(Number)
  for (let i = 0; i < 3; i += 1) {
    await page.evaluate(([x, y]) => window.__life?.pointAtScreen(x, y), [fx * W, fy * H])
    await page.waitForTimeout(Number(process.env.WALK_MS ?? 9000))
  }
}
await page.waitForTimeout(Number(process.env.WAIT ?? 1500))
writeFileSync(`${OUT}/${NAME}.png`, await page.screenshot())
const place = await page.evaluate(() => document.querySelector('[data-life="place"]')?.textContent?.trim() ?? null)
console.log(`${OUT}/${NAME}.png`, place, errors.length ? `ERR ${errors[0].slice(0, 100)}` : '')
await browser.close()
