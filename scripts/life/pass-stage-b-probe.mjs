// Stage B implementation pass (27–28.9.2026) — plays the new pieces of 1990–2000 in a browser,
// at phone size, and photographs them: the half-time note (1990) and the payphone after the
// whistle, the kiosk court sorted and the gate of spring 1996 (1995), Soko's three lists (1998),
// the ride to the cup final and the bus home from the north (1993), Efi at the corner (1997),
// the red box before Ramat Gan and the hug (1999), the call home (2000), Yaron's Saturday (1996).
// node scripts/life/pass-stage-b-probe.mjs [http://127.0.0.1:3212]   (W/H env for size)
import { mkdirSync } from 'node:fs'
import { chromium } from 'playwright'

const BASE = process.argv[2] ?? 'http://127.0.0.1:3212'
const W = Number(process.env.W ?? 390), H = Number(process.env.H ?? 844)
const ONLY = process.env.ONLY ?? ''
const OUT = 'data/life-shots/stage-b-pass'
mkdirSync(OUT, { recursive: true })
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--disable-gpu'] })
const context = await browser.newContext({ viewport: { width: W, height: H }, hasTouch: W < 800, isMobile: W < 800 })
let faults = 0
const fault = (m) => { faults++; console.log('FAULT', m) }
const base = [{ t: 'flag.raised', flag: 'life:opening' }, { t: 'flag.raised', flag: 'prologue:done' }, { t: 'chapter.entered', chapter: '1986' }, { t: 'flag.raised', flag: 'onboard:moved' }, { t: 'flag.raised', flag: 'onboard:acted' }, { t: 'flag.raised', flag: 'onboard:street' }]
const has = (page, sel) => page.evaluate((s) => !!document.querySelector(s), sel)
const q = (page, sel) => page.evaluate((s) => document.querySelector(s)?.textContent?.replace(/\s+/g, ' ').trim() ?? null, sel)
const heard = []
const F = (flag) => ({ t: 'flag.raised', flag })
const V = (flag, value) => ({ t: 'flag.set', flag, value })

