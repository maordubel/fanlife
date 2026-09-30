// Bible edition 2 — plays `2024-home` end to end in a browser (rule 33: the whole thing, not one screen):
// the rumour and the cork board at the kiosk, Amit's question, the Drive-In and the meeting, the
// ticket (waiting for the arbitrator, then moving it), the night, the ride into the big hall, and
// the ending card at home. Then `2023-quiet` Z05 and `2025-eurocup` Z06/Z07 from seeded saves.
// node scripts/life/home24-probe.mjs [http://127.0.0.1:3100]   (W/H env for size)
import { chromium } from 'playwright'
const BASE = process.argv[2] ?? 'http://127.0.0.1:3100'
const W = Number(process.env.W ?? 390), H = Number(process.env.H ?? 844)
const OUT = 'data/life-shots'
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
      // P0: a ballot arms after the revealing gesture is released (lib/life/inputArm.ts) — wait
      // for the gate, not a clock
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
  await page.waitForSelector('canvas', { timeout: 60000 })
  await page.waitForTimeout(3500)
  try {
    await fn(page)
  } catch (e) {
    fault(`${name}: ${e.message}`)
  }
  await page.close()
}

await run('2024-home', [
  { t: 'year.entered', year: 2024, weekday: 0, minute: 11 * 60 }, { t: 'chapter.entered', chapter: '2024-home' },
  { t: 'flag.raised', flag: 'own:shopnews:2024-home' }, { t: 'flag.set', flag: 'life:relegation:2024:where', value: 'gate' },
  { t: 'flag.raised', flag: 'life:drivein:first-night' }, { t: 'flag.raised', flag: 'life:assembly:asked-venue' }, { t: 'moved', to: 'kiosk' },
], async (page) => {
  await play(page)
  await page.screenshot({ path: `${OUT}/h24-${W}-01-rumor.png` })
  await page.evaluate(() => window.__life.talk('h24-card-1'))
  await page.waitForTimeout(600)
  // cards in order: claim, announced, signed, approved
  for (const col of ['"שמועה"', '"הודעה"', '"חתום"', '"מאושר"']) await play(page, [col], 6)
  await play(page)
  await page.evaluate(() => window.__life.debug.jump(30))
  await page.waitForTimeout(2500)
  await play(page, ['במבנה'])
  await page.screenshot({ path: `${OUT}/h24-${W}-02-kiosk.png` })
  await page.evaluate(() => window.__life.debug.goTo('drive-in'))
  await page.waitForTimeout(2500)
  await play(page)
  await page.evaluate(() => window.__life.debug.jump(20))
  await page.waitForTimeout(2500)
  await play(page, ['ערבות'])
  await page.screenshot({ path: `${OUT}/h24-${W}-03-drivein.png` })
  await page.evaluate(() => window.__life.debug.goTo('home'))
  await page.waitForTimeout(2500)
  await play(page, ['לחכות לבורר'])
  await page.evaluate(() => window.__life.debug.jump(20))
  await page.waitForTimeout(2500)
  await play(page, ['להעביר'])
  await page.evaluate(() => window.__life.debug.jump(20))
  await page.waitForTimeout(2500)
  const r = await play(page, ['ללכת'])
  console.log('2024-home night:', r)
  // the ride: four stops, each plays itself after its autoMs
  for (let i = 0; i < 90 && !(await has(page, '[data-life="ending"]')); i++) {
    if (await has(page, '[data-life="dialogue"]')) await play(page, [], 6)
    await page.waitForTimeout(1000)
    if (i === 12) await page.screenshot({ path: `${OUT}/h24-${W}-04-ride.png` })
  }
  await page.screenshot({ path: `${OUT}/h24-${W}-05-end.png` })
  const ending = await q(page, '[data-life="ending"]')
  if (!ending) fault('2024-home: no ending card after the night')
  else console.log('2024-home ending:', ending.slice(0, 90))
})

await run('2023-quiet Z05', [
  { t: 'year.entered', year: 2023, weekday: 1, minute: 21 * 60 }, { t: 'chapter.entered', chapter: '2023-quiet' },
  { t: 'flag.raised', flag: 'own:shopnews:2023-quiet' }, { t: 'flag.raised', flag: 'z:aid' }, { t: 'moved', to: 'home' },
], async (page) => {
  await page.evaluate(() => window.__life.debug.jump(10))
  await page.waitForTimeout(2500)
  await play(page, ['לשער'])
  await page.screenshot({ path: `${OUT}/h24-${W}-06-z05.png` })
  if (!heard.some((l) => l.includes('אשדוד בבלומפילד'))) fault('Z05: the evening of 11.5 was never asked')
})

await run('2025-eurocup Z06/Z07', [
  { t: 'year.entered', year: 2025, weekday: 5, minute: 21 * 60 + 20 }, { t: 'chapter.entered', chapter: '2025-eurocup' },
  { t: 'flag.raised', flag: 'own:shopnews:2025-eurocup' }, { t: 'flag.set', flag: 'life:menora:2025', value: 'outside' },
  { t: 'flag.set', flag: 'life:ownership:football', value: 'hope-careful' }, { t: 'moved', to: 'home' },
], async (page) => {
  await play(page, ['שיחה קצרה'])
  // the question comes on the clock after the final; give it the minutes it waits for
  for (let i = 0; i < 6 && !heard.some((l) => l.includes('מתנצל') || l.includes('שניהם נכונים')); i++) {
    await page.evaluate(() => window.__life.debug.jump(10))
    await page.waitForTimeout(2500)
    await play(page, ['שניהם נכונים'])
  }
  await page.evaluate(() => window.__life.debug.goTo('kiosk'))
  await page.waitForTimeout(2500)
  await play(page)
  await page.screenshot({ path: `${OUT}/h24-${W}-07-z07.png` })
  if (!heard.some((l) => l.includes('מתנצל') || l.includes('שניהם נכונים'))) fault('Z06: Efi never asked')
  if (!heard.some((l) => l.includes('מותר כבר לשמוח'))) fault('Z07: the summer of 2024 was not remembered')
})

console.log(heard.join('\n'))
console.log(faults ? `FAIL — ${faults} fault(s)` : 'PASS')
await browser.close()
process.exit(faults ? 1 : 0)
