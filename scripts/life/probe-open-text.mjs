import { chromium } from 'playwright'

/**
 * מה כתוב על המסך — every word a new player reads, in order, from the first frame.
 *
 * Maor, 6.9.2026: *"לאחר הסרטון יש טקסט, שהוא לא נכון, כי הוא כבר מספר על האליפות ב-86."*
 * A description of a screen is not a screen, so this reads the actual text off the glass
 * at every step of a brand-new game and prints it, with the year each line names.
 */
const BASE = process.argv[2] ?? 'http://127.0.0.1:3000'
const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--disable-gpu'] })
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
await ctx.route('**/*', (r) => (r.request().url().startsWith(BASE) || r.request().url().startsWith('data:') ? r.continue() : r.abort()))
const page = await ctx.newPage()
await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('the-worker:life:probe', '1') })
await page.goto(`${BASE}/life`, { waitUntil: 'domcontentloaded' })

const read = () => page.evaluate(() => {
  const out = []
  const seen = new Set()
  for (const el of document.querySelectorAll('body *')) {
    if (el.children.length) continue
    const t = el.textContent?.replace(/\s+/g, ' ').trim()
    if (!t || t.length < 2 || seen.has(t)) continue
    const r = el.getBoundingClientRect()
    if (r.width < 2 || r.height < 2) continue
    seen.add(t)
    out.push(t)
  }
  return out
})

const log = []
for (let step = 0; step < 34; step += 1) {
  await page.waitForTimeout(1200)
  const lines = await read()
  for (const line of lines) if (!log.includes(line)) log.push(line)
  const skip = await page.$('[data-life="opening-skip"]')
  if (skip) { await skip.click({ timeout: 1500 }).catch(() => {}); continue }
  const choice = await page.evaluate(() => document.querySelector('[data-life="choice"]')?.getAttribute('data-choice') ?? null)
  if (choice) { await page.evaluate((id) => window.__life?.choose(id), choice); continue }
  await page.evaluate(() => window.__life?.advance())
  const where = await page.evaluate(() => window.__life?.debug?.where?.() ?? null)
  if (where?.scene && where.scene !== 'prologue') break
}

console.log('--- every line a new player reads ---')
for (const line of log) {
  const years = [...new Set([...line.matchAll(/\b(19|20)\d{2}\b/g)].map((m) => m[0]))]
  const flag = years.some((y) => Number(y) > 1984) ? '  ← מאוחר מדי' : ''
  console.log(`${years.length ? '[' + years.join(',') + '] ' : '      '}${line.slice(0, 120)}${flag}`)
}
await browser.close()
