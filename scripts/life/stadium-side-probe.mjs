// ליד המגרש, והאולם הגדול (27.9.2026) — plays the four rooms of `world/city2027/stadiumSide.ts` in a
// browser (rule 33: the whole thing, not one screen): 2024-home's night from the ride into the big hall
// (find the seat, look for faces, sit) to the ending at home; 2001-terrace under the gate-5 stand (the
// role, two jobs, the gate opening, "who did it"); 2012-terrace's handoff and its test on the stairs;
// and a look at 1990's undercroft and 1993's Dan stop.
// node scripts/life/stadium-side-probe.mjs [http://127.0.0.1:3204]   (W/H env for size)
import { mkdirSync } from 'node:fs'

import { chromium } from 'playwright'

const BASE = process.argv[2] ?? 'http://127.0.0.1:3204'
const W = Number(process.env.W ?? 390), H = Number(process.env.H ?? 844)
const OUT = process.env.OUT ?? 'data/life-shots'
mkdirSync(OUT, { recursive: true })
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--disable-gpu'] })
const context = await browser.newContext({ viewport: { width: W, height: H }, hasTouch: W < 800, isMobile: W < 800 })
let faults = 0
const fault = (m) => { faults++; console.log('FAULT', m) }
const met = ['efi', 'asaf', 'yevgeny', 'melamed', 'kobi', 'rachel', 'ofir', 'amit', 'barry', 'michel', 'limor', 'shachor'].map((id) => ({ t: 'flag.raised', flag: `own:met:${id}` }))
const base = [...met, { t: 'flag.raised', flag: 'life:opening' }, { t: 'flag.raised', flag: 'prologue:done' }, { t: 'chapter.entered', chapter: '1986' }, { t: 'flag.raised', flag: 'onboard:moved' }, { t: 'flag.raised', flag: 'onboard:acted' }, { t: 'flag.raised', flag: 'onboard:street' }]
const has = (page, sel) => page.evaluate((s) => !!document.querySelector(s), sel)
const q = (page, sel) => page.evaluate((s) => document.querySelector(s)?.textContent?.replace(/\s+/g, ' ').trim() ?? null, sel)
const where = (page) => page.evaluate(() => { try { return window.__life.debug.where() } catch { return null } })
const heard = []

