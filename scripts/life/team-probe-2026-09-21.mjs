/**
 * חלון TOURNAMENT בדפדפן — מההזמנה ועד הסיום (21.9.2026).
 *
 *   node scripts/life/team-probe-2026-09-21.mjs [http://127.0.0.1:3000]
 *
 * החלון נפתח בהזמנה ולא במסלול, ולכן הדרך היחידה לבדוק שהוא קיים היא ללכת בה:
 * `2000-bridge` בקיוסק → ההתחייבות → הטלפון מאופיר ("צריך שם עד מחר") → "אני בפנים" →
 * כרטיס הסיום → **`2000-team` נפתח במגרש, קיץ 2000** → Y01–Y05 → סיום. במשחק (`Y04`)
 * הבדיקה בוחרת לפרוש בהסכמה, כי המגרש התלת-ממדי הוא מה ש-`life:pitch` בודק, לא זה.
 */
import { chromium } from 'playwright'

const BASE = process.argv[2] ?? 'http://127.0.0.1:3000'
const EXE = process.env.PW_CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const CARRIED = ['prologue:done', 'life:opening', 'life:knows:hall', 'onboard:moved', 'onboard:acted', 'onboard:street']
const MET = ['kobi', 'rachel', 'ofir', 'amit', 'efi', 'shopkeeper', 'usher', 'keren', 'teacher', 'barry', 'liron', 'freddy', 'crowd-limor', 'soko', 'yaron', 'asaf', 'metuki', 'roma', 'yevgeny']
const KNOWN = ['kiosk', 'pitch', 'school', 'route', 'allenby', 'bloomfield', 'ussishkin', 'bus-station']

const browser = await chromium.launch({ executablePath: EXE })
const page = await (await browser.newContext({ viewport: { width: 1280, height: 820 } })).newPage()
await page.route('**://{pagead2.googlesyndication.com,www.googletagmanager.com,www.google.com,accounts.google.com}/**', (r) => r.abort())
const errors = []
page.on('pageerror', (error) => errors.push(String(error)))

await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
await page.evaluate(([carried, met, known]) => {
  const events = carried.map((flag) => ({ t: 'flag.raised', flag }))
  for (const who of met) events.push({ t: 'flag.raised', flag: `own:met:${who}` })
  for (const place of known) events.push({ t: 'flag.raised', flag: `life:reveal:${place}` })
  events.push(
    { t: 'year.entered', year: 2000, weekday: 3, minute: 22 * 60 + 40 },
    { t: 'chapter.entered', chapter: '2000-bridge' },
    // B00 and B01 are behind him: the night and the box
    { t: 'flag.raised', flag: 'b:night' },
    { t: 'flag.raised', flag: 'b:box' },
    { t: 'moved', to: 'kiosk' },
  )
  localStorage.setItem('the-worker:life', JSON.stringify({ version: 4, identity: { name: 'פוגי', sex: 'boy', birthYear: 1978 }, year: 2000, events, savedAt: new Date().toISOString() }))
  localStorage.setItem('the-worker:life:probe', '1')
}, [CARRIED, MET, KNOWN])
await page.goto(`${BASE}/life`, { waitUntil: 'domcontentloaded' })
await page.waitForSelector('canvas', { timeout: 30000 }).catch(() => {})

const hud = () =>
  page.evaluate(() => ({
    place: document.querySelector('[data-life="place"]')?.textContent?.trim() ?? null,
    date: document.querySelector('[data-life="date"]')?.textContent?.trim() ?? null,
  }))

async function closeCards() {
  for (const selector of ['[data-life="opening-skip"]', '[data-life="shirt-card"]']) {
    const card = page.locator(selector)
    if ((await card.count()) > 0) await card.first().click({ timeout: 2000 }).catch(() => {})
  }
  const achievement = page.locator('[data-life="achievement-card"]')
  if ((await achievement.count()) > 0) {
    console.log(`card    ${await achievement.first().getAttribute('aria-label')} — closing`)
    await achievement.locator('button').last().click({ timeout: 2000 }).catch(() => {})
    await page.waitForTimeout(400)
  }
}

