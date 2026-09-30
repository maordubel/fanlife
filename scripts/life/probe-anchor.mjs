import { chromium } from 'playwright'

/**
 * העובדה היחידה בפרולוג — is the 1983 line about 1983?
 *
 * `{anchor}` resolves from the era of the chapter being played, and the prologue had no
 * era, so it fell through to 1986 and printed the 1985/86 championship over a State Cup
 * final on 1 June 1983. This reads the line off the glass and says which year it names.
 */
const BASE = process.argv[2] ?? 'http://127.0.0.1:3000'
const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--disable-gpu'] })
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
await ctx.route('**/*', (r) => (r.request().url().startsWith(BASE) || r.request().url().startsWith('data:') ? r.continue() : r.abort()))
const page = await ctx.newPage()
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
await page.waitForTimeout(2000)

const seen = []
for (let i = 0; i < 40; i += 1) {
  const box = await page.evaluate(() => ({
    text: document.querySelector('[data-life="dialogue"]')?.textContent?.replace(/\s+/g, ' ').trim() ?? null,
    choices: [...document.querySelectorAll('[data-life="choice"]')].map((b) => b.getAttribute('data-choice')),
    scene: window.__life?.debug?.where?.()?.scene ?? null,
  }))
  if (box.scene && box.scene !== 'prologue') break
  if (box.text) seen.push(box.text)
  if (box.choices.length) await page.evaluate((id) => window.__life?.choose(id), box.choices[0])
  else await page.evaluate(() => window.__life?.advance())
  await page.waitForTimeout(300)
}
const all = seen.join(' | ')
const years = [...new Set([...all.matchAll(/\b(19|20)\d{2}\b/g)].map((m) => m[0]))]
console.log('years named in the prologue:', years.join(', ') || 'none')
console.log('mentions 1983:', all.includes('1983'))
console.log('mentions 1986 or 85/86:', all.includes('1986') || all.includes('85/86') || all.includes('1985/86'))
const line = seen.find((t) => /גביע|אליפות|הפועל/.test(t))
console.log('the factual line:', line ? line.slice(0, 160) : '(not seen)')
await browser.close()
