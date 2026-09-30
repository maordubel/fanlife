// pass D (28.9.2026) — plays the adult chapters this pass rebuilt, in a browser, at a phone's size
// (rule 33: the whole thing, not one screen). Each scene is a seeded save (year.entered +
// chapter.entered, the order the game writes them — rule 81), the chapter's own beats, and the
// world's own hotspots opened by their conversation id (`__life.talk`) after checking that the
// room actually offers them (`debug.targets`). Screenshots land in data/life-shots/pass-d-*.
//
//   node scripts/life/pass-d-probe.mjs [http://127.0.0.1:3214]   (W/H env for size; ONLY=owner,finale,…)
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = process.argv[2] ?? 'http://127.0.0.1:3214'
const W = Number(process.env.W ?? 390), H = Number(process.env.H ?? 844)
const ONLY = (process.env.ONLY ?? '').split(',').filter(Boolean)
const OUT = 'data/life-shots'
mkdirSync(OUT, { recursive: true })
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--disable-gpu'] })
const context = await browser.newContext({ viewport: { width: W, height: H }, hasTouch: W < 800, isMobile: W < 800 })
let faults = 0
const fault = (m) => { faults++; console.log('FAULT', m) }
const base = [{ t: 'flag.raised', flag: 'life:opening' }, { t: 'flag.raised', flag: 'prologue:done' }, { t: 'chapter.entered', chapter: '1986' }, { t: 'flag.raised', flag: 'onboard:moved' }, { t: 'flag.raised', flag: 'onboard:acted' }, { t: 'flag.raised', flag: 'onboard:street' }]
const has = (page, sel) => page.evaluate((s) => !!document.querySelector(s), sel)
const q = (page, sel) => page.evaluate((s) => document.querySelector(s)?.textContent?.replace(/\s+/g, ' ').trim() ?? null, sel)
const flags = (page) => page.evaluate(() => window.__life.snapshot().state.flags)
const targets = (page) => page.evaluate(() => window.__life.debug.targets().map((t) => t.id))
let heard = []

/** read lines, press continue, and pick the choice whose text matches `pick` (or the first enabled) */
async function play(page, pick = [], rounds = 40) {
  for (let i = 0; i < rounds; i++) {
    if (await has(page, '[data-life="ending"]')) return 'ending'
    let choices = await page.$$('[data-life="choice"]')
    if (choices.length) {
      // P0: a ballot arms after the revealing gesture is released (lib/life/inputArm.ts)
      await page.waitForSelector('[data-life="choices"][data-armed="true"]', { timeout: 5000 }).catch(() => {})
      choices = await page.$$('[data-life="choice"]')
      if (!choices.length) continue
      const texts = await Promise.all(choices.map((c) => c.textContent()))
      const disabled = await Promise.all(choices.map((c) => c.getAttribute('aria-disabled')))
      let idx = texts.findIndex((t, k) => disabled[k] !== 'true' && pick.some((p) => (t ?? '').includes(p)))
      if (idx < 0) idx = texts.findIndex((_, k) => disabled[k] !== 'true')
      heard.push(`» ${texts[Math.max(0, idx)]?.trim()}`)
      await choices[Math.max(0, idx)].click({ force: true })
      await page.waitForTimeout(500)
      if (pick.length) return 'picked'
      continue
    }
    if (await has(page, '[data-life="dialogue"]')) {
      const line = await q(page, '[data-life="line"]')
      if (line && heard.at(-1) !== line) heard.push(line)
      await page.evaluate(() => window.__life.advance())
      await page.waitForTimeout(300)
      continue
    }
    if (i > 3) return 'idle'
    await page.waitForTimeout(700)
  }
  return 'rounds'
}

/** a hotspot the room offers, opened by its conversation — fails loudly if the room does not offer it */
async function press(page, spot, act, pick) {
  const offered = await targets(page)
  if (!offered.some((id) => id === spot || id === act)) fault(`${spot}: not offered here (${offered.join(', ')})`)
  await page.evaluate((id) => window.__life.talk(id), act)
  await page.waitForTimeout(600)
  return play(page, pick)
}