/** read lines, press continue, and pick the choice whose text matches `pick` (or the first) */
async function play(page, pick = [], rounds = 40) {
  for (let i = 0; i < rounds; i++) {
    if (await has(page, '[data-life="ending"]')) return 'ending'
    let choices = await page.$$('[data-life="choice"]')
    if (choices.length) {
      // a ballot arms after the revealing gesture is released (lib/life/inputArm.ts) — wait for the gate
      await page.waitForSelector('[data-life="choices"][data-armed="true"]', { timeout: 5000 }).catch(() => {})
      choices = await page.$$('[data-life="choice"]')
      if (!choices.length) continue
      const texts = await Promise.all(choices.map((c) => c.textContent()))
      let idx = texts.findIndex((t) => pick.some((p) => (t ?? '').includes(p)))
      if (idx < 0) idx = texts.findIndex((_, k) => !(choices[k].getAttribute('aria-disabled') === 'true'))
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

async function run(name, events, fn) {
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
  await page.close()
}

/** cards the chapter opens by itself (the season ticket, the shop's new shirt) — out of the way of the room */
async function clear(page) {
  for (const label of ['מובן', 'לגעת כדי להמשיך', 'המשך']) await page.getByText(label, { exact: true }).first().click({ timeout: 1500 }).catch(() => {})
  await page.waitForTimeout(600)
}
const shot = async (page, name) => {
  await clear(page)
  await page.screenshot({ path: `${OUT}/stadside-${W}-${name}.png` })
}

// ------------------------------------------------------------ 2024-home · the first night ---
await run('2024-home night', [
  { t: 'year.entered', year: 2024, weekday: 0, minute: 19 * 60 }, { t: 'chapter.entered', chapter: '2024-home' },
  { t: 'flag.raised', flag: 'own:shopnews:2024-home' }, { t: 'flag.raised', flag: 'life:drivein:first-night' },
  { t: 'flag.raised', flag: 'h24:rumor' }, { t: 'flag.raised', flag: 'h24:board' }, { t: 'flag.raised', flag: 'h24:ask' },
  { t: 'flag.raised', flag: 'h24:small' }, { t: 'flag.set', flag: 'h24:concern', value: 'rights' }, { t: 'flag.set', flag: 'h24:ticket', value: 'moved' },
  { t: 'moved', to: 'home' },
], async (page) => {
  await page.evaluate(() => window.__life.debug.jump(10))
  await page.waitForTimeout(2500)
  const r = await play(page, ['ללכת'])
  console.log('night:', r)
  // the ride: three stops that play themselves, then the arena
  for (let i = 0; i < 80; i++) {
    if (await has(page, '[data-life="dialogue"]')) await play(page, [], 4)
    const at = await where(page)
    if (at && String(JSON.stringify(at)).includes('menora') && !String(JSON.stringify(at)).includes('ride')) break
    if (i === 6) await shot(page, '01-ride')
    await page.waitForTimeout(1000)
  }
  await page.waitForTimeout(2500)
  console.log('landed:', JSON.stringify(await where(page)))
  await shot(page, '02-menora')
  await play(page, [], 6)
  await page.evaluate(() => window.__life.talk('h24-faces'))
  await page.waitForTimeout(700)
  await play(page)
  await page.evaluate(() => window.__life.talk('h24-find-seat'))
  await page.waitForTimeout(700)
  await play(page)
  await shot(page, '03-seat')
  await page.evaluate(() => window.__life.talk('h24-inside'))
  await page.waitForTimeout(700)
  await play(page, ['לעמוד ליד המעקה'])
  for (let i = 0; i < 40 && !(await has(page, '[data-life="ending"]')); i++) {
    if (await has(page, '[data-life="dialogue"]')) await play(page, [], 8)
    await page.waitForTimeout(1000)
  }
  await shot(page, '04-home-end')
  const ending = await q(page, '[data-life="ending"]')
  if (!ending) fault('2024-home: no ending card after the night in the arena')
  else console.log('2024-home ending:', ending.slice(0, 80))
  if (!heard.some((l) => l.includes('שורה שבע'))) fault('2024-home: the faces of row seven were never seen')
  if (!heard.some((l) => l.includes('אחרי השיר') || l.includes('שורה שבע באה'))) fault('2024-home: Kobi did not ask about the night')
})

// ------------------------------------------------------------ 2001-terrace · the gate opens ---
await run('2001-terrace', [
  { t: 'year.entered', year: 2001, weekday: 6, minute: 16 * 60 }, { t: 'chapter.entered', chapter: '2001-terrace' },
  { t: 'flag.raised', flag: 'own:shopnews:2001-terrace' }, { t: 'moved', to: 'gate5' },
], async (page) => {
  await play(page, ['תפקיד הכנה'])
  await play(page)
  await shot(page, '05-gate5')
  await page.evaluate(() => window.__life.debug.goTo('gate5-stand'))
  await page.waitForTimeout(3000)
  await play(page)
  await shot(page, '06-stand-prep')
  await page.evaluate(() => window.__life.talk('t-task-flags'))
  await page.waitForTimeout(700)
  await play(page)
  await page.evaluate(() => window.__life.talk('t-task-banner'))
  await page.waitForTimeout(700)
  await play(page, ['שבלונה'])
  await play(page)
  // the gate opens by itself once two jobs are done: the room is rebuilt, then Asaf asks
  for (let i = 0; i < 40 && !(await has(page, '[data-life="choice"]')) && !(await has(page, '[data-life="ending"]')); i++) {
    if (await has(page, '[data-life="dialogue"]')) await play(page, [], 4)
    await page.waitForTimeout(1000)
  }
  await shot(page, '07-gate-open')
  await play(page, ['כולנו'])
  for (let i = 0; i < 20 && !(await has(page, '[data-life="ending"]')); i++) await page.waitForTimeout(1000)
  const ending = await q(page, '[data-life="ending"]')
  if (!ending) fault('2001-terrace: no ending after the gate opened')
  else console.log('2001-terrace ending:', ending.slice(0, 80))
})

// ------------------------------------------------------------ 2012-terrace · the test ---
await run('2012-terrace', [
  { t: 'year.entered', year: 2012, weekday: 6, minute: 17 * 60 }, { t: 'chapter.entered', chapter: '2012-terrace' },
  { t: 'flag.raised', flag: 'own:shopnews:2012-terrace' }, { t: 'flag.set', flag: 'life:terrace:credit', value: 'took' }, { t: 'moved', to: 'gate5' },
], async (page) => {
  await play(page)
  await page.evaluate(() => window.__life.debug.goTo('gate5-stand'))
  await page.waitForTimeout(3000)
  await shot(page, '08-yevgeny')
  await page.evaluate(() => window.__life.talk('t-hand'))
  await page.waitForTimeout(700)
  await play(page, ['לתת לו סמכות'])
  await play(page)
  for (let i = 0; i < 30 && !(await has(page, '[data-life="choice"]')); i++) {
    if (await has(page, '[data-life="dialogue"]')) await play(page, [], 4)
    await page.waitForTimeout(1000)
  }
  await play(page, ['לתת לזה לעמוד'])
  for (let i = 0; i < 30 && !(await has(page, '[data-life="ending"]')); i++) {
    if (await has(page, '[data-life="dialogue"]')) await play(page, [], 4)
    await page.waitForTimeout(1000)
  }
  await shot(page, '09-flag-on-wall')
  const ending = await q(page, '[data-life="ending"]')
  if (!ending) fault('2012-terrace: no ending after the test')
  else console.log('2012-terrace ending:', ending.slice(0, 80))
  if (!heard.some((l) => l.includes('ב־2001'))) fault('2012-terrace: 2001 was not remembered')
})

// ------------------------------------------------------------ 1990 · 1993 — a look ---
await run('1990 undercroft', [
  { t: 'year.entered', year: 1990, weekday: 6, minute: 15 * 60 }, { t: 'chapter.entered', chapter: '1990' }, { t: 'flag.raised', flag: 'own:shopnews:1990' }, { t: 'moved', to: 'bloomfield-outside' },
], async (page) => {
  await page.evaluate(() => window.__life.debug.goTo('undercroft'))
  await page.waitForTimeout(3000)
  await shot(page, '10-undercroft')
  await page.evaluate(() => window.__life.talk('uc-radio-1990'))
  await page.waitForTimeout(700)
  await play(page, ['לרוץ לספר'])
  console.log('1990 at:', JSON.stringify(await where(page)))
})

await run('1993 stop', [
  { t: 'year.entered', year: 1993, weekday: 1, minute: 17 * 60 + 50 }, { t: 'chapter.entered', chapter: '1993-cup' }, { t: 'flag.raised', flag: 'own:shopnews:1993-cup' },
  { t: 'flag.raised', flag: 'route:efi' }, { t: 'flag.raised', flag: 'guided:efi' }, { t: 'money.changed', agorot: 3700, why: 'probe' }, { t: 'moved', to: 'ussishkin-outside' },
], async (page) => {
  await play(page, [], 8)
  await page.evaluate(() => window.__life.debug.goTo('bus-stop'))
  await page.waitForTimeout(3000)
  await play(page, [], 6)
  await shot(page, '11-bus-stop')
  await page.evaluate(() => window.__life.talk('bs-phone-1993'))
  await page.waitForTimeout(700)
  await play(page, ['האמת'])
  console.log('1993 at:', JSON.stringify(await where(page)))
})

console.log(heard.join('\n'))
console.log(faults ? `FAIL — ${faults} fault(s)` : 'PASS')
await browser.close()
process.exit(faults ? 1 : 0)
