/**
 * TOWN people, looked at: a conversation that carries the line's mood, a walk that stops and turns, and a stand
 * that bounces and jumps on a goal. Writes frames to a folder for a human to look at; fails only on page errors.
 *
 *   npx tsx scripts/life/town-people-probe.ts http://127.0.0.1:3200 /tmp/shots [club,club]
 */
import {chromium, type Page} from 'playwright'
import {mkdirSync} from 'node:fs'
import {ROOMS} from '../../lib/life/universal/rooms'

const base = process.argv[2] || 'http://127.0.0.1:3200'
const out = process.argv[3] || '/tmp/town-people'
const clubs = (process.argv[4] || 'hapoel-tel-aviv,aek-athens,zrinjski-mostar').split(',')
const scenes = (process.argv[5] || 'talk,walk,stand').split(',')
mkdirSync(out, {recursive: true})

type W = {__ready?: boolean; __err: string[]; __vxPlay: {enter(c: unknown): boolean; focus(id: string | null): void; emote(k: string | null): void; axis(x: number, y: number): void; celebrate(): void; hold(id: string, k: string | null): boolean}}

function cfgOf(roomId: string, club: string) {
  const room = ROOMS[roomId as keyof typeof ROOMS]!
  const spawn = Object.values(room.spawns)[0]
  return {
    room: room.id, club, time: 'day', floorY: room.floorY, walk: room.walk, viewH: room.viewH, surface: room.surface, spawn,
    frame: {top: 0.84, bottom: -0.72}, player: {h: 4.6}, blocks: room.blocks, clear: room.clear,
    actors: Object.entries(room.slots).map(([id, s]) => ({id, x: s.x, z: s.z, yaw: s.yaw, sit: !!s.sit, seat: s.sit?.seat, y: s.sit?.y, head: s.head, reach: s.reach, look: {h: 6.2}})),
    spots: Object.entries(room.spots).map(([id, s]) => ({id, ...s})),
    exits: Object.entries(room.doors).map(([id, d]) => ({id, ...d})),
  }
}

async function enter(page: Page, roomId: string, club: string) {
  const ok = await page.evaluate(c => (window as unknown as W).__vxPlay.enter(c), cfgOf(roomId, club))
  await page.waitForTimeout(2500)
  return ok
}

async function main() {
  const browser = await chromium.launch({executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']})
  let errors = 0
  const page = await (await browser.newContext({viewport: {width: 1280, height: 800}})).newPage()
  page.on('pageerror', e => { errors++; console.log('PAGE ERROR', e.message) })
  await page.goto(`${base}/life/town/play.html?play=1&q=med&capture=1`, {waitUntil: 'load'})
  await page.waitForFunction(() => (window as unknown as W).__ready, null, {timeout: 180000})
  for (const club of clubs) {
    // a conversation: three lines, three moods, the speaker's hand and head and the listener's answer
    const living = 'room'
    if (scenes.includes('talk')) await enter(page, living, club)
    const who = Object.keys(ROOMS[living as keyof typeof ROOMS].slots)[0]
    if (who && scenes.includes('talk')) {
      await page.evaluate(id => (window as unknown as W).__vxPlay.focus(id), who)
      for (const mood of ['tense', 'joy', 'grief', 'tender']) {
        await page.evaluate(m => (window as unknown as W).__vxPlay.emote(m), mood)
        await page.waitForTimeout(1300)
        await page.screenshot({path: `${out}/${club}-talk-${mood}.png`, timeout: 180000})
      }
      await page.evaluate(id => (window as unknown as W).__vxPlay.hold(id, 'cup'), who)
      await page.waitForTimeout(4500)
      await page.screenshot({path: `${out}/${club}-talk-after.png`, timeout: 180000})
      await page.evaluate(() => (window as unknown as W).__vxPlay.focus(null))
    }
    // a walk, a stop and a turn on the spot, in the street
    if (scenes.includes('walk')) {
    await enter(page, 'street', club)
    await page.evaluate(() => (window as unknown as W).__vxPlay.axis(1, 0))
    await page.waitForTimeout(1400)
    await page.screenshot({path: `${out}/${club}-walk.png`, timeout: 180000})
    await page.evaluate(() => (window as unknown as W).__vxPlay.axis(0, 0))
    await page.waitForTimeout(250)
    await page.evaluate(() => (window as unknown as W).__vxPlay.axis(-0.2, 0))
    await page.waitForTimeout(160)
    await page.evaluate(() => (window as unknown as W).__vxPlay.axis(0, 0))
    await page.waitForTimeout(200)
    await page.screenshot({path: `${out}/${club}-turn.png`, timeout: 180000})
    }
    // the stand: a beat, then a goal
    const stand = ['gate5-stand', 'terrace', 'curva'].find(r => r in ROOMS)
    if (stand && scenes.includes('stand')) {
      await enter(page, stand, club)
      await page.waitForTimeout(1200)
      await page.screenshot({path: `${out}/${club}-stand.png`, timeout: 180000})
      await page.evaluate(() => (window as unknown as W).__vxPlay.celebrate())
      await page.waitForTimeout(450)
      await page.screenshot({path: `${out}/${club}-stand-goal.png`, timeout: 180000})
    }
  }
  console.log(`errors in page: ${errors}`, (await page.evaluate(() => (window as unknown as W).__err)).slice(0, 5))
  await browser.close()
  return errors
}

main().then(n => process.exit(n ? 1 : 0), e => { console.error(e); process.exit(1) })
