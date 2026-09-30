// Teddy and Europe 2010 as PLACES (27.9.2026) — plays them end to end in a browser (rule 33):
//   1. 2010-teddy, the 'go' path: Oli's list, the money, Amit's question, the road card, the
//      Teddy away end (arrival, a spot at the rail, the cloth, the whistle, the call, the chaos,
//      the promise), the door out on the left, the car card, the kitchen, the ending card.
//   2. 2010-anthem with Lisbon chosen in the summer: the terminal, the glass doors, the Lisbon
//      away end (find Roma and Ofir, the flag on the rail, the anthem and the phone, the whistle).
//   3. 2010-qualify with Salzburg: the kiosk choice, the terminal, the Salzburg away end.
// node scripts/life/europe2010-probe.mjs [http://127.0.0.1:3202]   (W/H env for size)
import { mkdirSync } from 'node:fs'
import { chromium } from 'playwright'

const BASE = process.argv[2] ?? 'http://127.0.0.1:3202'
const W = Number(process.env.W ?? 390), H = Number(process.env.H ?? 844)
const OUT = 'data/life-shots'
mkdirSync(OUT, { recursive: true })
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--disable-gpu'] })
const context = await browser.newContext({ viewport: { width: W, height: H }, hasTouch: W < 800, isMobile: W < 800 })
let faults = 0
const fault = (m) => { faults++; console.log('FAULT', m) }
const base = [{ t: 'flag.raised', flag: 'life:opening' }, { t: 'flag.raised', flag: 'prologue:done' }, { t: 'chapter.entered', chapter: '1986' }, { t: 'flag.raised', flag: 'onboard:moved' }, { t: 'flag.raised', flag: 'onboard:acted' }, { t: 'flag.raised', flag: 'onboard:street' }]
const has = (page, sel) => page.evaluate((s) => !!document.querySelector(s), sel)
const q = (page, sel) => page.evaluate((s) => document.querySelector(s)?.textContent?.replace(/\s+/g, ' ').trim() ?? null, sel)
const where = (page) => page.evaluate(() => window.__life?.debug.where()?.scene ?? window.__life?.debug.where()?.location ?? null)
const heard = []

