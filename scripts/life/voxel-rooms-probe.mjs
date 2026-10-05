// Builds every voxel room in the lab for the given clubs and times, reports page errors, and
// (optionally) photographs each one. The acceptance script for the voxel kit:
//   node scripts/life/voxel-rooms-probe.mjs http://127.0.0.1:3200 [--shots=/tmp/vx] [--clubs=a,b] [--rooms=x,y] [--times=day,night] [--mobile]
import {chromium} from 'playwright'
import {mkdirSync} from 'node:fs'

const base = process.argv[2] || 'http://127.0.0.1:3200'
const arg = name => (process.argv.find(a => a.startsWith(`--${name}=`)) || '').split('=')[1]
const shots = arg('shots'), only = arg('rooms')?.split(','), times = (arg('times') || 'day').split(','), mobile = process.argv.includes('--mobile')
if (shots) mkdirSync(shots, {recursive: true})
const browser = await chromium.launch({executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']})
const context = await browser.newContext(mobile ? {viewport: {width: 390, height: 844}, isMobile: true, hasTouch: true, deviceScaleFactor: 1} : {viewport: {width: 1100, height: 640}})
const page = await context.newPage()
const pageErrors = []
page.on('pageerror', e => pageErrors.push(e.message))
await page.goto(`${base}/life/voxel/lab.html?q=high`, {waitUntil: 'load'})
await page.waitForFunction(() => window.__ready, null, {timeout: 120000})
const {rooms, clubs} = await page.evaluate(() => ({rooms: window.__vxOrder, clubs: Object.keys(window.__vx.SK).filter(id => id !== 'club')}))
const wanted = (arg('clubs')?.split(',') || clubs.slice(0, 1)).filter(c => clubs.includes(c))
const bad = []
for (const club of wanted) for (const time of times) for (const id of rooms) {
  if (only && !only.includes(id)) continue
  const errors = await page.evaluate(([club, time, id]) => {
    window.__err.length = 0
    try { __lab.st.club = club; __lab.st.time = time; __vxGo(id) } catch (e) { window.__err.push(String(e && e.stack || e)) }
    return window.__err.slice()
  }, [club, time, id])
  await page.waitForTimeout(shots ? 650 : 60)
  const late = await page.evaluate(() => window.__err.slice())
  const all = [...new Set([...errors, ...late])]
  if (shots) await page.screenshot({path: `${shots}/${club}-${time}-${id}.png`})
  if (all.length) { bad.push(`${club}/${time}/${id}: ${all[0].slice(0, 240)}`); console.log('ERR', club, time, id, all[0].slice(0, 240)) }
}
console.log(`${wanted.length} club(s) × ${times.length} time(s) × ${only ? only.length : rooms.length} room(s) — ${bad.length} failed, ${pageErrors.length} page errors`)
await browser.close()
if (bad.length || pageErrors.length) { console.log(pageErrors.join('\n')); process.exit(1) }
