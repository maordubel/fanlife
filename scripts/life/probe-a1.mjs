import { chromium } from 'playwright'

/**
 * 1 ביוני 1983 — the first memory, played rather than read.
 *
 * A new life, no seed, no skip: through the opening film and into the terrace, then take
 * every choice the five-year-old is offered and photograph what he sees. It prints the
 * branch it walked and what the boy came out of it with, so the three shapes of child the
 * prologue can produce are visible rather than asserted.
 */
const BASE = process.argv[2] ?? 'http://127.0.0.1:3000'
const PATH = (process.argv[3] ?? 'look-floor,take,reach').split(',')
const browser = await chromium.launch({
  executablePath: process.env.PW_CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox', '--disable-gpu'],
})
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
await context.route('**/*', (r) => (r.request().url().startsWith(BASE) || r.request().url().startsWith('data:') ? r.continue() : r.abort()))
const page = await context.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(e.message.slice(0, 160)))

await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('the-worker:life:probe', '1') })
await page.goto(`${BASE}/life`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(3500)
for (let i = 0; i < 14; i += 1) {
  const skip = await page.$('[data-life="opening-skip"]')
  if (!skip) break
  await skip.click({ timeout: 2000 }).catch(() => {})
  await page.waitForTimeout(900)
}
await page.waitForSelector('canvas', { timeout: 30000 }).catch(() => {})
await page.waitForTimeout(2500)
await page.screenshot({ path: '/tmp/a1-open.png' })

const readBox = () => page.evaluate(() => ({
  text: document.querySelector('[data-life="dialogue"]')?.textContent?.replace(/\s+/g, ' ').trim().slice(0, 120) ?? null,
  choices: [...document.querySelectorAll('[data-life="choice"]')].map((b) => b.getAttribute('data-choice')),
  scene: window.__life?.debug?.where?.()?.scene ?? null,
}))

const walked = []
for (let i = 0; i < 60; i += 1) {
  const box = await readBox()
  if (box.scene && box.scene !== 'prologue') break
  if (box.choices.length) {
    const want = PATH.find((id) => box.choices.includes(id)) ?? box.choices[0]
    walked.push(want)
    if (walked.length === 1) await page.screenshot({ path: '/tmp/a1-choice.png' })
    await page.evaluate((id) => window.__life?.choose(id), want)
  } else {
    await page.evaluate(() => window.__life?.advance())
  }
  await page.waitForTimeout(320)
}
await page.waitForTimeout(2500)
const out = await page.evaluate(() => {
  const s = window.__life?.snapshot?.()
  return {
    scene: window.__life?.debug?.where?.()?.scene ?? null,
    chapter: s?.state?.chapter ?? null,
    flags: Object.keys(s?.state?.flags ?? {}).filter((f) => f.startsWith('a1:')),
    items: s?.state?.items ?? null,
    redHeart: s?.state?.redHeart ?? null,
  }
})
await page.screenshot({ path: '/tmp/a1-after.png' })
console.log('walked:', walked.join(' → '))
console.log(JSON.stringify(out, null, 1))
console.log('errors:', errors.length ? errors : 'none')
await browser.close()
