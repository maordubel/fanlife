/**
 * מעבר פרק בדפדפן — **לשחק פרק עד הסוף ולראות את הבא נפתח** (21.9.2026).
 *
 *   node scripts/life/transition-probe-2026-09-21.mjs [http://127.0.0.1:3000]
 *
 * `stage-c-probe` טוען כל פרק ישירות ובודק שהוא עולה. הוא לא יכול לראות את הדבר
 * שבין שני פרקים: הביטים יורים, בחירה נלחצת, הסיום נפלט, כרטיס הסיום נסגר, כרטיס
 * הגשר מתנגן, `year.entered` נכתב, וה-`entry` של הפרק הבא משלם. זה המסלול שכלל 56
 * מדבר עליו — *"זרעו את החדר הראשון של פרק וצאו ממנו, פעם אחת, לפני שקוראים לפרק
 * שמיש"* — והקובץ הזה עושה אותו בשלמותו על פרק אחד: `2026-plan` → `2026-finale`.
 *
 * **הבחירה הראשונה שאינה מושבתת נלחצת**, ולא בחירה מסוימת: המכשיר שואל אם אפשר
 * לעבור, לא איזה סיום יוצא. ההליכה בין חדרים היא `debug.goTo`, כי תנועה ב-2 FPS היא
 * מה ש-`life:play` כבר בודק, וזה לא מה שנבדק כאן.
 */
import { chromium } from 'playwright'

const BASE = process.argv[2] ?? 'http://127.0.0.1:3000'
const EXE = process.env.PW_CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const CARRIED = ['prologue:done', 'life:opening', 'life:knows:hall', 'onboard:moved', 'onboard:acted', 'onboard:street']
/**
 * מי שחיים אמיתיים ב-2025 כבר פגשו — כלל 81 בפעם השנייה באותו יום.
 *
 * הריצה הראשונה של המכשיר הזה נתקעה על **כרטיס היכרות** ("נכנס לחיים שלך") של עמית:
 * שמירה סינתטית שלא פגשה אף אחד מציגה את כל הקאסט כזרים, והכרטיס מכסה את תיבת
 * הדיאלוג. בחיים אמיתיים עמית נפגש ב-1986. אז השמירה נושאת את מי שחיים אמיתיים
 * נושאים — ולא לוחצת על הכרטיסים כדי להיפטר מהם, כי מכשיר שמתגבר על מה שהמשחק
 * מציג הוא מכשיר שמסתיר את מה שהמשחק מציג.
 */
// `own:met:<card id>` — the flag `castCards.ts` raises; `life:met:` is a different ledger
const MET = ['kobi', 'rachel', 'ofir', 'amit', 'efi', 'shopkeeper', 'usher', 'keren', 'teacher', 'barry', 'liron', 'freddy', 'crowd-limor', 'soko', 'yaron']

const browser = await chromium.launch({ executablePath: EXE })
const page = await (await browser.newContext({ viewport: { width: 1280, height: 820 } })).newPage()
await page.route('**://{pagead2.googlesyndication.com,www.googletagmanager.com,www.google.com,accounts.google.com}/**', (r) => r.abort())
const errors = []
page.on('pageerror', (error) => errors.push(String(error)))

