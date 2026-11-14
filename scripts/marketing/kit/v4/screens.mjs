/** Real screens of FAN LIFE's own games, for the v4 pictures (owner, 14.11.2026: "screenshots from inside our games,
 *  sometimes inside a phone, so people see at a glance that it is worth going in to play").
 *  capture(page, route) loads the route at phone size, closes the ad and cookie layers, and returns a PNG of the
 *  screen; with {play:true} it presses the gate's own start button first, so the shot is the game itself.
 *  CLI (CI only — the workspace cannot reach production): node screens.mjs <outDir> [club…] */
import {mkdirSync, writeFileSync} from 'node:fs'
import path from 'node:path'

export const SITE = process.env.SITE || 'https://fanlife.dubelteam.com'
export const GATE_KEYS = ['xi', 'trivia', 'lineup', 'kit-builder', 'kits', 'memory', 'polls', 'goal', 'royal-rumble', 'blind-cow', 'derby', 'archive', 'timeline']
/** a kit's gate name → its route key */
export const GATE_ROUTE = {'ALL-TIME XI': 'xi', 'TRIVIA WING': 'trivia', 'HISTORICAL LINE-UP': 'lineup', 'KIT BUILDER': 'kit-builder', 'SHIRT COLLECTION': 'kits', MEMORY: 'memory',
  'TERRACE VOTE': 'polls', 'GOAL RECONSTRUCTION': 'goal', 'ROYAL RUMBLE': 'royal-rumble', 'BLIND COW': 'blind-cow', 'THE DERBY': 'derby', 'LIVING ARCHIVE': 'archive', TIMELINE: 'timeline'}

const QUIET = `
  [class*="ad-slot"],[class*="adslot"],[id*="google_ads"],ins.adsbygoogle,[aria-label="Advertisement"],[data-ad],.fc-consent-root,#cookie,[class*="cookie"],[class*="consent"]{display:none!important}
  *{animation-duration:0s!important;transition-duration:0s!important;caret-color:transparent!important}`

export async function capture(page, route, {play = false, scroll = 0} = {}) {
  await page.goto(SITE + route, {waitUntil: 'domcontentloaded', timeout: 30000}).catch(() => {})
  await page.waitForLoadState('load', {timeout: 8000}).catch(() => {})
  await page.waitForTimeout(1500)
  await page.addStyleTag({content: QUIET}).catch(() => {})
  // the small floating ad card and its ✕, if the page drew one
  await page.evaluate(() => document.querySelectorAll('[class*="ad"] button, [aria-label*="lose ad" i]').forEach(b => b.closest('[class*="ad"]')?.remove())).catch(() => {})
  // the gate's "How to play" sheet opens over the game: close it, the game itself is the shot
  for (let i = 0; i < 2; i++) { const c = page.getByRole('button', {name: /^close$/i}).first(); if (await c.isVisible().catch(() => false)) { await c.click().catch(() => {}); await page.waitForTimeout(700) } }
  if (play) {
    const go = page.getByRole('button', {name: /^(kick off|start|play|let'?s go|deal|spin)/i}).first()
    if (await go.isVisible().catch(() => false)) { await go.click().catch(() => {}); await page.waitForTimeout(1800) }
  }
  if (scroll) { await page.evaluate(y => window.scrollTo(0, y), scroll); await page.waitForTimeout(400) }
  await page.waitForTimeout(600)
  return page.screenshot({type: 'png'})
}

export async function phonePage(browser) {
  const ctx = await browser.newContext({viewport: {width: 390, height: 844}, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'en-GB'})
  await ctx.addCookies([{name: 'fl_consent', value: 'essential', url: SITE}]).catch(() => {})
  return ctx.newPage()
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const {chromium} = await import('playwright')
  const out = process.argv[2] || 'screens'
  const clubs = process.argv.slice(3).length ? process.argv.slice(3) : ['olympiacos', 'celtic', 'aek-athens']
  mkdirSync(out, {recursive: true})
  const browser = await chromium.launch()
  const page = await phonePage(browser)
  const shots = [['hub-today', '/today'], ['hub-our-games', '/our-games'], ['legends', '/all-football/legends'], ['legends-play', '/all-football/legends', true]]
  for (const c of clubs) {
    shots.push([`${c}-home`, `/clubs/${c}`])
    for (const g of GATE_KEYS) shots.push([`${c}-${g}-play`, `/clubs/${c}/${g}`, true])
  }
  for (const [name, route, play] of shots) {
    try { writeFileSync(path.join(out, name + '.png'), await capture(page, route, {play})); console.log('ok', name) } catch (e) { console.log('miss', name, String(e?.message || e).slice(0, 120)) }
  }
  await browser.close()
}
