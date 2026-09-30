import { chromium } from 'playwright'

/** הסרטון עצמו — the six beats, in order, with their captions and stamps, unskipped. */
const BASE = process.argv[2] ?? 'http://127.0.0.1:3000'
const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--disable-gpu'] })
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
await ctx.route('**/*', (r) => (r.request().url().startsWith(BASE) || r.request().url().startsWith('data:') ? r.continue() : r.abort()))
const page = await ctx.newPage()
const missing = []
page.on('requestfailed', (r) => { if (r.url().includes('/life/opening') || r.url().includes('/life/art')) missing.push(r.url().split('/').pop()) })
await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('the-worker:life:probe', '1') })
await page.goto(`${BASE}/life`, { waitUntil: 'domcontentloaded' })

const seen = []
for (let i = 0; i < 70; i += 1) {
  await page.waitForTimeout(700)
  const shot = await page.evaluate(() => {
    const wrap = document.querySelector('[data-life="opening"]')
    if (!wrap) return null
    const texts = [...wrap.querySelectorAll('*')].filter((e) => !e.children.length).map((e) => e.textContent?.trim()).filter(Boolean)
    const img = wrap.querySelector('img')
    const vid = wrap.querySelector('video')
    return {
      texts,
      img: img ? img.getAttribute('src') : null,
      imgOk: img ? img.naturalWidth > 0 : null,
      vid: vid ? vid.getAttribute('src') ?? vid.querySelector('source')?.getAttribute('src') ?? null : null,
      vidOk: vid ? vid.readyState >= 2 : null,
      beat: wrap.getAttribute('data-beat'),
    }
  })
  if (!shot) { if (seen.length) break; continue }
  const key = JSON.stringify(shot)
  if (!seen.some((s) => s.key === key)) seen.push({ key, shot })
  if (i % 6 === 5) await page.screenshot({ path: `/tmp/film-${seen.length}.png` })
}
for (const { shot } of seen) {
  console.log(`beat=${shot.beat ?? '?'} img=${(shot.img ?? '—').split('/').pop()} loaded=${shot.imgOk} vid=${(shot.vid ?? '—').split('/').pop()} ready=${shot.vidOk}`)
  for (const t of shot.texts) console.log('   ', t.slice(0, 120))
}
console.log('missing assets:', [...new Set(missing)].join(', ') || 'none')
await browser.close()
