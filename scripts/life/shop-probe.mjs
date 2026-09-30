/**
 * החנות — a screenshot of the room, from the game, at the size a player sees it.
 *
 *   node scripts/life/shop-probe.mjs [http://127.0.0.1:3000]
 *
 * A room that was measured off a door and never looked at is a room measured off a guess.
 */
import { chromium } from 'playwright'
const BASE = process.argv[2] ?? 'http://127.0.0.1:3000'
const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
const p = await b.newPage({ viewport: { width: 1000, height: 640 } })
p.on('pageerror', (e) => console.log('PAGEERROR', String(e).slice(0, 180)))
for (const [where, chapter] of [['fan-shop', '1993-cup'], ['kiosk', '1990'], ['street', '1986']]) {
  await p.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
  await p.evaluate(([where, chapter]) => {
    const events = [
      { t: 'flag.raised', flag: 'life:opening' }, { t: 'flag.raised', flag: 'prologue:done' },
      { t: 'chapter.entered', chapter }, { t: 'moved', to: where },
      { t: 'flag.raised', flag: 'onboard:street' }, { t: 'flag.raised', flag: 'onboard:moved' },
      { t: 'flag.raised', flag: 'onboard:acted' }, { t: 'flag.raised', flag: 'saw:road' },
      { t: 'flag.raised', flag: 'saw:reveal' }, { t: 'flag.raised', flag: 'life:knows:hall' },
    ]
    localStorage.setItem('the-worker:life:probe', '1')
    localStorage.setItem('the-worker:life', JSON.stringify({ version: 3, identity: { name: 'פוגי', sex: 'boy', birthYear: 1978 }, year: 1993, events, savedAt: new Date().toISOString() }))
  }, [where, chapter])
  await p.goto(`${BASE}/life`, { waitUntil: 'domcontentloaded' })
  await p.waitForSelector('canvas', { timeout: 20000 })
  await p.waitForTimeout(3200)
  await p.screenshot({ path: `data/life-shots/room-${where}.png` })
  console.log(where, JSON.stringify(await p.evaluate(() => window.__life?.debug.where())))
}
await b.close()
