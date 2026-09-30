/**
 * צילום חדר אמיתי בטלפון — a phone screenshot of a WORLD room, not the prologue.
 *
 *   node scripts/life/room-shot-2026-09-16.mjs http://127.0.0.1:3000 street kiosk home
 *
 * Every earlier phone shot in this session was taken by walking from the start, and every
 * one of them was the PROLOGUE: `snapshot().state.location` said `prologue` the moment it
 * was finally asked. That cost an hour of diagnosing a camera that was not broken. This
 * seeds the save straight into a room the way `_route.mjs` does, then asserts the location
 * BEFORE it takes the picture, and prints where each shot actually is.
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = process.argv[2] ?? 'http://127.0.0.1:3000'
const ROOMS = process.argv.slice(3).length ? process.argv.slice(3) : ['street']
const OUT = process.env.SHOT_OUT ?? 'docs/life-shots'
mkdirSync(OUT, { recursive: true })

const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
for (const room of ROOMS) {
  const W = Number(process.env.SHOT_W ?? 360), H = Number(process.env.SHOT_H ?? 740)
  const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, isMobile: W < 700, hasTouch: W < 700 })
  const p = await ctx.newPage()
  await p.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
  await p.evaluate((where) => {
    const events = [
      { t: 'flag.raised', flag: 'life:opening' }, { t: 'flag.raised', flag: 'prologue:done' },
      { t: 'chapter.entered', chapter: '1986' }, { t: 'moved', to: where },
      { t: 'flag.raised', flag: 'onboard:street' }, { t: 'flag.raised', flag: 'onboard:moved' },
      { t: 'flag.raised', flag: 'onboard:acted' },
    ]
    localStorage.setItem('the-worker:life:probe', '1')
    localStorage.setItem('the-worker:life:deck', '1')
    localStorage.setItem('the-worker:life', JSON.stringify({
      version: 3, identity: { name: 'פוגי', sex: 'boy', birthYear: 1978 },
      year: 1986, events, savedAt: new Date().toISOString(),
    }))
  }, room)
  await p.goto(`${BASE}/life`, { waitUntil: 'domcontentloaded' })
  await p.waitForSelector('canvas')
  await p.waitForTimeout(6500)
  // A room may open on a card — the arrival stamp, the new-shirt rail, a toast. They are
  // real and they are not the room, so they are dismissed before the picture is taken.
  for (let i = 0; i < 6; i++) {
    const closed = await p.evaluate(() => {
      const hit = document.querySelector('[data-life="shirt-card"], [data-life="card"], [data-life="continue"], [data-life="reveal"]')
      if (hit) { hit.dispatchEvent(new MouseEvent('click', { bubbles: true })); return true }
      return false
    })
    if (!closed) break
    await p.waitForTimeout(700)
  }
  // NOT a blind click. A tap at the top of the glass opens `GaugesSheet` — the numbers
  // screen — and the first version of this probe photographed that instead of the room.
  await p.waitForTimeout(900)
  const at = await p.evaluate(() => window.__life?.snapshot?.()?.state?.location ?? '?')
  await p.screenshot({ path: `${OUT}/room-${room}-${W}x${H}.png` })
  console.log(`${room.padEnd(20)} -> location=${at}  ${at === room ? 'OK' : 'MISMATCH'}  ${OUT}/room-${room}-${W}x${H}.png`)
  await ctx.close()
}
await b.close()