/** walk to the choices and press the n-th one that is drawn and enabled */
async function answer(label, pick = 0) {
  for (let i = 0; i < 80; i += 1) {
    await closeCards()
    const choices = page.locator('[data-life="choice"]:not([disabled]):not([aria-disabled="true"])')
    if ((await choices.count()) > pick) {
      const text = (await choices.nth(pick).textContent())?.trim()
      await choices.nth(pick).click({ timeout: 2000 }).catch(() => {})
      console.log(`chose   ${label}: ${text}`)
      await page.waitForTimeout(900)
      return true
    }
    const next = page.locator('[data-life="continue"]')
    if ((await next.count()) > 0) await next.first().click({ timeout: 1000 }).catch(() => {})
    await page.waitForTimeout(400)
  }
  console.log(`NO CHOICE ${label}`)
  return false
}

async function goTo(room) {
  await page.evaluate((to) => window.__life?.debug.goTo(to), room)
  await page.waitForTimeout(2200)
}

/** the ending card, then the stage finale, until `until` says the next room is up */
async function throughEnding(until) {
  for (let i = 0; i < 40; i += 1) {
    await closeCards()
    const next = page.locator('[data-life="continue"]')
    if ((await next.count()) > 0) await next.first().click({ timeout: 1000 }).catch(() => {})
    const endingButton = page.locator('[data-life="ending"] button')
    if ((await endingButton.count()) > 0) {
      console.log('ending  card up — closing')
      await endingButton.last().click({ timeout: 2000 }).catch(() => {})
      await page.waitForTimeout(800)
    }
    const finale = page.locator('[data-life="finale-continue"]')
    if ((await finale.count()) > 0) {
      console.log('finale  card up — continuing')
      await finale.first().click({ timeout: 2000 }).catch(() => {})
      await page.waitForTimeout(800)
    }
    const now = await hud()
    if (until(now)) return now
    await page.waitForTimeout(700)
  }
  return hud()
}

// B02 — the evening with the guys: the choice that opens the summer league (no call since 21.9)
let ok = await answer('b-kiosk', 2)
// Q01 — Amit's question, on the way out of 2000-bridge (`chapterCombos.ts`)
ok = (await answer('q-role')) && ok
const opened = await throughEnding((now) => now.date?.includes('קיץ 2000') && now.place?.startsWith('המגרש'))
console.log(`opened  ${opened.place} · ${opened.date}`)
await page.screenshot({ path: 'data/life-shots/team-2000-pitch.png' })

ok = (await answer('y-name')) && ok
await goTo('kiosk')
ok = (await answer('y-guest')) && ok
await goTo('pitch')
ok = (await answer('y-train')) && ok
// Y04 — the third choice: withdraw, with consent (no 3D pitch in this probe)
ok = (await answer('y-match', 2)) && ok
await goTo('street')
ok = (await answer('y-after')) && ok
let ended = false
for (let i = 0; i < 30; i += 1) {
  await closeCards()
  const next = page.locator('[data-life="continue"]')
  if ((await next.count()) > 0) await next.first().click({ timeout: 1000 }).catch(() => {})
  if ((await page.locator('[data-life="ending"]').count()) > 0) {
    ended = true
    break
  }
  await page.waitForTimeout(600)
}
const title = ended ? await page.locator('[data-life="ending"] h2').first().textContent() : null
await page.screenshot({ path: 'data/life-shots/team-2000-ending.png' })
await browser.close()

const problems = []
if (errors.length > 0) problems.push(`שגיאת עמוד: ${errors[0].slice(0, 140)}`)
if (!ok) problems.push('לא נמצאה בחירה')
// the pitch of the 2000s is "המגרש של השכונה" (`PITCH_2000`)
if (!opened.place?.startsWith('המגרש') || !opened.date?.includes('קיץ 2000')) problems.push(`החלון לא נפתח: "${opened.place}" · "${opened.date}"`)
if (!ended) problems.push('כרטיס הסיום לא עלה')
console.log(`ending  ${title?.trim() ?? '—'}`)
if (problems.length > 0) {
  console.log(`\nFAIL — ${problems.join(' · ')}`)
  process.exit(1)
}
console.log('\nPASS — הערב עם החבר׳ה ב-2000-bridge פותח את 2000-team, וחמש הסצנות נגמרות בסיום')