console.log('step    seeding the save')
await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
await page.evaluate(([carried, met]) => {
  const events = carried.map((flag) => ({ t: 'flag.raised', flag }))
  for (const who of met) events.push({ t: 'flag.raised', flag: `own:met:${who}` })
  events.push(
    { t: 'year.entered', year: 2025, weekday: 3, minute: 19 * 60 + 15 },
    { t: 'chapter.entered', chapter: '2026-plan' },
    // enough for the modest shared trip — the choice the probe will take first
    { t: 'money.changed', agorot: 200_000, why: 'probe' },
    { t: 'moved', to: 'kiosk' },
  )
  localStorage.setItem('the-worker:life', JSON.stringify({ version: 4, identity: { name: 'פוגי', sex: 'boy', birthYear: 1978 }, year: 2025, events, savedAt: new Date().toISOString() }))
  localStorage.setItem('the-worker:life:probe', '1')
}, [CARRIED, MET])
console.log('step    opening /life')
await page.goto(`${BASE}/life`, { waitUntil: 'domcontentloaded' })
await page.waitForSelector('canvas', { timeout: 30000 }).catch(() => {})
console.log('step    canvas up')
for (const selector of ['[data-life="opening-skip"]', '[data-life="shirt-card"]', '[data-life="album-card"]', '[data-life="ticket-card"]']) {
  const card = page.locator(selector)
  if ((await card.count()) > 0) await card.first().click({ timeout: 2000 }).catch(() => {})
}

const hud = () =>
  page.evaluate(() => ({
    place: document.querySelector('[data-life="place"]')?.textContent?.trim() ?? null,
    date: document.querySelector('[data-life="date"]')?.textContent?.trim() ?? null,
  }))

/** walk a conversation to its choices and press the first one that is not greyed */
async function answer(label) {
  for (let i = 0; i < 60; i += 1) {
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

let ok = await answer('f-money')
await page.evaluate(() => window.__life?.debug.goTo('home'))
await page.waitForTimeout(2500)
ok = (await answer('f-plan')) && ok

// the ending card, then the stage finale, then the bridge
//
// **ומעל כרטיס הסיום יכול לעמוד כרטיס הישג** (`z-[60]`). הריצה הראשונה נתקעה עליו:
// "עוד בית" נפתח באותו רגע, וכל לחיצה על "הביתה" נחסמה. זה לא ממצא של שמירה
// סינתטית — זה מה ששחקן רואה — ולכן המכשיר סוגר אותו כמו ששחקן היה סוגר, וכותב
// את שמו.
for (let i = 0; i < 40; i += 1) {
  const achievement = page.locator('[data-life="achievement-card"]')
  if ((await achievement.count()) > 0) {
    const name = await achievement.first().getAttribute('aria-label')
    console.log(`achieve ${name} — closing`)
    await achievement.locator('button').last().click({ timeout: 2000 }).catch(() => {})
    await page.waitForTimeout(600)
    continue
  }
  const endingButton = page.locator('[data-life="ending"] button')
  if ((await endingButton.count()) > 0) {
    console.log('ending  card up — closing')
    await endingButton.last().click({ timeout: 2000 }).catch((error) => console.log(`        ${String(error).split('\n').slice(0, 14).join(' | ').slice(0, 1400)}`))
    await page.waitForTimeout(800)
  }
  const finale = page.locator('[data-life="finale-continue"]')
  if ((await finale.count()) > 0) {
    console.log('finale  card up — continuing')
    await finale.first().click({ timeout: 2000 }).catch(() => {})
    await page.waitForTimeout(800)
  }
  const now = await hud()
  if (now.date?.includes('2026') && now.place && now.place !== 'הסלון' && now.place !== 'הקיוסק') break
  await page.waitForTimeout(700)
}

const after = await hud()
await page.screenshot({ path: 'data/life-shots/transition-2026.png' })
await browser.close()

const problems = []
if (errors.length > 0) problems.push(`שגיאת עמוד: ${errors[0].slice(0, 140)}`)
if (!ok) problems.push('לא נמצאה בחירה אחת לפחות')
if (after.place !== 'התחנה המרכזית — רציף') problems.push(`החדר אחרי המעבר "${after.place}" ולא הרציף`)
if (!after.date?.includes('2026')) problems.push(`התאריך אחרי המעבר "${after.date}"`)
console.log(`after   ${after.place} · ${after.date}`)
if (problems.length > 0) {
  console.log(`\nFAIL — ${problems.join(' · ')}`)
  process.exit(1)
}
console.log('\nPASS — פרק שוחק עד הסוף, והבא נפתח בחדר ובשנה שלו')