/** read lines, press continue, and pick the choice whose text matches `pick` (or the first open one) */
async function play(page, pick = [], rounds = 40) {
  for (let i = 0; i < rounds; i++) {
    if (await has(page, '[data-life="ending"]')) return 'ending'
    // a person met for the first time is a card; a tap turns it (CastCard)
    if (await has(page, '[data-life="cast-card"]')) {
      await page.click('[data-life="cast-card"]', { force: true }).catch(() => {})
      await page.waitForTimeout(400)
      continue
    }
    let choices = await page.$$('[data-life="choice"]')
    if (choices.length) {
      await page.waitForSelector('[data-life="choices"][data-armed="true"]', { timeout: 5000 }).catch(() => {})
      choices = await page.$$('[data-life="choice"]')
      if (!choices.length) continue
      const texts = await Promise.all(choices.map((c) => c.textContent()))
      const disabled = await Promise.all(choices.map((c) => c.getAttribute('aria-disabled')))
      let idx = texts.findIndex((t, k) => disabled[k] !== 'true' && pick.some((p) => (t ?? '').includes(p)))
      if (idx < 0) idx = disabled.findIndex((d) => d !== 'true')
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

/** wait (playing whatever comes) until the room is `room` */
async function until(page, room, ms = 40000) {
  const end = Date.now() + ms
  while (Date.now() < end) {
    if ((await where(page)) === room) return true
    if (await has(page, '[data-life="dialogue"]')) await play(page, [], 4)
    await page.waitForTimeout(800)
  }
  return false
}

/** the room offers this act right now (it is drawn and its `when` holds) */
const offers = (page, act) => page.evaluate((a) => (window.__life.debug.targets() ?? []).some((t) => t.id === a), act)

async function act(page, id, pick) {
  if (!(await offers(page, id))) fault(`${id} is not offered in ${await where(page)}`)
  await page.evaluate((a) => window.__life.talk(a), id)
  await page.waitForTimeout(600)
  return play(page, pick)
}

// SEG=teddy|lisbon|salzburg runs one evening (a dev server under memory pressure survives one)
const SEG = process.env.SEG ?? ''
async function run(name, events, fn) {
  if (SEG && !name.toLowerCase().includes(SEG)) return
  const page = await context.newPage()
  page.on('pageerror', (e) => fault(`${name} pageerror ${e.message}`))
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
  await page.evaluate((ev) => {
    localStorage.setItem('the-worker:life', JSON.stringify({ version: 4, identity: { name: 'פוגי', sex: 'boy', birthYear: 1978 }, year: 1986, events: ev, savedAt: new Date().toISOString() }))
    localStorage.setItem('the-worker:life:probe', '1')
  }, [...base, ...events])
  await page.goto(`${BASE}/life`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('canvas', { timeout: 90000 })
  await page.waitForTimeout(4000)
  try {
    await fn(page)
  } catch (e) {
    fault(`${name}: ${e.message}`)
  }
  console.log(`--- ${name}\n${heard.splice(0).join('\n')}`)
  await page.close()
}

const money = { t: 'money.changed', agorot: 400_000, why: 'probe' }

// ------------------------------------------------------------- 1 · Teddy, the go path
await run('2010-teddy', [
  { t: 'year.entered', year: 2010, weekday: 6, minute: 15 * 60 + 30 }, { t: 'chapter.entered', chapter: '2010-teddy' },
  { t: 'flag.raised', flag: 'own:shopnews:2010-teddy' }, money, { t: 'moved', to: 'street' },
], async (page) => {
  await play(page, ['לסגור רשימה'])
  // the wardrobe, if it opens (only for a life with shirts)
  if (await has(page, '[data-life="ritual"]')) await page.evaluate(() => window.__life.wear('plain'))
  await act(page, 'd10-roster', ['מתוקי'])
  await act(page, 'd10-pay', ['מאה ארבעים'])
  await act(page, 'd10-promise', ['ישר לרכב'])
  if (!(await until(page, 'teddy', 60000))) return fault('Teddy: the road never arrived in the away end')
  await page.waitForTimeout(5000) // the arrival shot
  await play(page)
  await page.screenshot({ path: `${OUT}/e10-${W}-01-teddy-arrive.png` })
  await act(page, 'd10-cloth', ['הצעיף'])
  await page.screenshot({ path: `${OUT}/e10-${W}-02-teddy-scarf.png` })
  if (!(await offers(page, 'd10-scarf'))) fault('Teddy: the scarf is not on the rail after tying it')
  await act(page, 'd10-spot', ['השורה הראשונה'])
  await page.waitForTimeout(2500)
  await play(page, ['הודעה ישנה'])
  await page.waitForTimeout(3500)
  await play(page, ['לאבא'])
  await page.screenshot({ path: `${OUT}/e10-${W}-03-teddy-whistle.png` })
  await page.waitForTimeout(2500)
  await play(page)
  await page.waitForTimeout(2500)
  await play(page, ['ללכת לרכב'])
  await page.screenshot({ path: `${OUT}/e10-${W}-04-teddy-after.png` })
  // the door out, on the left — through the door graph, not a teleport
  const ok = await page.evaluate(() => window.__life.goTo('street'))
  if (!ok) fault('Teddy: the way home is not open after the promise')
  if (!(await until(page, 'street', 30000))) fault('Teddy: never reached the street')
  await page.waitForTimeout(3500)
  await play(page)
  await page.screenshot({ path: `${OUT}/e10-${W}-05-car.png` })
  await page.evaluate(() => window.__life.goTo('kitchen'))
  await until(page, 'kitchen', 30000)
  await page.waitForTimeout(2500)
  await play(page, ['לשבת איתה'])
  for (let i = 0; i < 20 && !(await has(page, '[data-life="ending"]')); i++) {
    await play(page, [], 6)
    await page.waitForTimeout(1000)
  }
  await page.screenshot({ path: `${OUT}/e10-${W}-06-teddy-end.png` })
  const ending = await q(page, '[data-life="ending"]')
  if (!ending) fault('Teddy: no ending card')
  else console.log('2010-teddy ending:', ending.slice(0, 80))
  for (const line of ['יציע האורחים', '» (לשורה הראשונה', 'השריקה. אלופים', 'עמית איפה']) if (!heard.some((l) => l.includes(line))) fault(`Teddy: never heard «${line}»`)
})

// ------------------------------------------------------------- 2 · Lisbon
await run('2010-anthem · Lisbon', [
  { t: 'flag.set', flag: 'life:trip2010', value: 'lisbon' },
  { t: 'year.entered', year: 2010, weekday: 3, minute: 20 * 60 + 10 }, { t: 'chapter.entered', chapter: '2010-anthem' },
  { t: 'flag.raised', flag: 'own:shopnews:2010-anthem' }, { t: 'moved', to: 'home' },
], async (page) => {
  if (!(await until(page, 'port-europe', 40000))) return fault('Lisbon: never flew to the terminal')
  await page.waitForTimeout(2500)
  await play(page)
  await page.screenshot({ path: `${OUT}/e10-${W}-10-terminal.png` })
  const places = await page.evaluate(() => window.__life.places().map((p) => `${p.id}${p.lockedHe ? ' (shut: ' + p.lockedHe + ')' : ''}`))
  console.log('terminal places:', places.join(' | '))
  const ok = await page.evaluate(() => window.__life.goTo('away-lisbon'))
  if (!ok) fault('Lisbon: the glass doors do not open to the away end')
  if (!(await until(page, 'away-lisbon', 30000))) return fault('Lisbon: never reached the away end')
  await page.waitForTimeout(5000)
  await play(page)
  await page.screenshot({ path: `${OUT}/e10-${W}-11-lisbon.png` })
  await act(page, 'c10-lis-find')
  await act(page, 'c10-lis-rail', ['לתלות'])
  await page.screenshot({ path: `${OUT}/e10-${W}-12-lisbon-flag.png` })
  await page.waitForTimeout(3000)
  await play(page, ['להרים את הטלפון'])
  await page.waitForTimeout(3500)
  await play(page, ['לשמור את הרגע'])
  await page.screenshot({ path: `${OUT}/e10-${W}-13-lisbon-after.png` })
  const ok2 = await page.evaluate(() => window.__life.goTo('street'))
  if (!ok2) fault('Lisbon: the way home is not open after the whistle')
  if (!(await until(page, 'street', 30000))) fault('Lisbon: never got home')
  for (const line of ['ספרתי אותנו', '» (לענות', 'הפסדנו']) if (!heard.some((l) => l.includes(line))) fault(`Lisbon: never heard «${line}»`)
})

// ------------------------------------------------------------- 3 · Salzburg
await run('2010-qualify · Salzburg', [
  { t: 'year.entered', year: 2010, weekday: 3, minute: 17 * 60 + 40 }, { t: 'chapter.entered', chapter: '2010-qualify' },
  { t: 'flag.raised', flag: 'own:shopnews:2010-qualify' }, money, { t: 'moved', to: 'kiosk' },
], async (page) => {
  await play(page, ['זלצבורג'])
  if (!(await until(page, 'port-europe', 40000))) return fault('Salzburg: never flew')
  await page.waitForTimeout(2500)
  await play(page)
  const ok = await page.evaluate(() => window.__life.goTo('away-salzburg'))
  if (!ok) fault('Salzburg: the glass doors do not open')
  if (!(await until(page, 'away-salzburg', 30000))) return fault('Salzburg: never reached the away end')
  await page.waitForTimeout(5000)
  await play(page)
  await page.screenshot({ path: `${OUT}/e10-${W}-20-salzburg.png` })
  await act(page, 'c10-salz-find')
  await act(page, 'c10-salz-rail', ['לקשור'])
  await page.screenshot({ path: `${OUT}/e10-${W}-21-salzburg-flag.png` })
  await page.waitForTimeout(3000)
  await play(page, ['לאבא'])
  await page.waitForTimeout(3500)
  await play(page)
  await page.screenshot({ path: `${OUT}/e10-${W}-22-salzburg-after.png` })
  if (!(await page.evaluate(() => window.__life.goTo('street')))) fault('Salzburg: no way home')
  await until(page, 'street', 30000)
  await page.evaluate(() => window.__life.goTo('allenby'))
  await until(page, 'allenby', 30000)
  await page.waitForTimeout(2500)
  await play(page, ['עיר אחת'])
  for (let i = 0; i < 15 && !(await has(page, '[data-life="ending"]')); i++) {
    await play(page, [], 6)
    await page.waitForTimeout(1000)
  }
  const ending = await q(page, '[data-life="ending"]')
  if (!ending) fault('Salzburg: no ending card for the summer')
  else console.log('2010-qualify ending:', ending.slice(0, 80))
  await page.screenshot({ path: `${OUT}/e10-${W}-23-summer-end.png` })
})

console.log(heard.join('\n'))
console.log(faults ? `FAIL — ${faults} fault(s)` : 'PASS')
await browser.close()
process.exit(faults ? 1 : 0)
