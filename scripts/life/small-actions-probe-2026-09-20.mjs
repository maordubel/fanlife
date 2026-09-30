/**
 * שמונה אחר־צהריים, בדפדפן — כלל 33 על התוכן של דלתא 79.
 *
 *   node scripts/life/small-actions-probe-2026-09-20.mjs http://127.0.0.1:3519
 *
 * `tests/life-routes.test.ts` מוכיח שהנקודות החמות קיימות ושהחדרים נגישים. זה דבר אחר
 * ומאוחר יותר: שהאגודל באמת מוצא אותן, שהשיחה שהן פותחות מדפיסה את המשפט שנכתב לה,
 * ושהיא **נסגרת** אחרי שעשית אותה — הענף השני, שהוא מה שמונע טחנה.
 *
 * הבדיקה קוראת דרך `window.__life` ולא דרך פיקסלים: `debug.goTo` מעביר חדר,
 * `debug.targets()` מחזיר כל מה שאגודל יכול ללחוץ עליו עכשיו, ו-`talk(id)` פותח שיחה.
 * מה שהיא מאמתת בעיניים הוא ה-DOM של תיבת הדיאלוג, כי זה מה שהשחקן קורא.
 */
import { chromium } from 'playwright'

const BASE = process.argv[2] ?? 'http://127.0.0.1:3519'

/** room → the conversation its small action opens */
const WANT = [
  ['kiosk', 'route-verify-report'],
  ['bedroom', 'route-write-account'],
  ['bedroom', 'route-make-work'],
  ['kitchen', 'route-check-budget'],
  ['allenby', 'route-work-commitment'],
  ['bloomfield-outside', 'route-organize-group'],
  ['ticket-office', 'route-plan-journey'],
  ['ussishkin-end', 'route-help-team'],
  ['bedroom', 'route-distance-offer'],
]

const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
const p = await ctx.newPage()
const errors = []
p.on('pageerror', (e) => errors.push(String(e)))

await p.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
await p.evaluate(() => {
  localStorage.setItem('the-worker:life:probe', '1')
  localStorage.setItem('the-worker:life', JSON.stringify({
    version: 3,
    identity: { name: 'פוגי', sex: 'boy', birthYear: 1978 },
    year: 2000,
    events: [
      { t: 'flag.raised', flag: 'life:opening' },
      { t: 'flag.raised', flag: 'prologue:done' },
      { t: 'chapter.entered', chapter: '2000-double' },
      { t: 'moved', to: 'home' },
      { t: 'flag.raised', flag: 'onboard:street' },
      { t: 'flag.raised', flag: 'onboard:moved' },
      { t: 'flag.raised', flag: 'onboard:acted' },
    ],
    savedAt: new Date().toISOString(),
  }))
})
await p.goto(`${BASE}/life`, { waitUntil: 'domcontentloaded' })
await p.waitForSelector('canvas')
await p.waitForTimeout(7000)

// a chapter opens on up to four cards; clear whatever is on the glass
for (let i = 0; i < 14; i++) {
  const closed = await p.evaluate(() => {
    const direct = document.querySelector('[data-life="shirt-card"], [data-life="card"], [data-life="continue"], [data-life="reveal"], [data-life="achievement-close"]')
    if (direct) { direct.dispatchEvent(new MouseEvent('click', { bubbles: true })); return true }
    const sheet = document.querySelector('[data-life="season-ticket"], [data-life="route"]')
    if (sheet) { [...sheet.querySelectorAll('button')].pop()?.click(); return true }
    return null
  })
  if (!closed) break
  await p.waitForTimeout(600)
}

