// העיר שעל הים (27.9.2026) — plays the Jaffa and promenade scenes in a browser (rule 33: the
// whole thing, not one screen). Each run seeds the first room of the chapter and WALKS the door
// graph (`__life.goTo`, the map's own travel — one hop at a time, so a missing door is a
// failure, not a teleport): 2024-lina home → Allenby → the archway → the promenade → the clock
// tower → the alley café; 2017-distance kiosk → the promenade (Keren, then she walks to the sea);
// 2021-suitcase the last evening at dusk; 2025-interview the alley café and FACT / HEARD / OPINION.
// node scripts/life/jaffa-probe.mjs [http://127.0.0.1:3203]   (W/H env for size)
import { mkdirSync } from 'node:fs'
import { chromium } from 'playwright'
const BASE = process.argv[2] ?? 'http://127.0.0.1:3203'
const W = Number(process.env.W ?? 390), H = Number(process.env.H ?? 844)
const OUT = 'data/life-shots/jaffa'
mkdirSync(OUT, { recursive: true })
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--disable-gpu'] })
const context = await browser.newContext({ viewport: { width: W, height: H }, hasTouch: W < 800, isMobile: W < 800 })
let faults = 0
const fault = (m) => { faults++; console.log('FAULT', m) }
const base = [{ t: 'flag.raised', flag: 'life:opening' }, { t: 'flag.raised', flag: 'prologue:done' }, { t: 'chapter.entered', chapter: '1986' }, { t: 'flag.raised', flag: 'onboard:moved' }, { t: 'flag.raised', flag: 'onboard:acted' }, { t: 'flag.raised', flag: 'onboard:street' }]
const has = (page, sel) => page.evaluate((s) => !!document.querySelector(s), sel)
const q = (page, sel) => page.evaluate((s) => document.querySelector(s)?.textContent?.replace(/\s+/g, ' ').trim() ?? null, sel)
const heard = []

/** read lines, press continue, and pick the choice whose text matches `pick` (or the first) */
async function play(page, pick = [], rounds = 40) {
  for (let i = 0; i < rounds; i++) {
    if (await has(page, '[data-life="ending"]')) return 'ending'
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
      await page.waitForTimeout(350)
      continue
    }
    if (i > 3) return 'idle'
    await page.waitForTimeout(800)
  }
  return 'rounds'
}

const where = (page) => page.evaluate(() => window.__life.debug.where()?.scene ?? window.__life.debug.where()?.id ?? null)

/** one hop of the door graph: the next room must be listed as a place from here, open, and one door away */
async function walk(page, to, shot) {
  // a room that is still fading in answers with no places at all — wait for the world, not a clock
  let places = []
  for (let i = 0; i < 30 && !places.length; i++) {
    places = await page.evaluate(() => window.__life.places())
    if (!places.length) await page.waitForTimeout(500)
  }
  const place = places.find((p) => p.id === to)
  if (!place) return fault(`no way to ${to} from ${await where(page)} (${places.map((p) => p.id).join(', ')})`)
  if (place.lockedHe) return fault(`${to} is shut: ${place.lockedHe}`)
  const ok = await page.evaluate((id) => window.__life.goTo(id), to)
  if (!ok) return fault(`goTo(${to}) refused`)
  await page.waitForTimeout(3200)
  let now = null
  for (let i = 0; i < 30 && !now; i++) {
    now = await where(page)
    if (!now) await page.waitForTimeout(500)
  }
  if (now && now !== to) fault(`walked to ${to}, landed in ${now}`)
  if (shot) await page.screenshot({ path: `${OUT}/${shot}-${W}.png` })
}

// ONLY=2017-distance,2021-suitcase — one chapter at a time (a dev server on a small box can
// be killed by memory between runs; a fresh server per chapter is the cheap way round it)
const ONLY = process.env.ONLY ? new Set(process.env.ONLY.split(',')) : null

async function run(name, events, fn) {
  if (ONLY && !ONLY.has(name)) return
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
  await page.close()
}

const ending = async (page, name, want) => {
  const text = await q(page, '[data-life="ending"]')
  if (!text) return fault(`${name}: no ending card`)
  console.log(`${name} ending:`, text.slice(0, 80))
  if (want && !text.includes(want)) fault(`${name}: ending is not "${want}"`)
}

await run('2024-lina', [
  { t: 'year.entered', year: 2024, weekday: 1, minute: 6 * 60 + 40 }, { t: 'chapter.entered', chapter: '2024-lina' },
  { t: 'flag.raised', flag: 'life:international' }, { t: 'flag.raised', flag: 'life:intl:met' }, { t: 'flag.raised', flag: 'own:shopnews:2024-lina' },
  { t: 'moved', to: 'home' },
], async (page) => {
  await play(page, ['לבוא אליהם'])
  await play(page)
  await page.screenshot({ path: `${OUT}/lina-01-home-${W}.png` })
  await walk(page, 'street')
  await walk(page, 'allenby', 'lina-02-allenby')
  await walk(page, 'promenade', 'lina-03-promenade')
  await walk(page, 'jaffa')
  // the tower: read to the choice, look at it, then take the photograph before walking on
  for (let i = 0; i < 12 && !(await page.$('[data-life="choice"]')); i++) {
    if (await has(page, '[data-life="dialogue"]')) { heard.push(await q(page, '[data-life="line"]')); await page.evaluate(() => window.__life.advance()) }
    await page.waitForTimeout(500)
  }
  await page.screenshot({ path: `${OUT}/lina-04-tower-${W}.png` })
  await play(page, ['לסמטה'])
  await play(page)
  await page.evaluate(() => window.__life.talk('jaffa-photo'))
  await page.waitForTimeout(700)
  await play(page)
  await page.screenshot({ path: `${OUT}/lina-05-photo-${W}.png` })
  await walk(page, 'jaffa-alley')
  for (let i = 0; i < 12 && !(await page.$('[data-life="choice"]')); i++) {
    if (await has(page, '[data-life="dialogue"]')) { heard.push(await q(page, '[data-life="line"]')); await page.evaluate(() => window.__life.advance()) }
    await page.waitForTimeout(500)
  }
  await page.screenshot({ path: `${OUT}/lina-06-alley-${W}.png` })
  if (!heard.some((l) => (l ?? '').includes('סוף סוף'))) fault('2024-lina: the photograph was not remembered at the café')
  await play(page, ['להסביר'])
  for (let i = 0; i < 10 && !(await has(page, '[data-life="ending"]')); i++) { await play(page, [], 4); await page.waitForTimeout(800) }
  await page.screenshot({ path: `${OUT}/lina-07-end-${W}.png` })
  await ending(page, '2024-lina', 'עכשיו אני מבין למה')
})

