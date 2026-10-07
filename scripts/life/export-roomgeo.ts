/**
 * Writes `public/life/town/roomgeo.js` — the room geometry the smooth 3D engine places its scenery
 * against (walk band, spawns, slots, spots, doors). It is the SAME geometry the game walks on
 * (`lib/life/universal/rooms.ts`), so a wall can never be drawn where the story puts a door.
 *
 *   npx tsx scripts/life/export-roomgeo.ts          writes the file
 *   npx tsx scripts/life/export-roomgeo.ts --check  exits 1 when the file is stale
 */
import fs from 'node:fs'
import path from 'node:path'
import {ROOM_CATALOGUE, ROOMS} from '../../lib/life/universal/rooms'

export const ROOMGEO_PATH = path.join(process.cwd(), 'public/life/town/roomgeo.js')
export function roomgeoSource(): string {
  return `window.ROOMGEO=${JSON.stringify(ROOMS)};window.ROOMCAT=${JSON.stringify(ROOM_CATALOGUE)};`
}

if (process.argv[1]?.endsWith('export-roomgeo.ts')) {
  const want = roomgeoSource()
  if (process.argv.includes('--check')) {
    const have = fs.existsSync(ROOMGEO_PATH) ? fs.readFileSync(ROOMGEO_PATH, 'utf8') : ''
    if (have !== want) { console.error('roomgeo.js is stale — run: npx tsx scripts/life/export-roomgeo.ts'); process.exit(1) }
    console.log('roomgeo.js is current')
  } else {
    fs.writeFileSync(ROOMGEO_PATH, want)
    console.log(`wrote ${ROOMGEO_PATH} (${Object.keys(ROOMS).length} rooms)`)
  }
}
