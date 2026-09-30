/**
 * שלב ג׳ בדפדפן — **כל פרק חדש נטען, מצויר, ואומר איפה הוא** (21.9.2026).
 *
 *   node scripts/life/stage-c-probe-2026-09-21.mjs [http://127.0.0.1:3000]
 *
 * עשרים ושישה פרקים נכתבו היום, וכל המכשירים עוברים עליהם: `life:worldlines` סוגר אותם,
 * `life:orphans` מוצא לכל שיחה פותח, `life:budget` מוכיח שכל סף בר-השגה. **אף אחד מהם
 * לא פתח דפדפן.** זו בדיוק ההבחנה של כלל 33 — *"שחקו את כל הדבר, לא מסך אחד ממנו"* —
 * ושל כלל 56: *"זרעו את החדר הראשון של פרק וצאו ממנו, פעם אחת, לפני שקוראים לפרק שמיש."*
 *
 * `life:play` מסייר רק בחדרי 1986, ולכן זה קובץ נפרד ולא עוד שורה בסיור שלו: השאלה
 * כאן אחרת — לא "האם החדר נראה נכון" אלא **"האם הפרק בכלל עולה"**. שמירה שכותבת
 * `chapter.entered` לפרק חדש, טעינה מחדש, ושלוש טענות:
 *
 * 1. **אין שגיאת עמוד.** פרק שמפיל את הריצה נראה בקוד תקין לגמרי.
 * 2. **ה-HUD אומר את החדר שהפרק מתחיל בו.** אם השמירה נדחתה, הפרק נפתח בחדר השינה של
 *    1986 — ואז הצילום נראה מצוין ומשקר (כלל 48, על `version: 1`).
 * 3. **ה-HUD אומר את השנה של הפרק**, ולא 1986 — כי `dateHe` ו-`hudDateHe` הם מה
 *    שהשחקן קורא ראשון.
 * 4. **והשעון אומר את היום ואת השעה של הפרק** — נוסף 21.9.2026, אחרי שהצילום
 *    הראשון של `2010-qualify` הראה *"שבת • 12:35"* מעל כיתוב *"קיץ 2010"*.
 *
 * **הסעיף הרביעי הוא תיקון של המכשיר, לא של המשחק, וזה השיעור.** שלוש הטענות
 * הראשונות עברו על תשעה פרקים בזמן שהשמירה הסינתטית כתבה `chapter.entered` בלבד —
 * והמעבר האמיתי (`WorldScene.toNextChapter`) כותב **`year.entered` לפניו**, עם השנה,
 * היום והדקה של הפרק. כלומר המנוע חשב שזאת שבת של 1986 בכל תשע התחנות, וה-HUD הראה
 * "2010" רק מפני שהוא קורא `hudDateHe` מרישום הפרקים ולא מהמצב. מכשיר שמדמה חצי
 * מעבר מדווח על המודל של עצמו (כלל 75), ובדיקה שמסתמכת על מחרוזת מהרישום אינה
 * בלתי-תלויה במה שהיא בודקת (כלל 77). השמירה כותבת עכשיו את שני האירועים, בסדר
 * שהמשחק כותב אותם, והיום והשעה נכתבים ביד ב-`STOPS` — מאותה סיבה שהכותרות נכתבות
 * ביד: מי שישנה אותם ברישום צריך שהמסלול יראה את זה.
 *
 * צהוב **לא** נסרק כאן בכוונה: הרקעים של הפרקים האלה הם רקעים קיימים שהסיור של
 * `life:play` כבר סורק, והגדרה שלישית של צהוב בקובץ שלישי היא בדיוק מה שכלל 44 אוסר.
 */
import { mkdirSync, writeFileSync } from 'node:fs'

import { chromium } from 'playwright'

const BASE = process.argv[2] ?? 'http://127.0.0.1:3000'
const EXECUTABLE = process.env.PW_CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const OUT = 'data/life-shots'

/**
 * [פרק, החדר שבו הוא מתחיל, מה ה-HUD אמור לומר, השנה שה-HUD אמור להכיל]
 *
 * הכותרות נכתבות כאן ביד ולא נקראות מ-`scenes.ts`, כי הבדיקה צריכה להיות **בלתי-תלויה**
 * במה שהיא בודקת (כלל 77): אם מישהו ישנה שם של חדר, זה בדיוק מה שהמסלול צריך לראות.
 */