/** read lines, press continue, and pick the choice whose text matches `pick` (or the first) */
async function play(page, pick = [], rounds = 40) {
  for (let i = 0; i < rounds; i++) {
    if (await has(page, '[data-life="ending"]')) return 'ending'
    if (await has(page, '[data-life="board"]')) return 'board'
    let choices = await page.$$('[data-life="choice"]')
    if (choices.length) {
      await page.waitForSelector('[data-life="choices"][data-armed="true"]', { timeout: 5000 }).catch(() => {})
      choices = await page.$$('[data-life="choice"]')
      if (!choices.length) continue
      const texts = await Promise.all(choices.map((c) => c.textContent()))
      let idx = texts.findIndex((t) => pick.some((p) => (t ?? '').includes(p)))
      if (idx < 0) idx = texts.findIndex((_, k) => !(choices[k].getAttribute('aria-disabled') === 'true'))
      heard.push(`» ${texts[Math.max(0, idx)]?.trim()}`)
      await choices[Math.max(0, idx)].click({ force: true })
      await page.waitForTimeout(600)
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

/** sort every scrap on the board: by `placement[card]`, else the first column */
async function sortBoard(page, name, placement = {}) {
  await page.waitForSelector('[data-life="board"][data-armed="true"]', { timeout: 8000 })
  await page.screenshot({ path: `${OUT}/${name}-${W}-board.png` })
  for (let i = 0; i < 12; i++) {
    const card = await page.evaluate(() => document.querySelector('[data-life="board-scrap"]')?.getAttribute('data-card') ?? null)
    if (!card) break
    const col = placement[card] ?? (await page.evaluate(() => document.querySelector('[data-life="board-col"]')?.getAttribute('data-col')))
    await page.click(`[data-life="board-col"][data-col="${col}"]`)
    await page.waitForTimeout(220)
    if (i === 1) await page.screenshot({ path: `${OUT}/${name}-${W}-board-mid.png` })
  }
  await page.waitForSelector('[data-life="board-verdict"]', { timeout: 6000 })
  const verdict = await q(page, '[data-life="board-verdict"]')
  console.log(`${name} verdict:`, verdict?.slice(0, 110))
  await page.screenshot({ path: `${OUT}/${name}-${W}-verdict.png` })
  await page.click('[data-life="board-done"]')
  await page.waitForTimeout(900)
  return verdict
}

async function run(name, events, fn) {
  if (ONLY && !name.includes(ONLY)) return
  const page = await context.newPage()
  page.on('pageerror', (e) => fault(`${name} pageerror ${e.message}`))
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 240000 })
  await page.evaluate((ev) => {
    localStorage.setItem('the-worker:life', JSON.stringify({ version: 4, identity: { name: 'פוגי', sex: 'boy', birthYear: 1978 }, year: 1986, events: ev, savedAt: new Date().toISOString() }))
    localStorage.setItem('the-worker:life:probe', '1')
  }, [...base, ...events])
  await page.goto(`${BASE}/life`, { waitUntil: 'domcontentloaded', timeout: 240000 })
  await page.waitForSelector('canvas', { timeout: 240000 })
  await page.waitForTimeout(4000)
  try {
    await fn(page)
  } catch (e) {
    fault(`${name}: ${e.message}`)
    await page.screenshot({ path: `${OUT}/${name}-${W}-FAULT.png` }).catch(() => {})
  }
  await page.close()
}

const Y = (year, weekday, minute, chapter) => [{ t: 'year.entered', year, weekday, minute }, { t: 'chapter.entered', chapter }]

// ---------------------------------------------------------------- 1990 · the note ---
await run('1990-note', [
  ...Y(1990, 6, 16 * 60 + 45, '1990'),
  F('knows:math'), F('math:kobi'), F('knows:radio'), F('uc:heard'), F('net:src:amit'), F('net:src:rafi'), F('net:heard'),
  V('net:known', 'יבנה מובילה.'), V('net:known:from', 'kobi'), V('rumor:last', 'נתניה השוותה, אח שלי אמר!'), F('entry:granted'),
  { t: 'moved', to: 'bloomfield-inside' },
], async (page) => {
  await page.screenshot({ path: `${OUT}/1990-note-${W}-01-terrace.png` })
  await play(page, [], 8)
  await page.evaluate(() => window.__life.talk('net-half-1990'))
  await page.waitForTimeout(700)
  const r = await play(page, ['לכתוב'])
  if (r !== 'picked' && !(await has(page, '[data-life="board"]'))) fault('1990: the half-time box did not offer the note')
  await sortBoard(page, '1990-note', { ours: 'known', table: 'known', 'radio-home': 'verified', yavne: 'verified', kids: 'rumour', amit: 'rumour', rafi: 'rumour', gates: 'rumour', brain: 'rumour' })
  await play(page, [], 12)
  await page.screenshot({ path: `${OUT}/1990-note-${W}-02-kobi.png` })
  if (!heard.some((l) => l.includes('מי לימד אותך'))) fault('1990: Kobi did not read the clean note')
})

await run('1990-phone', [
  ...Y(1990, 6, 17 * 60 + 55, '1990'),
  F('knows:math'), F('entry:granted'), F('match:over'), F('saw:goal'), V('life:1990:notebook', 'clean'), F('net:handed'),
  { t: 'money.changed', agorot: 2000, why: 'probe' }, { t: 'moved', to: 'undercroft' },
], async (page) => {
  await page.waitForTimeout(1500)
  await page.screenshot({ path: `${OUT}/1990-phone-${W}-01-undercroft.png` })
  await page.evaluate(() => window.__life.talk('uc-phone-1990'))
  await page.waitForTimeout(600)
  await play(page, [], 14)
  await page.screenshot({ path: `${OUT}/1990-phone-${W}-02-call.png` })
  if (!heard.some((l) => l.includes('ברדיו עוד לא אמרו'))) fault('1990: the call home was not first')
})

// ---------------------------------------------------------------- 1995 · the court ---
await run('1995-court', [
  ...Y(1995, 2, 19 * 60 + 20, '1995-sinai'),
  F('life:sinai:d1'), F('s1:argued'), F('s1:heard'), F('life:sinai:d2'), F('s2:seen'), F('s2:v:paper'), F('s2:v:freddy'), F('s2:v:fan'),
  { t: 'moved', to: 'kiosk' },
], async (page) => {
  await page.waitForTimeout(1200)
  await page.screenshot({ path: `${OUT}/1995-court-${W}-01-kiosk.png` })
  await page.evaluate(() => window.__life.talk('s2-court'))
  await page.waitForTimeout(600)
  await play(page, ['לסדר לעצמי'])
  await sortBoard(page, '1995-court', { table: 'fact', cover: 'claim', go: 'feeling', europe: 'claim', 'eighty-six': 'fact', poster: 'feeling' })
  await play(page, ['את השחקן אני אוהב'], 12)
  await page.screenshot({ path: `${OUT}/1995-court-${W}-02-after.png` })
  if (!heard.some((l) => l.includes('את השחקן אני אוהב'))) fault('1995: the court did not offer the both-things answer after a clean sort')
})

await run('1995-gate', [
  ...Y(1996, 6, 16 * 60 + 20, '1995-sinai'),
  F('life:sinai:d1'), F('life:sinai:d2'), F('s2:done'), F('s2:poster'), F('life:poster:wall'), { t: 'day.entered', dayId: 'life:sinai:d3', year: 1996, weekday: 6, minute: 16 * 60 + 20, dateHe: 'אביב 1996' }, F('life:sinai:d3'),
  { t: 'moved', to: 'bloomfield-outside' },
], async (page) => {
  await play(page, [], 8)
  await page.screenshot({ path: `${OUT}/1995-gate-${W}-01-gate.png` })
  await page.evaluate(() => window.__life.talk('s3-seven-96'))
  await page.waitForTimeout(600)
  await play(page, ['לעמוד לידו'])
  await play(page, [], 10)
  await page.screenshot({ path: `${OUT}/1995-gate-${W}-02-stood.png` })
  for (let i = 0; i < 6 && !heard.some((l) => l.includes('שער 7 סגור')); i++) {
    await page.evaluate(() => window.__life.debug.jump(5))
    await page.waitForTimeout(2000)
    await play(page, ['מסביב'], 10)
  }
  if (!heard.some((l) => l.includes('שער 7 סגור'))) fault('1995: gate seven never shut')
  for (let i = 0; i < 30 && !(await has(page, '[data-life="ending"]')); i++) {
    const r = await play(page, ['הוא נשאר', 'את השחקן'], 10)
    if (r === 'idle') await page.waitForTimeout(1200)
  }
  await page.screenshot({ path: `${OUT}/1995-gate-${W}-03-end.png` })
  if (!(await has(page, '[data-life="ending"]'))) fault('1995: no ending after the gate')
  if (!heard.some((l) => l.includes('עמדת היום ליד מישהו'))) fault('1995: the wall did not hear about the gate')
})

// ---------------------------------------------------------------- 1998 · the lists ---
await run('1998-lists', [
  ...Y(1998, 6, 19 * 60, '1998-laces'),
  F('life:laces:d1'), F('l1:match'), F('l1:end'), F('l1:inside'), F('l1:after'), F('m98:laces'), F('l1:ten'),
  { t: 'moved', to: 'bloomfield-outside' },
], async (page) => {
  await page.waitForTimeout(1200)
  await page.screenshot({ path: `${OUT}/1998-lists-${W}-01-forecourt.png` })
  await page.evaluate(() => window.__life.talk('l1-ten-soko'))
  await page.waitForTimeout(600)
  await play(page, ['שלוש הרשימות'])
  await sortBoard(page, '1998-lists', { ours: 'know', laces: 'heard', bought: 'heard', pager: 'heard', radio: 'heard', next: 'invent' })
  for (let i = 0; i < 30 && !(await has(page, '[data-life="ending"]')); i++) {
    const r = await play(page, ['לשאול. באמת'], 10)
    if (r === 'idle') { await page.evaluate(() => window.__life.debug.jump(10)); await page.waitForTimeout(1500) }
  }
  await page.screenshot({ path: `${OUT}/1998-lists-${W}-02-end.png` })
  if (!heard.some((l) => l.includes('בשני טורים'))) fault('1998: the Red Box note did not say the strict lists back')
})

// ---------------------------------------------------------------- 1993 · seat / north ---
await run('1993-ride', [...Y(1993, 1, 18 * 60 + 25, '1993-cup'), F('route:efi'), F('on:bus'), { t: 'moved', to: 'bus-stop' }], async (page) => {
  await page.evaluate(() => window.__life.talk('ride-1993'))
  await page.waitForTimeout(600)
  await play(page, ['לאפי'])
  await page.screenshot({ path: `${OUT}/1993-ride-${W}-01-seat.png` })
  await play(page, [], 10)
  if (!heard.some((l) => l.includes('תסתכל עכשיו'))) fault('1993: the window with Efi was not played')
})

await run('1993-north', [
  ...Y(1993, 3, 20 * 60 + 30, '1993-galil'), V('life:1993:seat', 'efi'),
  { t: 'day.entered', dayId: 'life:galil:d4', year: 1993, weekday: 3, minute: 20 * 60 + 30, dateHe: '19 במאי 1993' }, F('life:galil:d4'), F('g4:decided'), F('went:galil-bus'), { t: 'moved', to: 'street' },
], async (page) => {
  await page.evaluate(() => window.__life.talk('g4-north'))
  await page.waitForTimeout(600)
  await play(page, ['לקום'])
  await play(page, ['ליד אפי'])
  await play(page, ['לילד'])
  await play(page, [], 20)
  await page.screenshot({ path: `${OUT}/1993-north-${W}-01-bus.png` })
  if (!heard.some((l) => l.includes('שמרתי לך'))) fault('1993: Efi did not keep the seat')
  if (!heard.some((l) => l.includes('התוף נשאר שם'))) fault('1993: the drum left behind was not seen')
})

// ---------------------------------------------------------------- 1997 · Efi ---
await run('1997-efi', [...Y(1997, 2, 19 * 60, '1997-basket'), V('life:galil:seat', 'efi'), F('life:hall:d1'), { t: 'moved', to: 'ussishkin-outside' }], async (page) => {
  await play(page, [], 12)
  await page.screenshot({ path: `${OUT}/1997-efi-${W}-01-corner.png` })
  await page.evaluate(() => window.__life.talk('efi-hall-97'))
  await page.waitForTimeout(600)
  await play(page, [], 8)
  if (!heard.some((l) => l.includes('שמרתי לך מקום'))) fault('1997: Efi did not keep a place')
  await page.evaluate(() => window.__life.talk('h1-chain'))
  await page.waitForTimeout(600)
  await play(page, ['להישאר. לשבת'])
  await play(page, ['דרך אלנבי'])
  await play(page, [], 10)
  await page.screenshot({ path: `${OUT}/1997-efi-${W}-02-walk.png` })
})

// ---------------------------------------------------------------- 1999 · the box ---
await run('1999-box', [...Y(1999, 3, 14 * 60, '1999-cup'), F('own:stub-1983'), F('c99:opened'), { t: 'moved', to: 'bedroom' }], async (page) => {
  await page.waitForTimeout(1500)
  await page.screenshot({ path: `${OUT}/1999-box-${W}-01-bedroom.png` })
  await page.evaluate(() => window.__life.talk('c99-box'))
  await page.waitForTimeout(600)
  await play(page, ['הספח'])
  await play(page, [], 6)
  await page.evaluate(() => window.__life.talk('c99-kobi-hug'))
  await page.waitForTimeout(600)
  await play(page, [], 14)
  await page.screenshot({ path: `${OUT}/1999-box-${W}-02-hug.png` })
  if (!heard.some((l) => l.includes('עוד יש לך את הדבר הזה'))) fault('1999: Kobi did not find the stub')
})

// ---------------------------------------------------------------- 2000 · the call ---
await run('2000-call', [...Y(2000, 6, 17 * 60, '2000-title'), V('life:1990:called', 'first'), F('t:opened'), F('t:route'), F('t:matched'), F('t:confirmed'), { t: 'moved', to: 'hatikva' }], async (page) => {
  await page.evaluate(() => window.__life.talk('t-call'))
  await page.waitForTimeout(600)
  await play(page, ['להתקשר'])
  await play(page, [], 10)
  await page.screenshot({ path: `${OUT}/2000-call-${W}-01-call.png` })
  if (!heard.some((l) => l.includes('בתשעים אתה היית הראשון'))) fault('2000: the call did not remember 1990')
})

// ---------------------------------------------------------------- 1996 · Yaron ---
await run('1996-yaron', [...Y(1997, 4, 17 * 60, '1996-army'), F('life:swap:yaron'), { t: 'day.entered', dayId: 'life:army:d5', year: 1997, weekday: 4, minute: 17 * 60 }, F('life:army:d5'), { t: 'moved', to: 'kiosk' }], async (page) => {
  await play(page, ['לשמירה של ירון'], 12)
  await play(page, [], 10)
  await page.screenshot({ path: `${OUT}/1996-yaron-${W}-01-kiosk.png` })
  if (!heard.some((l) => l.includes('חייל בשם ירון'))) fault('1996: Yaron did not call in the Saturday')
})

console.log(heard.slice(-40).join('\n'))
console.log(faults ? `FAIL — ${faults} faults` : 'PASS')
await browser.close()
process.exit(faults ? 1 : 0)
