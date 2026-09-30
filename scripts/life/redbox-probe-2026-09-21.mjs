/**
 * הקופסה האדומה בדפדפן — היא בחדר, היא נפתחת, ומה שבה מצויר (21.9.2026).
 *
 *   node scripts/life/redbox-probe-2026-09-21.mjs [http://127.0.0.1:3000]
 *
 * שמירה עם עשרה זיכרונות מעשרה פרקים, חדר השינה ב-2010 (הקופסה על המדף) וב-1990 (מתחת
 * למיטה), שיחת הקופסה, "לפתוח", ושלוש טענות: הקופסה נפתחת (`data-life="redbox"`), יש
 * בה חפץ לכל זיכרון, ונגיעה בחפץ מחזירה את המשפט שנכתב לו. צילומים ל-`data/life-shots`.
 */
import { mkdirSync, writeFileSync } from 'node:fs'

import { chromium } from 'playwright'

const BASE = process.argv[2] ?? 'http://127.0.0.1:3000'
const EXECUTABLE = process.env.PW_CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const OUT = 'data/life-shots'
const CARRIED = ['prologue:done', 'life:opening', 'life:knows:hall', 'onboard:moved', 'onboard:acted', 'onboard:street']
const MEMORIES = [
  ['1986-home', 'ticket-stub', 1986],
  ['1990-home', 'promotion-table', 1990],
  ['1993-cup-inside', 'ticket-stub', 1993],
  ['1998-laces-witness', 'newspaper', 1998],
  ['1999-cup-together', 'ticket-stub', 1999],
  ['2000-team-photo', 'folded-paper', 2000],
  ['2001-terrace-gear', 'folded-paper', 2001],
  ['2002-europe-alone', 'folded-paper', 2002],
  ['2009-up-active', 'folded-paper', 2009],
  ['2010-cup-late', 'folded-paper', 2010],
]

const STOPS = [
  ['2010-anthem', 2010, 'shelf', 'redbox-shelf'],
  ['1990', 1990, 'bed', 'redbox'],
]

mkdirSync(OUT, { recursive: true })
const browser = await chromium.launch({ executablePath: EXECUTABLE })
let faults = 0
for (const [W, H, tag] of [[1280, 820, ''], [390, 844, '-phone']]) {
  const page = await (await browser.newContext({ viewport: { width: W, height: H } })).newPage()
  await page.route('**://{pagead2.googlesyndication.com,www.googletagmanager.com,www.google.com,accounts.google.com}/**', (r) => r.abort())
  for (const [chapter, year, where, talk] of STOPS) {
    const errors = []
    const onError = (e) => errors.push(String(e))
    page.on('pageerror', onError)
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
    await page.evaluate(
      ([id, y, carried, memories]) => {
        const events = carried.map((flag) => ({ t: 'flag.raised', flag }))
        for (const [mid, item, my] of memories) if (my <= y) events.push({ t: 'memory.kept', memory: { id: mid, item, atMinute: 600, year: my, anchorId: null } })
        if (id !== '1986') events.push({ t: 'year.entered', year: y, weekday: 3, minute: 20 * 60 })
        events.push({ t: 'chapter.entered', chapter: id })
        events.push({ t: 'moved', to: 'bedroom' })
        window.localStorage.setItem('the-worker:life', JSON.stringify({ version: 4, identity: { name: 'פוגי', sex: 'boy', birthYear: 1978 }, year: y, events, savedAt: new Date().toISOString() }))
        window.localStorage.setItem('the-worker:life:probe', '1')
      },
      [chapter, year, CARRIED, MEMORIES],
    )
    await page.goto(`${BASE}/life`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('canvas', { timeout: 30000 }).catch(() => {})
    for (let i = 0; i < 6; i += 1) {
      for (const sel of ['[data-life="opening-skip"]', '[data-life="shirt-card"]', '[data-life="album-card"]', '[data-life="ticket-card"]', '[data-life="season-ticket"] button']) {
        const card = page.locator(sel)
        if ((await card.count()) > 0) await card.first().click({ timeout: 1500 }).catch(() => {})
      }
      await page.waitForTimeout(800)
    }
    await page.waitForTimeout(1500)
    writeFileSync(`${OUT}/redbox-${chapter}-room${tag}.png`, await page.screenshot())
    // the conversation, to its choice, and "open"
    await page.evaluate((id) => window.__life?.talk(id), talk)
    for (let i = 0; i < 4; i += 1) {
      await page.waitForTimeout(600)
      await page.evaluate(() => window.__life?.advance())
    }
    await page.evaluate(() => window.__life?.choose('open'))
    await page.waitForTimeout(2600)
    const open = await page.locator('[data-life="redbox"]').count()
    const things = await page.locator('[data-life="redbox-thing"]').count()
    writeFileSync(`${OUT}/redbox-${chapter}-open${tag}.png`, await page.screenshot())
    let note = null
    if (things > 0) {
      await page.locator('[data-life="redbox-thing"]').first().click()
      await page.waitForTimeout(700)
      note = await page.locator('[data-life="redbox-note"]').textContent().catch(() => null)
      writeFileSync(`${OUT}/redbox-${chapter}-note${tag}.png`, await page.screenshot())
    }
    const expected = MEMORIES.filter(([, , my]) => my <= year).length
    const problems = []
    if (errors.length) problems.push(`שגיאת עמוד: ${errors[0].slice(0, 100)}`)
    if (!open) problems.push('הקופסה לא נפתחה')
    if (things !== expected) problems.push(`${things} חפצים, ציפיתי ל-${expected}`)
    if (!note) problems.push('נגיעה בחפץ לא החזירה משפט')
    page.off('pageerror', onError)
    if (problems.length) faults += 1
    console.log(`${problems.length ? 'FAULT' : 'ok   '}  ${chapter.padEnd(12)} ${where}${tag}  ${problems.join(' · ') || `${things} חפצים · «${(note ?? '').slice(0, 40)}»`}`)
  }
}
await browser.close()
console.log(faults ? `\nFAIL — ${faults}` : '\nPASS — הקופסה בחדר, נפתחת, ומה שבה מדבר')
process.exit(faults ? 1 : 0)