const STOPS = [
  ['2000-bridge', 'home', 'הסלון', '2000', 2000, 3, 22 * 60 + 40, 'רביעי', '22:40'],
  ['2002-europe', 'home', 'הסלון', '2002', 2002, 4, 18 * 60, 'חמישי', '18:00'],
  ['2006-home', 'ussishkin-hall', 'אולם אוסישקין', '2004', 2006, 1, 19 * 60 + 30, 'שני', '19:30'],
  ['2007-table', 'kiosk', 'הקיוסק', '2007', 2007, 2, 17 * 60 + 30, 'שלישי', '17:30'],
  ['2007-registered', 'allenby', 'אלנבי', '2007', 2007, 1, 16 * 60, 'שני', '16:00'],
  ['2007-key', 'ussishkin-hall', 'אולם אוסישקין', '2007', 2007, 0, 20 * 60, 'ראשון', '20:00'],
  ['2009-up', 'home', 'הסלון', '2009', 2009, 6, 21 * 60, 'שבת', '21:00'],
  ['2010-qualify', 'kiosk', 'הקיוסק', '2010', 2010, 3, 17 * 60 + 40, 'רביעי', '17:40'],
  ['2010-anthem', 'home', 'הסלון', '2010', 2010, 3, 20 * 60 + 10, 'רביעי', '20:10'],
  ['2012-cups', 'home', 'הסלון', '2012', 2012, 2, 18 * 60 + 20, 'שלישי', '18:20'],
  ['2012-five', 'allenby', 'אלנבי', '2012', 2012, 4, 19 * 60, 'חמישי', '19:00'],
  ['2015-newhall', 'street', 'הרחוב', '2015', 2015, 5, 16 * 60 + 45, 'שישי', '16:45'],
  ['2016-crisis', 'kiosk', 'הקיוסק', '2016', 2016, 1, 17 * 60 + 15, 'שני', '17:15'],
  ['2017-after', 'kiosk', 'הקיוסק', '2017', 2017, 0, 18 * 60 + 40, 'ראשון', '18:40'],
  ['2018-return', 'kiosk', 'הקיוסק', '2018', 2018, 4, 18 * 60, 'חמישי', '18:00'],
  ['2021-losses', 'home', 'הסלון', '2021', 2021, 2, 20 * 60 + 30, 'שלישי', '20:30'],
  ['2023-tournament', 'pitch', 'המגרש', '2023', 2023, 0, 17 * 60 + 50, 'ראשון', '17:50'],
  ['2023-quiet', 'home', 'הסלון', '2023', 2023, 1, 21 * 60, 'שני', '21:00'],
  ['2025-eurocup', 'home', 'הסלון', '2025', 2025, 5, 21 * 60 + 20, 'שישי', '21:20'],
  ['2026-plan', 'kiosk', 'הקיוסק', '2026', 2025, 3, 19 * 60 + 15, 'רביעי', '19:15'],
  ['2026-finale', 'bus-station', 'התחנה המרכזית — רציף', '2026', 2026, 4, 6 * 60 + 40, 'חמישי', '06:40'],
  ['2011-people', 'allenby', 'אלנבי', '2011', 2011, 4, 19 * 60 + 30, 'חמישי', '19:30'],
  ['2013-household', 'kitchen', 'המטבח', '2013', 2013, 0, 20 * 60, 'ראשון', '20:00'],
  ['2021-promises', 'home', 'הסלון', '2021', 2021, 5, 17 * 60, 'שישי', '17:00'],
  ['2017-distance', 'kiosk', 'הקיוסק', '2017', 2017, 2, 18 * 60 + 30, 'שלישי', '18:30'],
  ['2019-armchair', 'home', 'הסלון', '2019', 2019, 6, 16 * 60 + 30, 'שבת', '16:30'],
]

/** מה שכל פרק בוגר יורש — כדי שהמסלול יבדוק את הפרק ולא את החיים שלפניו */
const CARRIED = ['prologue:done', 'life:opening', 'life:knows:hall', 'onboard:moved', 'onboard:acted', 'onboard:street']

