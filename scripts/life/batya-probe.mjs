// בתיה (27.9.2026) — עומדת בחדר על הגוף שלה, ושלושת הרגעים שלה נפתחים: 2006 מחוץ לאוסישקין
// (עם סוקו ליד), 2019 ברחוב עם אילן, 2026 ברחוב לפני בולגריה. צילום לכל אחד.
// node scripts/life/batya-probe.mjs [http://127.0.0.1:3205]   (W/H env for size)
import { chromium } from 'playwright'
const BASE = process.argv[2] ?? 'http://127.0.0.1:3205'
const W = Number(process.env.W ?? 390), H = Number(process.env.H ?? 844)
const OUT = process.env.OUT ?? 'data/life-shots'
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--disable-gpu'] })
const context = await browser.newContext({ viewport: { width: W, height: H }, hasTouch: W < 800, isMobile: W < 800 })
let faults = 0
const fault = (m) => { faults++; console.log('FAULT', m) }
const base = [{ t: 'flag.raised', flag: 'life:opening' }, { t: 'flag.raised', flag: 'prologue:done' }, { t: 'chapter.entered', chapter: '1986' }, { t: 'flag.raised', flag: 'onboard:moved' }, { t: 'flag.raised', flag: 'onboard:acted' }, { t: 'flag.raised', flag: 'onboard:street' }]
const has = (page, sel) => page.evaluate((s) => !!document.querySelector(s), sel)
const q = (page, sel) => page.evaluate((s) => document.querySelector(s)?.textContent?.replace(/\s+/g, ' ').trim() ?? null, sel)

/** read lines, press continue; stop at a ballot (pick=null) or choose the one containing `pick` */
async function drain(page, pick = null, rounds = 30) {
  const heard = []
  for (let i = 0; i < rounds; i++) {
    let choices = await page.$$('[data-life="choice"]')
    if (choices.length) {
      await page.waitForSelector('[data-life="choices"][data-armed="true"]', { timeout: 5000 }).catch(() => {})
      choices = await page.$$('[data-life="choice"]')
      const texts = await Promise.all(choices.map((c) => c.textContent()))
      if (!pick) {
        heard.push(`? ${texts.map((t) => (t ?? '').trim()).join(' | ')}`)
        return heard
      }
      let idx = texts.findIndex((t) => (t ?? '').includes(pick))
      if (idx < 0) idx = 0
      heard.push(`» ${(texts[idx] ?? '').trim()}`)
      await page.waitForTimeout(900)
      await choices[idx].click({ force: true })
      await page.waitForTimeout(700)
      pick = null
      continue
    }
    if (await has(page, '[data-life="dialogue"]')) {
      const line = await q(page, '[data-life="line"]')
      if (line && heard.at(-1) !== line) heard.push(line)
      await page.evaluate(() => window.__life.advance())
      await page.waitForTimeout(350)
      continue
    }
    if (i > 2) break
    await page.waitForTimeout(700)
  }
  return heard
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

const at = (chapter, year, minute, flags, room) => [
  { t: 'year.entered', year, weekday: 6, minute },
  { t: 'chapter.entered', chapter },
  { t: 'flag.raised', flag: `own:shopnews:${chapter}` },
  ...flags.map((flag) => ({ t: 'flag.raised', flag })),
  { t: 'moved', to: room },
]

async function moment(page, label, conversation, pick) {
  await drain(page, null, 6)
  await page.screenshot({ path: `${OUT}/batya-${W}-${label}.png` })
  await page.evaluate((id) => window.__life.talk(id), conversation)
  await page.waitForTimeout(900)
  await page.screenshot({ path: `${OUT}/batya-${W}-${label}-talk.png` })
  const heard = await drain(page, pick)
  await page.waitForTimeout(600)
  await page.screenshot({ path: `${OUT}/batya-${W}-${label}-after.png` })
  console.log(label, heard.join(' / '))
  if (!heard.some((line) => line.includes('»'))) fault(`${label}: no choice was reached in ${conversation}`)
}

await run('2006', at('2006-home', 2006, 20 * 60, ['h:derby', 'h:door'], 'ussishkin-outside'), (page) => moment(page, '2006', 'batya-06', 'המגש'))
await run('2019', at('2019-armchair', 2019, 16 * 60 + 40, ['a:remote', 'a:photo', 'a:saturday'], 'street'), (page) => moment(page, '2019', 'batya-19', 'הסיר'))
await run('2026', at('2026-plan', 2025, 19 * 60 + 30, [], 'street'), (page) => moment(page, '2026', 'batya-26', 'הקופסה'))

await browser.close()
console.log(faults ? `FAIL — ${faults}` : 'PASS')
process.exit(faults ? 1 : 0)
