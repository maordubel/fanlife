/**
 * What he made, in the rooms: street, bedroom and stand for a club, with and without the artefacts.
 *   npx tsx scripts/life/artefact-shots.ts http://127.0.0.1:3330 /tmp/out [club,club]
 */
import {chromium} from 'playwright'
import {mkdirSync} from 'node:fs'
import {ROOMS} from '../../lib/life/universal/rooms'
import {artefactOf, worldArtefacts} from '../../lib/life/universal/artefacts'
import {emptyState} from '../../lib/life/universal/engine'

const base = process.argv[2] || 'http://127.0.0.1:3330', out = process.argv[3] || '/tmp/artefact-shots'
const clubs = (process.argv[4] || 'olympiacos,hapoel-tel-aviv').split(',')
mkdirSync(out, {recursive: true})
const made = worldArtefacts({...emptyState(), flags: {'life:banner:stroke': 'kept', 'life:master:F12:item': 'box'},
  made: {car: artefactOf('wash-car', 'good', 'F10', 10)!, scarf: artefactOf('stitch-scarf', 'good', 'F12', 12)!}})

async function main() {
  const browser = await chromium.launch({executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']})
  const errors: string[] = []
  const rooms = (process.env.ROOMS || 'street,bedroom,terrace').split(',')
  for (const club of clubs) for (const id of rooms) for (const withIt of [false, true]) {
    // a fresh page per picture: swiftshader runs out of room after a few stadiums
    const ctx = await browser.newContext({viewport: {width: 960, height: 600}, deviceScaleFactor: 1}), page = await ctx.newPage()
    page.on('pageerror', e => errors.push(e.message))
    await page.goto(`${base}/life/town/play.html?play=1&q=${process.env.Q || 'low'}&capture=1`, {waitUntil: 'load'})
    await page.waitForFunction(() => (window as unknown as {__ready?: boolean}).__ready, null, {timeout: 180000})
    const room = ROOMS[id as keyof typeof ROOMS]!
    const spawn = Object.values(room.spawns)[0]
    const cfg = {room: id, club, time: 'day', floorY: room.floorY, walk: room.walk, viewH: room.viewH, surface: room.surface, spawn,
      frame: {top: 0.84, bottom: -0.72}, player: {h: 4.6, shirt: '#5a7a9a', pants: '#3a4560'}, blocks: room.blocks, clear: room.clear,
      actors: [], spots: Object.entries(room.spots).map(([sid, s]) => ({id: sid, ...s})), exits: Object.entries(room.doors).map(([did, d]) => ({id: did, ...d})),
      made: withIt ? made : []}
    const drawn = await page.evaluate(c => { const w = window as unknown as {__vxPlay: {enter(c: unknown): boolean}; __artefacts?: {drawn: number}}; w.__artefacts = undefined; w.__vxPlay.enter(c); return w.__artefacts?.drawn ?? 0 }, cfg)
    await page.waitForTimeout(1500)
    const file = `${out}/${club}-${id}-${withIt ? 'with' : 'without'}.png`
    await page.screenshot({path: file, timeout: 180000})
    console.log(file, 'drawn', drawn)
    await ctx.close()
  }
  await browser.close()
  console.log(errors.length ? 'ERRORS ' + errors.join(' | ') : 'no page errors')
}
main().catch(e => { console.error(e); process.exit(1) })