mkdirSync(OUT, { recursive: true })
const browser = await chromium.launch({ executablePath: EXECUTABLE })
const context = await browser.newContext({ viewport: { width: 1280, height: 820 } })
const page = await context.newPage()
await page.route('**://{pagead2.googlesyndication.com,www.googletagmanager.com,www.google.com,accounts.google.com}/**', (r) => r.abort())

let faults = 0
const report = []

for (const [chapter, room, titleHe, year, chapterYear, weekday, minute, dayHe, timeHe] of STOPS) {
  const errors = []
  const onError = (error) => errors.push(String(error))
  page.on('pageerror', onError)

  // חונים בדף בלי משחק לפני הכתיבה — אותו שיעור של הסיור: משחק רץ שומר את עצמו
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
  await page.evaluate(
    ([id, where, carried, y, wd, min]) => {
      const events = carried.map((flag) => ({ t: 'flag.raised', flag }))
      // בדיוק בסדר של `WorldScene.toNextChapter`: קודם השנה, ואז הפרק
      events.push({ t: 'year.entered', year: y, weekday: wd, minute: min })
      events.push({ t: 'chapter.entered', chapter: id })
      events.push({ t: 'moved', to: where })
      window.localStorage.setItem(
        'the-worker:life',
        JSON.stringify({ version: 4, identity: { name: 'פוגי', sex: 'boy', birthYear: 1978 }, year: y, events, savedAt: new Date().toISOString() }),
      )
      window.localStorage.setItem('the-worker:life:probe', '1')
    },
    [chapter, room, CARRIED, chapterYear, weekday, minute],
  )
  await page.goto(`${BASE}/life`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('canvas', { timeout: 30000 }).catch(() => {})

  const skip = page.locator('[data-life="opening-skip"]')
  if ((await skip.count()) > 0) await skip.click().catch(() => {})
  for (const selector of ['[data-life="shirt-card"]', '[data-life="album-card"]', '[data-life="ticket-card"]']) {
    const card = page.locator(selector)
    if ((await card.count()) > 0) await card.first().click({ timeout: 2000 }).catch(() => {})
  }

  let place = null
  let date = null
  let clock = null
  for (let i = 0; i < 40; i += 1) {
    ;[place, date, clock] = await page.evaluate(() => [
      document.querySelector('[data-life="place"]')?.textContent?.trim() ?? null,
      document.querySelector('[data-life="date"]')?.textContent?.trim() ?? null,
      document.querySelector('[data-life="clock"]')?.textContent?.trim() ?? null,
    ])
    if (place && (!titleHe || place === titleHe) && date?.includes(year) && clock?.includes(timeHe)) break
    await page.waitForTimeout(500)
  }
  writeFileSync(`${OUT}/stage-c-${chapter}.png`, await page.screenshot())
  page.off('pageerror', onError)

  const problems = []
  if (errors.length > 0) problems.push(`שגיאת עמוד: ${errors[0].slice(0, 120)}`)
  if (!place) problems.push('אין HUD — הפרק לא עלה')
  else if (titleHe && place !== titleHe) problems.push(`החדר "${place}" ולא "${titleHe}"`)
  if (!date?.includes(year)) problems.push(`התאריך "${date ?? '—'}" ולא ${year}`)
  if (!clock?.includes(timeHe)) problems.push(`השעון "${clock ?? '—'}" ולא ${timeHe}`)
  else if (!clock?.includes(dayHe)) problems.push(`היום "${clock}" ולא ${dayHe}`)

  if (problems.length > 0) {
    faults += 1
    report.push(`FAULT  ${chapter.padEnd(17)} ${problems.join(' · ')}`)
  } else {
    report.push(`ok     ${chapter.padEnd(17)} ${place} · ${date}`)
  }
}

await browser.close()
console.log(report.join('\n'))
console.log(faults === 0 ? `\nPASS — ${STOPS.length} פרקים של שלב ג׳ נטענים בדפדפן, בחדר ובשנה שלהם` : `\nFAIL — ${faults} מתוך ${STOPS.length}`)
process.exit(faults === 0 ? 0 : 1)
