// A4 · the counter and the gift (delta 93): seeds a boy at Rafi's with thirty, buys, and
// shoots the man at the door and the card. node scripts/life/a4-gift-probe.mjs (server on :3100; W=1440 H=900 for desktop)
import { chromium } from 'playwright'
const BASE = 'http://127.0.0.1:3100'
const W = Number(process.env.W ?? 390), H = Number(process.env.H ?? 844)
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--disable-gpu'] })
const context = await browser.newContext({ viewport: { width: W, height: H }, hasTouch: W < 800, isMobile: W < 800 })
const page = await context.newPage()
page.on('pageerror', (e) => console.log('PAGEERROR', e.message))
await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
await page.evaluate(() => {
  const base = [{ t: 'flag.raised', flag: 'life:opening' }, { t: 'flag.raised', flag: 'prologue:done' }, { t: 'chapter.entered', chapter: '1986' }, { t: 'flag.raised', flag: 'onboard:moved' }, { t: 'flag.raised', flag: 'onboard:acted' }, { t: 'flag.raised', flag: 'onboard:street' },
    { t: 'year.entered', year: 1985, weekday: 0, minute: 16 * 60 }, { t: 'chapter.entered', chapter: 'a4-shirt' }, { t: 'flag.raised', flag: 'life:a:d4' }, { t: 'flag.raised', flag: 'a4:tin' }, { t: 'flag.raised', flag: 'a4:wallet-seen' }, { t: 'flag.raised', flag: 'cast:kobi' }, { t: 'flag.raised', flag: 'own:shopnews:a4-shirt' }, { t: 'money.changed', agorot: 3150, why: 'seed' }, { t: 'moved', to: 'kiosk' }]
  localStorage.setItem('the-worker:life', JSON.stringify({ version: 3, identity: { name: 'פוגי', sex: 'boy', birthYear: 1978 }, year: 1986, events: base, savedAt: new Date().toISOString() }))
  localStorage.setItem('the-worker:life:probe', '1')
})
await page.goto(`${BASE}/life`, { waitUntil: 'domcontentloaded' })
await page.waitForSelector('canvas'); await page.waitForTimeout(3500)
await page.screenshot({ path: `data/life-shots/d93-a4-${W}-0-kiosk.png` })
await page.evaluate(() => window.__life.talk('rafi-a4')); await page.waitForTimeout(800)
await page.screenshot({ path: `data/life-shots/d93-a4-${W}-1-ask.png` })
await page.evaluate(() => { const li = document.querySelector('[data-life="choice"][data-choice="buy"]'); li?.querySelector('button')?.click() })
for (let i = 0; i < 40; i++) {
  await page.waitForTimeout(450)
  const st = await page.evaluate(() => ({ d: document.querySelector('[data-life="dialogue"]')?.textContent?.slice(0, 60) ?? null, cast: !!document.querySelector('[data-life^="cast"]'), end: !!document.querySelector('[data-life="ending"]'), agorot: window.__life?.snapshot?.().state?.agorot }))
  if (i % 3 === 0 || st.end) { await page.screenshot({ path: `data/life-shots/d93-a4-${W}-s${String(i).padStart(2, '0')}.png` }); console.log(i, JSON.stringify(st)) }
  if (st.end) break
  if (st.cast) { await page.locator('[data-life="cast-card"]').click().catch(() => {}); continue }
  if (st.d) await page.evaluate(() => window.__life.advance())
}
await page.waitForTimeout(1800)
await page.screenshot({ path: `data/life-shots/d93-a4-${W}-card.png` })
await browser.close()
