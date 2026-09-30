/**
 * בלומפילד לפי הלוח שלו, בדפדפן (21.9.2026).
 *
 *   node scripts/life/bloomfield-probe-2026-09-21.mjs [http://127.0.0.1:3000]
 *
 * `tests/life-bloomfield.test.ts` בודק את הלוח בנתונים. זה בודק את מה ששחקן רואה:
 * `2018-return` מתחיל בקיוסק ב-2018, `R01` נענית, הפרק קופץ לסתיו 2019 בעצמו, השחקן
 * עומד על הרחבה של הבניין החדש, `R02` נפתחת שם, והפרק נגמר. שתי תמונות נשמרות —
 * הרחבה לפני השיחה (הגודל של אדם על הרצפה הנמדדת) ואחרי הסיום.
 */
import { chromium } from 'playwright'

const BASE = process.argv[2] ?? 'http://127.0.0.1:3000'
const EXE = process.env.PW_CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const CARRIED = ['prologue:done', 'life:opening', 'life:knows:hall', 'onboard:moved', 'onboard:acted', 'onboard:street']
// `own:met:<card id>` — see transition-probe: a real life met these people decades ago
const MET = ['kobi', 'rachel', 'ofir', 'amit', 'efi', 'shopkeeper', 'usher', 'keren', 'teacher', 'barry', 'liron', 'freddy', 'crowd-limor', 'soko', 'yaron', 'asaf']
/**
 * ...ומה שחיים אמיתיים כבר מצאו על המפה (`life:reveal:<מקום>`). הריצה השנייה נעצרה על
 * *"נחשף על המפה — בלומפילד. ראית את עמודי התאורה מעל הגגות"*: שמירה שלא הלכה אף פעם
 * לבלומפילד מגלה אותו ב-2019, בגיל ארבעים. בחיים אמיתיים הוא נחשף ב-1986 (כלל 81).
 */
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
  events.push({ t: 'year.entered', year: 2018, weekday: 4, minute: 18 * 60 }, { t: 'chapter.entered', chapter: '2018-return' }, { t: 'moved', to: 'kiosk' })
  localStorage.setItem('the-worker:life', JSON.stringify({ version: 4, identity: { name: 'פוגי', sex: 'boy', birthYear: 1978 }, year: 2018, events, savedAt: new Date().toISOString() }))
  localStorage.setItem('the-worker:life:probe', '1')
}, [CARRIED, MET, KNOWN])
await page.goto(`${BASE}/life`, { waitUntil: 'domcontentloaded' })
await page.waitForSelector('canvas', { timeout: 30000 }).catch(() => {})
for (const selector of ['[data-life="opening-skip"]', '[data-life="shirt-card"]', '[data-life="album-card"]', '[data-life="ticket-card"]']) {
  const card = page.locator(selector)
  if ((await card.count()) > 0) await card.first().click({ timeout: 2000 }).catch(() => {})
}

const hud = () =>
  page.evaluate(() => ({
    place: document.querySelector('[data-life="place"]')?.textContent?.trim() ?? null,
    date: document.querySelector('[data-life="date"]')?.textContent?.trim() ?? null,
  }))

/**
 * הכרטיסים ששחקן סוגר בנגיעה — חולצה חדשה בחנות, כרטיס הישג. הריצה הראשונה נתקעה
 * על חולצת 2018/19: כרטיס אמיתי שכל שחקן רואה בפרק הזה, ולכן המכשיר סוגר אותו כמו
 * ששחקן היה סוגר, ואומר את זה.
 */
async function closeCards() {
  const shirt = page.locator('[data-life="shirt-card"]')
  if ((await shirt.count()) > 0) {
    console.log('card    shirt — closing')
    await shirt.first().click({ timeout: 2000 }).catch(() => {})
    await page.waitForTimeout(500)
  }
  const achievement = page.locator('[data-life="achievement-card"]')
  if ((await achievement.count()) > 0) {
    console.log(`card    ${await achievement.first().getAttribute('aria-label')} — closing`)
    await achievement.locator('button').last().click({ timeout: 2000 }).catch(() => {})
    await page.waitForTimeout(500)
  }
}

async function answer(label) {
  for (let i = 0; i < 80; i += 1) {
    await closeCards()
    const choices = page.locator('[data-life="choice"]:not([disabled]):not([aria-disabled="true"])')
    if ((await choices.count()) > 0) {
      const text = (await choices.first().textContent())?.trim()
      await choices.first().click({ timeout: 2000 }).catch(() => {})
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

for (let i = 0; i < 30; i += 1) {
  await closeCards()
  if ((await hud()).place) break
  await page.waitForTimeout(500)
}
const start = await hud()
console.log(`start   ${start.place} · ${start.date}`)
let ok = await answer('r-back')

// the jump: a card, one narrated line, and the trip to the ground — nobody walks there
let there = null
for (let i = 0; i < 60; i += 1) {
  await closeCards()
  const next = page.locator('[data-life="continue"]')
  if ((await next.count()) > 0) await next.first().click({ timeout: 1000 }).catch(() => {})
  const now = await hud()
  if (now.place === 'בלומפילד — מבחוץ') {
    there = now
    break
  }
  await page.waitForTimeout(500)
}
console.log(`jumped  ${there?.place ?? '—'} · ${there?.date ?? '—'}`)
// the first sight plays, then the room — photograph the floor before anyone speaks
await page.waitForTimeout(5200)
await page.screenshot({ path: 'data/life-shots/bloomfield-2019-plaza.png' })
ok = (await answer('r-signs')) && ok
for (let i = 0; i < 20; i += 1) {
  await closeCards()
  if ((await page.locator('[data-life="ending"]').count()) > 0) break
  await page.waitForTimeout(600)
}
const ended = (await page.locator('[data-life="ending"]').count()) > 0
await page.screenshot({ path: 'data/life-shots/bloomfield-2019-ending.png' })
const art = await page.evaluate(() => window.__life?.debug?.state?.()?.chapter ?? null).catch(() => null)
await browser.close()

const problems = []
if (errors.length > 0) problems.push(`שגיאת עמוד: ${errors[0].slice(0, 140)}`)
if (!ok) problems.push('לא נמצאה בחירה')
if (!start.date?.includes('2018')) problems.push(`הפרק נפתח ב-"${start.date}" ולא ב-2018`)
if (!there) problems.push('לא הגיע לבלומפילד אחרי הקפיצה')
if (there && !there.date?.includes('2019')) problems.push(`התאריך אחרי הקפיצה "${there.date}"`)
if (!ended) problems.push('כרטיס הסיום לא עלה')
console.log(`chapter ${art ?? '?'}`)
if (problems.length > 0) {
  console.log(`\nFAIL — ${problems.join(' · ')}`)
  process.exit(1)
}
console.log('\nPASS — 2018 בקיוסק, קפיצה לסתיו 2019, הרחבה של בלומפילד המחודש, וסיום')
