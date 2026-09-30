/**
 * חלונות בדפדפן — כל חלון נטען בחדר, בשנה ובשעון שלו, השיחה שלו נפתחת, וכרטיס הסיום
 * עולה (21.9.2026).
 *
 *   node scripts/life/window-probe-2026-09-21.mjs [http://127.0.0.1:3000] [chapter-id…]
 *
 * חלון הוא פרק שקיים רק בחיים שהרוויחו אותו, ולכן `stage-c-probe` (שעובר על הציר) לא
 * רואה אותו. כאן כל שמירה נושאת את מה שחיים כאלה באמת נושאים: הדגל שפתח את החלון
 * (`when`), ומה שהסצנה עצמה קוראת (למשל `life:desk:unverified` לפני תיקון). השמירה
 * כותבת `year.entered` ואז `chapter.entered` — בסדר שהמשחק כותב (כלל 81).
 */
import { chromium } from 'playwright'

const BASE = process.argv[2]?.startsWith('http') ? process.argv[2] : 'http://127.0.0.1:3000'
const ONLY = process.argv.slice(2).filter((arg) => !arg.startsWith('http'))
const EXE = process.env.PW_CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const CARRIED = ['prologue:done', 'life:opening', 'life:knows:hall', 'onboard:moved', 'onboard:acted', 'onboard:street']
const MET = ['kobi', 'rachel', 'ofir', 'amit', 'efi', 'shopkeeper', 'usher', 'keren', 'teacher', 'barry', 'liron', 'freddy', 'crowd-limor', 'soko', 'yaron', 'asaf', 'metuki', 'roma', 'yevgeny', 'melamed', 'crowd-shani', 'crowd-erez']
const KNOWN = ['kiosk', 'pitch', 'school', 'route', 'allenby', 'bloomfield', 'ussishkin', 'bus-station']

/** [chapter, year, weekday, minute, room, room title, date on the HUD, flags the life carries] */
const STOPS = [
  ['2001-terrace', 2001, 6, 16 * 60, 'gate5', 'שער 5', '2001', ['own:route:ULTRAS:entry']],
  ['2002-desk', 2002, 2, 19 * 60, 'allenby', 'אלנבי', '2002', ['own:route:JOURNALIST:entry']],
  ['2006-desk', 2006, 0, 21 * 60, 'home', 'הסלון', '2006', ['life:desk', 'life:desk:unverified']],
  ['2012-terrace', 2012, 6, 17 * 60, 'gate5', 'שער 5', '2012', ['own:route:ULTRAS:entry', 'life:terrace:role']],
  ['2024-terrace', 2024, 6, 18 * 60, 'bloomfield-outside', 'בלומפילד — מבחוץ', '2024', ['own:route:ULTRAS:entry', 'own:route:ULTRAS:practice']],
  ['2025-interview', 2025, 3, 11 * 60, 'allenby', 'אלנבי', '2025', ['own:route:JOURNALIST:entry', 'own:route:JOURNALIST:practice', 'own:route:JOURNALIST:apex']],
  // a window of three scenes in three rooms: the probe walks the rest (`ROUTE`)
  ['2010-friends', 2010, 4, 19 * 60 + 30, 'allenby', 'אלנבי', 'סתיו 2010', ['life:international']],
  ['2024-lina', 2024, 1, 21 * 60, 'home', 'הסלון', '2024', ['life:international', 'life:intl:met']],
  ['2021-suitcase', 2021, 4, 20 * 60, 'home', 'הסלון', 'קיץ 2021', ['life:distance']],
  ['2023-visit', 2023, 5, 12 * 60, 'kiosk', 'הקיוסק', '2023', ['life:abroad']],
  // the whole deal: a partner at the top of the route, so every gate is open
  ['2025-owner', 2025, 2, 18 * 60 + 30, 'allenby', 'אלנבי', 'קיץ 2025', ['own:route:OWNER:entry', 'own:route:OWNER:practice', 'own:route:OWNER:apex']],
].filter(([id]) => ONLY.length === 0 || ONLY.includes(id))

/** the rooms after the first, for a window whose scenes are in more than one */
const ROUTE = {
  '2010-friends': ['street', 'pitch'],
  '2025-owner': ['kitchen', 'home', 'ticket-office'],
}

