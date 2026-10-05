/**
 * LIFE, universal — writes `public/life/voxel/cinema-rooms.json`, the six rooms of the cinema demo
 * (`/life/voxel/cinema.html`) as plain play configs: the real room geometry from `rooms.ts`, a few
 * people on real slots, and the doors that join them into one walk.
 *
 *   npx tsx scripts/life/dump-cinema-rooms.ts
 */
import {writeFileSync} from 'node:fs'
import {ROOMS} from '../../lib/life/universal/rooms'
import {CAST_ROLES, HERO_LOOKS} from '../../lib/life/universal/cast'

type Link = {door: string; to: string; spawn: string}
const TOUR: {room: string; time: 'day' | 'night'; label: string; links: Link[]; people: {who: string; slot: string}[]}[] = [
  {room: 'room', time: 'day', label: 'Home', links: [{door: 'front', to: 'street', spawn: 'fromHome'}], people: [{who: 'dad', slot: 'sofa'}, {who: 'mum', slot: 'byDoor'}]},
  {room: 'street', time: 'day', label: 'The street', links: [{door: 'home', to: 'room', spawn: 'fromStreet'}, {door: 'east', to: 'route', spawn: 'fromStreet'}], people: [{who: 'kiosk', slot: 'kiosk'}, {who: 'friend', slot: 'customer'}, {who: 'elder', slot: 'corner'}]},
  {room: 'route', time: 'day', label: 'The road', links: [{door: 'west', to: 'street', spawn: 'fromEast'}, {door: 'east', to: 'gate', spawn: 'fromRoute'}], people: [{who: 'seller', slot: 'seller'}, {who: 'stranger', slot: 'corner'}]},
  {room: 'gate', time: 'day', label: 'The gate', links: [{door: 'west', to: 'route', spawn: 'fromGate'}, {door: 'turnstile', to: 'tunnel', spawn: 'fromGate'}], people: [{who: 'steward', slot: 'steward'}, {who: 'child', slot: 'wait'}]},
  {room: 'tunnel', time: 'day', label: 'The tunnel', links: [{door: 'back', to: 'gate', spawn: 'fromInside'}, {door: 'light', to: 'terrace', spawn: 'fromTunnel'}], people: [{who: 'stranger', slot: 'ahead'}]},
  {room: 'terrace', time: 'night', label: 'The terrace', links: [{door: 'tunnel', to: 'tunnel', spawn: 'fromTerrace'}], people: [{who: 'elder', slot: 'fence'}, {who: 'mate', slot: 'left'}]},
]

const looks = Object.fromEntries(CAST_ROLES.map(r => [r.id, r.look]))
const rooms = TOUR.map(t => {
  const geo = ROOMS[t.room]!
  const spawnKey = Object.keys(geo.spawns).find(k => k !== 'start') ?? 'start'
  return {
    room: t.room, label: t.label, time: t.time, floorY: geo.floorY, walk: geo.walk, viewH: geo.viewH, surface: geo.surface,
    blocks: geo.blocks, clear: geo.clear, spawns: geo.spawns, defaultSpawn: geo.spawns.start ? 'start' : spawnKey,
    actors: t.people.map(p => { const s = geo.slots[p.slot]!; return {id: `${p.who}-${p.slot}`, x: s.x, z: s.z, yaw: s.yaw, sit: !!s.sit, seat: s.sit?.seat, y: s.sit?.y, head: s.head, reach: s.reach, look: looks[p.who], talk: false, mark: false, follow: false} }),
    spots: [],
    exits: t.links.map(l => { const d = geo.doors[l.door]!; return {id: `${t.room}:${l.door}`, x: d.x, z: d.z, w: d.w, d: d.d, dir: d.dir, locked: false, to: l.to, spawn: l.spawn} }),
  }
})
writeFileSync('public/life/voxel/cinema-rooms.json', JSON.stringify({hero: HERO_LOOKS.teen, rooms}, null, 1))
console.log(`cinema-rooms.json · ${rooms.length} rooms`)
