/**
 * TOWN look probe: the same rooms, hours and weathers, at a desktop and a phone size, with the cast dressed as the game
 * dresses them — frames for a human to compare a grade or a lighting change before and after. Fails only on page errors.
 *
 *   npx tsx scripts/life/town-look-probe.ts http://127.0.0.1:3200 /tmp/look/after [club] [q]
 */
import {chromium, type Page} from 'playwright'
import {mkdirSync} from 'node:fs'
import {ROOMS} from '../../lib/life/universal/rooms'
import {CAST_ROLES} from '../../lib/life/universal/cast'

const base = process.argv[2] || 'http://127.0.0.1:3200'
const out = process.argv[3] || '/tmp/town-look'
const club = process.argv[4] || 'hapoel-tel-aviv'
const q = process.argv[5] || 'med'
const only = (process.argv[6] || '').split(',').filter(Boolean)
const vps = (process.argv[7] || 'desk,phone').split(',')
mkdirSync(out, {recursive: true})

type W = {__ready?: boolean; __err: string[]; __vxPlay: {enter(c: unknown): boolean; focus(id: string | null): void}}

const SHOTS: Array<{id: string; room: string; time?: string; weather?: string; mood?: string}> = [
  {id: 'room-day', room: 'room'},
  {id: 'room-night', room: 'room', time: 'night'},
  {id: 'kitchen-day', room: 'kitchen'},
  {id: 'street-day', room: 'street'},
  {id: 'street-dusk', room: 'street', mood: 'dusk'},
  {id: 'street-night', room: 'street', time: 'night'},
  {id: 'street-rain', room: 'street', weather: 'rain'},
  {id: 'stand', room: 'gate5-stand'},
  {id: 'classroom', room: 'classroom'},
  {id: 'community', room: 'community-room'},
]

function cfgOf(s: typeof SHOTS[number]) {
  const room = ROOMS[s.room as keyof typeof ROOMS]!
  const spawn = Object.values(room.spawns)[0]
  const roles = CAST_ROLES
  return {
    room: room.id, club, time: s.time || 'day', weather: s.weather || null, mood: s.mood || 'normal', floorY: room.floorY, walk: room.walk, viewH: room.viewH, surface: room.surface, spawn,
    frame: {top: 0.84, bottom: -0.72}, player: {h: 4.6}, blocks: room.blocks, clear: room.clear,
    actors: Object.entries(room.slots).map(([id, sl], i) => {
      const role = roles[i % roles.length]
      return {id, x: sl.x, z: sl.z, yaw: sl.yaw, sit: !!sl.sit, seat: sl.sit?.seat, y: sl.sit?.y, head: sl.head, reach: sl.reach, look: {...role.look}}
    }),
    spots: Object.entries(room.spots).map(([id, sp]) => ({id, ...sp})),
    exits: Object.entries(room.doors).map(([id, d]) => ({id, ...d})),
  }
}

async function shoot(page: Page, tag: string) {
  for (const s of SHOTS) {
    if (only.length && !only.includes(s.id)) continue
    const ok = await page.evaluate(c => (window as unknown as W).__vxPlay.enter(c), cfgOf(s))
    if (!ok) console.log('enter failed', s.id)
    await page.waitForTimeout(2600)
    await page.screenshot({path: `${out}/${s.id}-${tag}.png`, timeout: 420000})
  }
}

async function main() {
  const browser = await chromium.launch({executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']})
  let errors = 0
  for (const vp of [{w: 1280, h: 800, tag: 'desk'}, {w: 390, h: 844, tag: 'phone'}]) {
    if (!vps.includes(vp.tag)) continue
    const page = await (await browser.newContext({viewport: {width: vp.w, height: vp.h}, isMobile: vp.tag === 'phone', hasTouch: vp.tag === 'phone'})).newPage()
    page.on('pageerror', e => { errors++; console.log('PAGE ERROR', vp.tag, e.message) })
    await page.goto(`${base}/life/town/play.html?play=1&q=${q}&capture=1`, {waitUntil: 'load'})
    await page.waitForFunction(() => (window as unknown as W).__ready, null, {timeout: 180000})
    await shoot(page, vp.tag)
    console.log(vp.tag, 'errors in page:', (await page.evaluate(() => (window as unknown as W).__err)).slice(0, 5))
    await page.close()
  }
  console.log(`page errors: ${errors}`)
  await browser.close()
  return errors
}

main().then(n => process.exit(n ? 1 : 0), e => { console.error(e); process.exit(1) })