async function run(name, events, fn) {
  if (ONLY.length && !ONLY.some((o) => name.startsWith(o))) return
  heard = []
  const page = await context.newPage()
  page.on('pageerror', (e) => fault(`${name} pageerror ${e.message}`))
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
  await page.evaluate((ev) => {
    localStorage.setItem('the-worker:life', JSON.stringify({ version: 4, identity: { name: 'פוגי', sex: 'boy', birthYear: 1978 }, year: 1986, events: ev, savedAt: new Date().toISOString() }))
    localStorage.setItem('the-worker:life:probe', '1')
  }, [...base, ...events])
  await page.goto(`${BASE}/life`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('canvas', { timeout: 120000 })
  await page.waitForTimeout(4000)
  try {
    await fn(page)
  } catch (e) {
    fault(`${name}: ${e.message}`)
  }
  console.log(`--- ${name}\n${heard.slice(0, 60).join('\n')}`)
  await page.close()
}

const enter = (year, weekday, minute, chapter, to, extra = []) => [
  { t: 'year.entered', year, weekday, minute }, { t: 'chapter.entered', chapter }, { t: 'flag.raised', flag: `own:shopnews:${chapter}` }, ...extra, { t: 'moved', to },
]
const set = (flag, value) => ({ t: 'flag.set', flag, value })

await run('owner — the triangle', enter(2025, 2, 18 * 60 + 30, '2025-owner', 'office', [set('own:route:OWNER:practice', true), set('own:route:OWNER:apex', true)]), async (page) => {
  await play(page, ['לאשר את הענף'])
  await play(page)
  await page.screenshot({ path: `${OUT}/pass-d-${W}-owner-1-room.png` })
  const offered = await targets(page)
  console.log('owner offers:', offered.join(', '))
  await press(page, 'o-spot-money', 'o-tri-money', ['מימון מחויב'])
  await play(page)
  await press(page, 'o-spot-squad', 'o-tri-squad', ['להתחייב'])
  await page.waitForTimeout(2500)
  await play(page, ['לאשר למוכר'])
  await page.screenshot({ path: `${OUT}/pass-d-${W}-owner-2-verdict.png` })
  await page.waitForTimeout(2500)
  await play(page, ['להגדיר סמכויות'])
  const f = await flags(page)
  if (f['life:owner:triangle'] !== 'money_squad') fault(`owner: triangle ${f['life:owner:triangle']}`)
  if (!f['o:teamGo']) fault('owner: the meeting did not agree')
  if (!heard.some((l) => l.includes('ביבגני אף אחד לא נגע'))) fault('owner: Yevgeny never answered the squad deal')
})

await run('finale — the last walk', enter(2026, 4, 22 * 60, '2026-finale', 'arena-out', [
  set('life:finale:party', 'two'), set('f:name', true), set('f:road', true), set('f:seats', true), set('f:inside', true),
  set('life:first-shirt:gift', true), set('own:outfit:2026-finale', 'visa86'), set('life:a1:grip', 'caught'), set('life:uss:lossKind', 'father'),
]), async (page) => {
  await play(page, ['היום רציתי להיות לידך'])
  for (let i = 0; i < 120 && !(await has(page, '[data-life="ending"]')); i++) {
    if (await has(page, '[data-life="dialogue"]')) await play(page, [], 8)
    await page.waitForTimeout(800)
    if (i === 6) await page.screenshot({ path: `${OUT}/pass-d-${W}-finale-1-walk.png` })
  }
  await page.screenshot({ path: `${OUT}/pass-d-${W}-finale-2-end.png` })
  for (const line of ['היום אני תופס', 'ועוד פעם הייתי משלם', 'לא נתת לי לנתק', 'אחריך']) if (!heard.some((l) => l.includes(line))) fault(`finale: never heard "${line}"`)
  if (!(await has(page, '[data-life="ending"]'))) fault('finale: no ending card after the walk')
})

await run('household — the week', enter(2013, 0, 20 * 60, '2013-household', 'home', [set('life:partner', 'melanie')]), async (page) => {
  await play(page, ['ערב משותף'])
  for (const want of ['משמרת ערב', 'ליגת הקיץ', 'ערב שלנו', 'שער 5', 'קובי ורחל']) await play(page, [want], 8)
  await page.screenshot({ path: `${OUT}/pass-d-${W}-week-1-planned.png` })
  for (let i = 0; i < 40; i++) {
    const f = await flags(page)
    if (f['hh:lived']) break
    if (await has(page, '[data-life="dialogue"]')) await play(page, [], 6)
    await page.waitForTimeout(1200)
    if (i === 8) await page.screenshot({ path: `${OUT}/pass-d-${W}-week-2-lived.png` })
  }
  await page.screenshot({ path: `${OUT}/pass-d-${W}-week-3-fridge.png` })
  const f = await flags(page)
  if (!f['hh:lived']) fault('household: the week was never lived')
  if (!f['hh:missed:metuki']) fault('household: Metuki was left out and nobody said so')
})

await run('newhall — before the crowd', enter(2015, 5, 16 * 60 + 45, '2015-newhall', 'drive-in', [set('life:uss:there', true)]), async (page) => {
  await play(page, ['זיכרון אחד קצר'])
  await play(page)
  await page.screenshot({ path: `${OUT}/pass-d-${W}-newhall-1-empty.png` })
  await press(page, 'nr-spot-banner', 'nr-do-banner', ['לטפס'])
  await press(page, 'nr-spot-families', 'nr-do-families', ['לעמוד בדלתות'])
  for (let i = 0; i < 20; i++) {
    const f = await flags(page)
    if (f['nr:first']) break
    if (await has(page, '[data-life="dialogue"]')) await play(page, [], 6)
    await page.waitForTimeout(1200)
  }
  await page.screenshot({ path: `${OUT}/pass-d-${W}-newhall-2-crowd.png` })
  if (!heard.some((l) => l.includes('הבד הישן'))) fault('newhall: the banner never appeared to the crowd')
})

await run('after — the answer in the room', enter(2017, 0, 18 * 60 + 40, '2017-after', 'home', [set('p:amit', true)]), async (page) => {
  await play(page)
  await page.screenshot({ path: `${OUT}/pass-d-${W}-after-1-room.png` })
  await press(page, 'p-spot-phone', 'p-do-distance', ['לוקח הפסקה'])
  const f = await flags(page)
  if (!f['life:distance']) fault('after: the phone did not take the break')
})

await run('abroad — a date before a promise', enter(2025, 3, 21 * 60, '2025-abroad', 'flat-abroad', [set('life:abroad', true), set('life:abroad:corner', 'scarf')]), async (page) => {
  await play(page, ['שאחזור אליו עם תאריכים'])
  await press(page, 'x-spot-leave', 'x-leave', ['שלושה ימים'])
  for (let i = 0; i < 8 && !(await has(page, '[data-life="ending"]')); i++) {
    await play(page, ['להזמין אותו', 'להשאיר אותו בחוץ'], 10)
    await page.waitForTimeout(1500)
  }
  await page.screenshot({ path: `${OUT}/pass-d-${W}-abroad-1-pack.png` })
  const f = await flags(page)
  if (f['life:finale:packed'] !== 'scarf:aside') fault(`abroad: packed ${f['life:finale:packed']}`)
})

await run('armchair — ten minutes', enter(2019, 6, 16 * 60 + 30, '2019-armchair', 'home', [set('life:armchair', true)]), async (page) => {
  await play(page, ['לראות קצת'])
  for (let i = 0; i < 6 && !heard.some((l) => l.includes('הכביסה על הגג')); i++) {
    await page.waitForTimeout(1500)
    await play(page, ['לעלות איתה'])
  }
  await page.screenshot({ path: `${OUT}/pass-d-${W}-armchair-1-rachel.png` })
  if (!heard.some((l) => l.includes('הכביסה על הגג'))) fault('armchair: Rachel never asked')
})

console.log(faults ? `FAIL — ${faults} fault(s)` : 'PASS')
await browser.close()
process.exit(faults ? 1 : 0)
