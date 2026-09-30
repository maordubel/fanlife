/**
 * הדלת של השחקן — ☰ → המסלולים → הכרטיס, בדפדפן אמיתי.
 *
 *   node scripts/life/routes-probe-2026-09-16.mjs http://127.0.0.1:3517
 *
 * The routes card and the achievement queue were mounted in `app/life/LifeStage.tsx` and a
 * mount that typechecks is not a mount that draws. Rule 33's whole lesson is that this
 * class of defect — a card under the tab bar, a button whose tap lands somewhere else —
 * is only ever found by pressing the thing in a browser.
 *
 * So this seeds an ADULT life (the menu row is gated on `routesWorthShowing`, which is
 * false for a child on purpose), opens the menu, presses המסלולים, and asserts three
 * separate facts about what came back: the row exists, the dialog opened, and it is the
 * dialog we meant rather than whatever else lives at that z-index.
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = process.argv[2] ?? 'http://127.0.0.1:3517'
const OUT = process.env.SHOT_OUT ?? 'docs/life-shots'
mkdirSync(OUT, { recursive: true })

const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
const W = Number(process.env.SHOT_W ?? 390), H = Number(process.env.SHOT_H ?? 844)
const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
const p = await ctx.newPage()
const errors = []
p.on('pageerror', (e) => errors.push(String(e)))

await p.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
await p.evaluate(() => {
  localStorage.setItem('the-worker:life:probe', '1')
  localStorage.setItem('the-worker:life', JSON.stringify({
    version: 3, identity: { name: 'פוגי', sex: 'boy', birthYear: 1978 },
    year: 1999,
    events: [
      { t: 'flag.raised', flag: 'life:opening' }, { t: 'flag.raised', flag: 'prologue:done' },
      { t: 'chapter.entered', chapter: '1999-cup' }, { t: 'moved', to: 'street' },
      { t: 'flag.raised', flag: 'onboard:street' }, { t: 'flag.raised', flag: 'onboard:moved' },
      { t: 'flag.raised', flag: 'onboard:acted' },
      // enough of a life that at least one route has something to say
      { t: 'skill.changed', skill: 'organization', delta: 40, why: 'probe' },
      { t: 'reputation.earned', proofId: 'probe-1', audience: 'gate5', delta: 5, why: 'probe' },
      { t: 'reputation.heard', proofId: 'probe-1' },
    ],
    savedAt: new Date().toISOString(),
  }))
})
await p.goto(`${BASE}/life`, { waitUntil: 'domcontentloaded' })
await p.waitForSelector('canvas')
await p.waitForTimeout(7000)
/**
 * A chapter opens on up to FOUR cards now — the new shirts, the new album sets, "המנוי
 * יצא למכירה" and, from this delta, a route offer. They are the game working, and they
 * are not what this probe is about, so they are cleared first. A card with no
 * `data-life` handle of its own is dismissed by its LAST button, which is the one every
 * one of these draws as its way out.
 */
for (let i = 0; i < 12; i++) {
  const closed = await p.evaluate(() => {
    const direct = document.querySelector('[data-life="shirt-card"], [data-life="card"], [data-life="continue"], [data-life="reveal"], [data-life="achievement-close"]')
    if (direct) { direct.dispatchEvent(new MouseEvent('click', { bubbles: true })); return 'direct' }
    const sheet = document.querySelector('[data-life="season-ticket"], [data-life="route"]')
    if (sheet) {
      const buttons = [...sheet.querySelectorAll('button')]
      const out = buttons[buttons.length - 1]
      if (out) { out.click(); return 'sheet' }
    }
    return null
  })
  if (!closed) break
  await p.waitForTimeout(700)
}

await p.click('[data-life="menu-open"]')
await p.waitForTimeout(600)
const hasRow = await p.$('[data-life="menu-routes"]')
console.log(`menu row     : ${hasRow ? 'present' : 'MISSING'}`)
await p.screenshot({ path: `${OUT}/routes-menu-${W}x${H}.png` })
if (!hasRow) { console.log('no row — nothing to press'); await ctx.close(); await b.close(); process.exit(1) }

await p.click('[data-life="menu-routes"]')
await p.waitForTimeout(900)
const card = await p.evaluate(() => {
  const node = document.querySelector('[data-life="route"]')
  if (!node) return null
  const box = node.getBoundingClientRect()
  const z = Number(getComputedStyle(node).zIndex)
  const buttons = [...node.querySelectorAll('button')].map((b) => ({
    text: (b.textContent ?? '').trim(),
    h: Math.round(b.getBoundingClientRect().height),
  }))
  return { modal: node.getAttribute('aria-modal'), z, top: Math.round(box.top), h: Math.round(box.height), buttons, heading: node.querySelector('h2')?.textContent ?? '' }
})
console.log('route card   :', JSON.stringify(card, null, 1))
await p.screenshot({ path: `${OUT}/routes-card-${W}x${H}.png` })
console.log(`page errors  : ${errors.length}${errors.length ? ' — ' + errors.join(' | ') : ''}`)


/**
 * ...ואז ההישג, שהוא הדבר השני שהודבק לזכוכית הזאת.
 *
 * `earnedNow` runs on DISPATCH and not on load, deliberately — a save that already
 * qualifies must not announce a life it has been living for six chapters. So the only
 * way to see the queue is to make something true while the game is running, which is
 * what this does: `ACH_FIRST` needs `prologue:done` (already in the save) plus
 * `life:a1:father`, and raising the second one is one dispatch.
 */
await p.evaluate(() => {
  const node = document.querySelector('[data-life="route"]')
  const buttons = node ? [...node.querySelectorAll('button')] : []
  buttons[buttons.length - 1]?.click()
})
await p.waitForTimeout(500)
await p.evaluate(() => window.__life?.debug?.raise?.('life:a1:father'))
await p.waitForTimeout(1200)
const ach = await p.evaluate(() => {
  const node = document.querySelector('[data-life="achievement-card"]')
  if (!node) return null
  const z = Number(getComputedStyle(node).zIndex)
  return { z, title: node.querySelector('h2, h3')?.textContent ?? '', text: (node.textContent ?? '').slice(0, 120) }
})
console.log('achievement  :', JSON.stringify(ach))
await p.screenshot({ path: `${OUT}/routes-ach-${W}x${H}.png` })

await ctx.close()
await b.close()
if (!card || card.z < 60 || card.buttons.length === 0 || errors.length) process.exit(1)
console.log('OK')
