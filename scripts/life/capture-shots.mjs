/**
 * LIFE · TOWN — photograph the chapter shots (public/life/town/shots.js) for every club into
 * public/life/town/shots/<club>/<shot>.webp. The reel shows them; a club or shot without a file falls back
 * to the code-drawn card. Needs a running server (default http://127.0.0.1:3300) and Playwright's Chromium.
 *
 *   node scripts/life/capture-shots.mjs [base] [club,club,…]
 *
 * Each still is measured afterwards by scripts/life/shots-measure.py (yellow for Hapoel, rule 8).
 */
import {chromium} from 'playwright'
import {mkdirSync, readdirSync, existsSync, writeFileSync} from 'node:fs'

const base = process.argv[2] || 'http://127.0.0.1:3300'
const clubs = (process.argv[3] || readdirSync('club-packs').filter(d => existsSync(`club-packs/${d}/core.json`) || existsSync(`club-packs/${d}/life`)).join(',')).split(',')
const SHOTS = {scarf: 'bedroom', ticket: 'ticket-office', tunnel: 'tunnel', stand: 'curva'}
const exe = process.env.CHROMIUM || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const errs = []
// one browser per still: a software-GL page is heavy, and a crash costs one shot, not the run. Shots already
// on disk are kept, so the script can simply be run again.
for (const club of clubs) {
  mkdirSync(`public/life/town/shots/${club}`, {recursive: true})
  for (const [shot, room] of Object.entries(SHOTS)) {
    const file = `public/life/town/shots/${club}/${shot}`
    if (existsSync(`${file}.png`) || existsSync(`${file}.webp`)) continue
    for (let attempt = 0; attempt < 3; attempt++) {
      const b = await chromium.launch({executablePath: existsSync(exe) ? exe : undefined, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']})
      try {
        const p = await b.newPage({viewport: {width: 1280, height: 720}})
        p.on('pageerror', e => errs.push(e.message))
        await p.goto(`${base}/life/town/play.html?room=${room}&club=${club}&time=night&q=${process.env.Q || 'high'}&capture=1&shot=${shot}`, {waitUntil: 'load', timeout: 180000})
        await p.waitForFunction(() => window.__SHOT && window.__SHOT.staged, null, {timeout: 180000})
        await p.waitForTimeout(5000)
        const url = await p.evaluate(() => document.querySelector('canvas').toDataURL('image/png'))
        writeFileSync(`${file}.png`, Buffer.from(url.split(',')[1], 'base64'))
        console.log(club, shot)
        break
      } catch (e) { console.log(club, shot, 'retry', String(e.message).split('\n')[0]) } finally { await b.close().catch(() => {}) }
    }
  }
}
if (errs.length) console.log('page errors:', JSON.stringify(errs.slice(0, 5)))