let bad = 0
for (const [room, act] of WANT) {
  await p.evaluate((r) => window.__life?.debug?.goTo?.(r), room)
  await p.waitForTimeout(2200)

  const where = await p.evaluate(() => {
    const w = window.__life?.debug?.where?.()
    return typeof w === 'string' ? w : (w?.scene ?? w?.location ?? w?.id ?? JSON.stringify(w))
  })
  // `targets()` answers `{ kind, id, labelHe }` — an `act` target's id IS its conversation
  const found = await p.evaluate((a) => {
    const targets = window.__life?.debug?.targets?.() ?? []
    return targets.find((t) => t.id === a) ?? null
  }, act)

  // open it and read the line the player would read
  await p.evaluate((a) => window.__life?.talk?.(a), act)
  await p.waitForTimeout(900)
  const line = await p.evaluate(() => document.querySelector('[data-life="line"]')?.textContent?.trim() ?? null)
  const choices = await p.evaluate(() =>
    [...document.querySelectorAll('[data-life="choice"], [role="dialog"] button')].map((b) => (b.textContent ?? '').trim()).filter(Boolean),
  )

  const ok = Boolean(found) && Boolean(line) && line.length > 8
  if (!ok) bad += 1
  console.log(
    `${ok ? 'OK  ' : 'FAIL'} ${room.padEnd(20)} ${act.padEnd(24)} target=${found ? found.labelHe : 'NO'} where=${where ?? '?'}`,
  )
  console.log(`       line: ${line ?? '—'}`)
  if (choices.length) console.log(`       choices: ${choices.slice(0, 3).join(' | ')}`)

  // leave the box the way a player does
  await p.keyboard.press('Escape')
  await p.waitForTimeout(500)
}

/**
 * ...והמעבר השני, שהוא מה שמונע טחנה.
 *
 * לעשות פעולה אחת באמת — ללחוץ על הבחירה, לא לדמות אותה — ואז לפתוח את אותו חפץ שוב.
 * החדר חייב לומר משפט **אחר**, ולא להציע את העבודה פעם שנייה: `proof.recorded` אדיש
 * לחזרה, המיומנויות והמוניטין אינם.
 */
await p.evaluate((r) => window.__life?.debug?.goTo?.(r), 'kiosk')
await p.waitForTimeout(2000)
await p.evaluate((a) => window.__life?.talk?.(a), 'route-verify-report')
await p.waitForTimeout(900)
const first = await p.evaluate(() => document.querySelector('[data-life="line"]')?.textContent?.trim() ?? null)
const took = await p.evaluate(() => {
  const target = [...document.querySelectorAll('button')].find((b) => (b.textContent ?? '').trim() === 'לבדוק דיווח בשני מקורות')
  if (!target) return false
  target.click()
  return true
})
await p.waitForTimeout(1600)
await p.keyboard.press('Escape')
await p.waitForTimeout(600)

await p.evaluate((a) => window.__life?.talk?.(a), 'route-verify-report')
await p.waitForTimeout(900)
const second = await p.evaluate(() => document.querySelector('[data-life="line"]')?.textContent?.trim() ?? null)
const offered = await p.evaluate(() =>
  [...document.querySelectorAll('button')].some((b) => (b.textContent ?? '').trim() === 'לבדוק דיווח בשני מקורות'),
)
await p.keyboard.press('Escape')

const closes = took && Boolean(second) && second !== first && !offered
console.log('')
// בכוונה בלי לקרוא את ספר הראיות: `snapshot()` לא חושף אותו, ושדה שמחזיר `null`
// ומודפס כמדידה הוא בדיוק הכלי שלא יכול להיכשל (כלל 73). מה שנמדד כאן הוא ההצעה.
console.log(`${closes ? 'OK  ' : 'FAIL'} פעם אחת בפרק   taken=${took} offered-again=${offered}`)
console.log(`       after: ${second ?? '—'}`)
if (!closes) bad += 1

console.log(`\npage errors : ${errors.length}${errors.length ? ' — ' + errors.slice(0, 3).join(' | ') : ''}`)
console.log(bad === 0 && errors.length === 0 ? 'PASS' : `FAIL — ${bad} unreachable, ${errors.length} page errors`)
await ctx.close()
await b.close()
process.exit(bad === 0 && errors.length === 0 ? 0 : 1)
