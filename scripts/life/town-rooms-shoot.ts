/**
 * TOWN · every room, photographed. Opens each room in ROOMS (desktop 1280×800, and the main rooms at 390×844),
 * day and night, and writes PNGs for a human to look at. Fails only on page errors.
 *
 *   npx tsx scripts/life/town-rooms-shoot.ts http://127.0.0.1:3200 /tmp/rooms/after [room,room] [club]
 */
import {chromium, type Page} from 'playwright'
import {mkdirSync} from 'node:fs'
import {ROOMS} from '../../lib/life/universal/rooms'

const base = process.argv[2] || 'http://127.0.0.1:3200'
const out = process.argv[3] || '/tmp/rooms/shots'
const only = process.argv[4] && process.argv[4] !== '-' ? process.argv[4].split(',') : null
const club = process.argv[5] || 'hapoel-tel-aviv'
const MOBILE = ['room', 'bedroom', 'kitchen', 'street', 'pitch', 'bus-stop', 'classroom', 'community-room', 'gate', 'gate5-stand', 'undercroft', 'ussishkin-hall']
const NIGHT = ['room', 'kitchen', 'street', 'route', 'gate', 'gate5-stand', 'hatikva', 'bus-stop', 'ussishkin-outside', 'arena-out', 'away-end']
mkdirSync(out, {recursive: true})

type W = {__ready?: boolean; __err: string[]; __vxPlay: {enter(c: unknown): boolean}}

const GENERIC = {floorY: 0, walk: [1, 1, 23, 13], viewH: 9, surface: 'tile', spawns: {a: {x: 12, z: 9}}, slots: {}, spots: {}, doors: {}, blocks: [], clear: []}
function cfgOf(roomId: string, time: string) {
  const room = (ROOMS[roomId as keyof typeof ROOMS] ?? {...GENERIC, id: roomId}) as typeof ROOMS[keyof typeof ROOMS]
  const spawn = Object.values(room.spawns)[0]
  return {
    room: room.id, club, time, floorY: room.floorY, walk: room.walk, viewH: room.viewH, surface: room.surface, spawn,
    frame: {top: 0.84, bottom: -0.72}, player: {h: 4.6}, blocks: room.blocks, clear: room.clear,
    actors: Object.entries(room.slots).map(([id, s]) => ({id, x: s.x, z: s.z, yaw: s.yaw, sit: !!s.sit, seat: s.sit?.seat, y: s.sit?.y, head: s.head, reach: s.reach, look: {h: 6.2}})),
    spots: Object.entries(room.spots).map(([id, s]) => ({id, ...s})),
    exits: Object.entries(room.doors).map(([id, d]) => ({id, ...d})),
  }
}

const SIZE = (process.env.SIZE || "1280x800").split("x").map(Number) as [number, number]
async function shoot(page: Page, id: string, time: string, tag: string) {
  await page.evaluate(c => (window as unknown as W).__vxPlay.enter(c), cfgOf(id, time))
  await page.waitForTimeout(2600)
  try { await page.screenshot({path: `${out}/${id}-${time}${tag}.png`, timeout: 300000, animations: 'disabled'}) } catch (e) { console.log('shot failed', id, time, (e as Error).message.split('\n')[0]) }
}

async function main() {
  const browser = await chromium.launch({executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']})
  let errors = 0
  const ids = only ?? Object.keys(ROOMS)
  for (const [vw, vh, tag, list] of [[SIZE[0], SIZE[1], '', ids], [390, 844, '-m', process.env.NOMOBILE ? [] : ids.filter(r => MOBILE.includes(r))]] as const) {
    const page = await (await browser.newContext({viewport: {width: vw, height: vh}, deviceScaleFactor: 1})).newPage()
    page.on('pageerror', e => { errors++; console.log('PAGE ERROR', e.message) })
    await page.goto(`${base}/life/town/play.html?play=1&q=med&capture=1`, {waitUntil: 'load'})
    await page.waitForFunction(() => (window as unknown as W).__ready, null, {timeout: 180000})
    for (const id of list) {
      await shoot(page, id, 'day', tag)
      if (NIGHT.includes(id)) await shoot(page, id, 'night', tag)
      console.log(`${id}${tag}`)
    }
    console.log('page errs', (await page.evaluate(() => (window as unknown as W).__err)).slice(0, 5))
    await page.close()
  }
  console.log(`errors in page: ${errors}`)
  await browser.close()
  return errors
}

main().then(n => process.exit(n ? 1 : 0), e => { console.error(e); process.exit(1) })