const browser = await chromium.launch({ executablePath: EXE })
const problems = []
for (const [chapter, year, weekday, minute, room, place, date, flags] of STOPS) {
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 820 } })).newPage()
  await page.route('**://{pagead2.googlesyndication.com,www.googletagmanager.com,www.google.com,accounts.google.com}/**', (r) => r.abort())
  const errors = []
  page.on('pageerror', (error) => errors.push(String(error)))
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
  await page.evaluate(([carried, met, known, year, weekday, minute, chapter, flags, room]) => {
    const events = carried.map((flag) => ({ t: 'flag.raised', flag }))
    for (const who of met) events.push({ t: 'flag.raised', flag: `own:met:${who}` })
    for (const place of known) events.push({ t: 'flag.raised', flag: `life:reveal:${place}` })
    for (const flag of flags) events.push(flag === 'life:terrace:role' ? { t: 'flag.set', flag, value: 'active' } : { t: 'flag.raised', flag })
    events.push({ t: 'year.entered', year, weekday, minute }, { t: 'chapter.entered', chapter }, { t: 'moved', to: room })
    localStorage.setItem('the-worker:life', JSON.stringify({ version: 4, identity: { name: 'פוגי', sex: 'boy', birthYear: 1978 }, year, events, savedAt: new Date().toISOString() }))
    localStorage.setItem('the-worker:life:probe', '1')
  }, [CARRIED, MET, KNOWN, year, weekday, minute, chapter, flags, room])
  await page.goto(`${BASE}/life`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('canvas', { timeout: 30000 }).catch(() => {})

  let hud = { place: null, date: null }
  let first = null
  let line = null
  let ending = null
  let idle = 0
  const route = [...(ROUTE[chapter] ?? [])]
  for (let i = 0; i < 160 && !ending; i += 1) {
    for (const selector of ['[data-life="opening-skip"]', '[data-life="shirt-card"]']) {
      const card = page.locator(selector)
      if ((await card.count()) > 0) await card.first().click({ timeout: 1500 }).catch(() => {})
    }
    const achievement = page.locator('[data-life="achievement-card"]')
    if ((await achievement.count()) > 0) await achievement.locator('button').last().click({ timeout: 1500 }).catch(() => {})
    hud = await page.evaluate(() => ({
      place: document.querySelector('[data-life="place"]')?.textContent?.trim() ?? null,
      date: document.querySelector('[data-life="date"]')?.textContent?.trim() ?? null,
    }))
    // `textContent()` on a locator that matches nothing waits thirty seconds — count first
    if (!line && (await page.locator('[data-life="line"]').count()) > 0) {
      line = await page.locator('[data-life="line"]').first().textContent({ timeout: 1000 }).catch(() => null)
    }
    const choices = page.locator('[data-life="choice"]:not([disabled]):not([aria-disabled="true"])')
    const next = page.locator('[data-life="continue"]')
    const busy = (await choices.count()) > 0 || (await next.count()) > 0
    if ((await choices.count()) > 0) await choices.first().click({ timeout: 1500 }).catch(() => {})
    if ((await next.count()) > 0) await next.first().click({ timeout: 1000 }).catch(() => {})
    first = first ?? (hud.place ? { ...hud } : null)
    // a room that has not drawn yet is not idle — only a room that is up and quiet is
    idle = busy || !hud.place ? 0 : idle + 1
    if (idle >= 14 && route.length > 0) {
      await page.evaluate((to) => window.__life?.debug.goTo(to), route.shift())
      idle = 0
      await page.waitForTimeout(1800)
    }
    if ((await page.locator('[data-life="ending"]').count()) > 0) ending = await page.locator('[data-life="ending"] h2').first().textContent({ timeout: 1000 }).catch(() => '?')
    await page.waitForTimeout(450)
  }
  await page.screenshot({ path: `data/life-shots/window-${chapter}.png` })
  await page.context().close()
  const bad = []
  if (errors.length > 0) bad.push(`שגיאה: ${errors[0].slice(0, 100)}`)
  if (first?.place !== place) bad.push(`חדר "${first?.place}" ולא "${place}"`)
  if (!first?.date?.includes(date)) bad.push(`תאריך "${first?.date}"`)
  if (!line) bad.push('אף שורה לא נאמרה')
  if (!ending) bad.push('אין סיום')
  console.log(`${bad.length ? 'FAIL' : 'ok  '}  ${chapter.padEnd(16)} ${first?.place} · ${first?.date} · «${line?.trim().slice(0, 30) ?? '—'}» → ${ending?.trim() ?? '—'}${bad.length ? `  ← ${bad.join(' · ')}` : ''}`)
  if (bad.length) problems.push(chapter)
}
await browser.close()
if (problems.length > 0) {
  console.log(`\nFAIL — ${problems.length}/${STOPS.length}: ${problems.join(', ')}`)
  process.exit(1)
}
console.log(`\nPASS — ${STOPS.length}/${STOPS.length} חלונות: חדר, שנה, שיחה וסיום`)