await run('2017-distance', [
  { t: 'year.entered', year: 2017, weekday: 2, minute: 18 * 60 + 30 }, { t: 'chapter.entered', chapter: '2017-distance' },
  { t: 'flag.raised', flag: 'life:distance' }, { t: 'flag.raised', flag: 'own:shopnews:2017-distance' }, { t: 'moved', to: 'kiosk' },
], async (page) => {
  await play(page, ['להתרחק מהכדורגל'])
  await play(page)
  await walk(page, 'street')
  await walk(page, 'allenby')
  await walk(page, 'promenade')
  for (let i = 0; i < 12 && !(await page.$('[data-life="choice"]')); i++) {
    if (await has(page, '[data-life="dialogue"]')) { heard.push(await q(page, '[data-life="line"]')); await page.evaluate(() => window.__life.advance()) }
    await page.waitForTimeout(500)
  }
  await page.screenshot({ path: `${OUT}/distance-01-keren-${W}.png` })
  await play(page, ['מסורת עם אנשים'])
  await play(page)
  await page.waitForTimeout(5000)
  await page.screenshot({ path: `${OUT}/distance-02-after-${W}.png` })
  const flags = await page.evaluate(() => JSON.parse(localStorage.getItem('the-worker:life') ?? '{}').events?.filter((e) => e.flag === 'k:keren-gone' || e.flag === 'life:distance:sea').map((e) => e.flag))
  if (!flags?.includes('life:distance:sea')) fault('2017-distance: life:distance:sea never written')
  if (!flags?.includes('k:keren-gone')) fault('2017-distance: Keren never walked to the sea')
})

await run('2021-suitcase', [
  { t: 'year.entered', year: 2021, weekday: 4, minute: 20 * 60 }, { t: 'chapter.entered', chapter: '2021-suitcase' },
  { t: 'flag.raised', flag: 'life:distance' }, { t: 'flag.set', flag: 'life:distance:sea', value: 'people' }, { t: 'flag.raised', flag: 'own:shopnews:2021-suitcase' },
  { t: 'moved', to: 'home' },
], async (page) => {
  await play(page, ['לסגור תוכנית מעבר'])
  await play(page)
  await walk(page, 'street')
  await walk(page, 'allenby')
  await walk(page, 'promenade')
  for (let i = 0; i < 12 && !(await page.$('[data-life="choice"]')); i++) {
    if (await has(page, '[data-life="dialogue"]')) { heard.push(await q(page, '[data-life="line"]')); await page.evaluate(() => window.__life.advance()) }
    await page.waitForTimeout(500)
  }
  await page.screenshot({ path: `${OUT}/suitcase-01-dusk-${W}.png` })
  if (!heard.some((l) => (l ?? '').includes('אותה טיילת'))) fault('2021-suitcase: Keren did not remember 2017')
  await play(page, ['לצלם את השלט'])
  for (let i = 0; i < 10 && !(await has(page, '[data-life="ending"]')); i++) { await play(page, [], 4); await page.waitForTimeout(800) }
  await ending(page, '2021-suitcase', 'נשאר עם כתובת')
})

await run('2025-interview', [
  { t: 'year.entered', year: 2025, weekday: 3, minute: 11 * 60 }, { t: 'chapter.entered', chapter: '2025-interview' },
  { t: 'flag.raised', flag: 'own:route:JOURNALIST:apex' }, { t: 'flag.raised', flag: 'own:shopnews:2025-interview' }, { t: 'moved', to: 'allenby' },
], async (page) => {
  await play(page, ['ביפו'])
  await play(page)
  await walk(page, 'promenade')
  await walk(page, 'jaffa')
  await walk(page, 'jaffa-alley')
  for (let i = 0; i < 12 && !(await page.$('[data-life="choice"]')); i++) {
    if (await has(page, '[data-life="dialogue"]')) { heard.push(await q(page, '[data-life="line"]')); await page.evaluate(() => window.__life.advance()) }
    await page.waitForTimeout(500)
  }
  await page.screenshot({ path: `${OUT}/interview-01-table-${W}.png` })
  await play(page, ['כרטיס עם תאריך'])
  await play(page, ['לדבר על העבודה'])
  for (let i = 0; i < 10 && !(await has(page, '[data-life="ending"]')); i++) { await play(page, [], 4); await page.waitForTimeout(800) }
  await ending(page, '2025-interview', 'רשות להראות')
})

console.log(heard.filter(Boolean).join('\n'))
console.log(faults ? `FAIL — ${faults} fault(s)` : 'PASS')
await browser.close()
process.exit(faults ? 1 : 0)
