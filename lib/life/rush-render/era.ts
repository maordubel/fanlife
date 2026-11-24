/**
 * LIFE · the hood — the ERA in the street (feel pass, 24.11.2026): what a decade looks like and what it has in it.
 *
 * Two layers, one file:
 *   · ERA_ITEMS — the things a decade has (the transistor radio, the payphone, the cassette, the mobile…), each with the
 *     first year it may appear in a LIFE street. General history, never a club fact. `tests/life-feel.test.ts` checks that
 *     no table here (or the story's era texture) shows a thing before its year: no mobile phone before 2000.
 *   · ERA_DRESS — the dressing tables by decade (parked car silhouettes, the phone box, kiosk wares, TV aerials, posters),
 *     and `dressEra`, a first, plain pass at putting them in the street. Hooked with one line from `hood.ts`; the renderer
 *     may refine every shape here, the tables stay the contract.
 * No yellow, no club colour, no rival colour: every colour here is a muted street neutral.
 */
import * as THREE from 'three'
import type {Level} from '@/lib/life/rush/level'

export type Decade = '70s' | '80s' | '90s' | '00s' | '10s' | '20s'
export const DECADES: readonly Decade[] = ['70s', '80s', '90s', '00s', '10s', '20s']
export const decadeOf = (year: number): Decade => year >= 2020 ? '20s' : year >= 2010 ? '10s' : year >= 2000 ? '00s' : year >= 1990 ? '90s' : year >= 1980 ? '80s' : '70s'
export const decadeStart = (d: Decade): number => 1970 + DECADES.indexOf(d) * 10

/** a thing of an era: the first year a LIFE street may show it, and the last (null: still about) */
export type EraItem = {id: string; from: number; to: number | null}
export const ERA_ITEMS: Readonly<Record<string, EraItem>> = {
  'transistor-radio': {id: 'transistor-radio', from: 1960, to: null},
  'payphone': {id: 'payphone', from: 1950, to: 2015},
  'phone-box': {id: 'phone-box', from: 1950, to: 2010},
  'landline': {id: 'landline', from: 1950, to: null},
  'cassette': {id: 'cassette', from: 1970, to: 2005},
  'walkman': {id: 'walkman', from: 1980, to: 2005},
  'cd': {id: 'cd', from: 1988, to: null},
  'pager': {id: 'pager', from: 1990, to: 2002},
  'mobile': {id: 'mobile', from: 2000, to: null},
  'text-message': {id: 'text-message', from: 2000, to: null},
  'smartphone': {id: 'smartphone', from: 2010, to: null},
  'online-ticket': {id: 'online-ticket', from: 2008, to: null},
  'ticket-window': {id: 'ticket-window', from: 1950, to: null},
  'tv-aerial': {id: 'tv-aerial', from: 1960, to: 2012},
  'satellite-dish': {id: 'satellite-dish', from: 1992, to: null},
  'teletext': {id: 'teletext', from: 1980, to: 2012},
  'morning-paper': {id: 'morning-paper', from: 1950, to: null},
  'sticker-packet': {id: 'sticker-packet', from: 1970, to: null},
  'video-tape': {id: 'video-tape', from: 1982, to: 2006},
}
export const inEra = (id: string, year: number): boolean => { const it = ERA_ITEMS[id]; return !!it && year >= it.from && (it.to === null || year <= it.to) }

/** a parked car's silhouette: body length, height, how square the cabin sits, how long the bonnet is */
export type CarShape = {len: number; h: number; cabin: number; bonnet: number; round: number}
export type EraDress = {
  cars: CarShape[]
  /** muted paint a parked car of the decade wears (never yellow, never a club colour) */
  paint: string[]
  /** what the kiosk shows on its counter (words keys in the story's era texture) */
  wares: string[]
  /** what is on the roofs and the walls */
  aerials: number; dishes: number; posters: number
  /** the street's way of calling somebody */
  phone: 'phone-box' | 'payphone' | 'none'
}
const BOXY: CarShape = {len: 4.2, h: 1.35, cabin: 0.55, bonnet: 0.3, round: 0}
const WEDGE: CarShape = {len: 4.0, h: 1.3, cabin: 0.5, bonnet: 0.32, round: 0.2}
const HATCH: CarShape = {len: 3.7, h: 1.45, cabin: 0.62, bonnet: 0.24, round: 0.5}
const ROUND: CarShape = {len: 4.1, h: 1.5, cabin: 0.6, bonnet: 0.26, round: 0.8}
const TALL: CarShape = {len: 4.4, h: 1.65, cabin: 0.66, bonnet: 0.22, round: 0.7}
export const ERA_DRESS: Readonly<Record<Decade, EraDress>> = {
  '70s': {cars: [BOXY, BOXY, WEDGE], paint: ['#7b6a58', '#5e6b5a', '#8b7f72', '#6a5b52'], wares: ['era.ware.papers', 'era.ware.sweets', 'era.ware.batteries'], aerials: 9, dishes: 0, posters: 2, phone: 'phone-box'},
  '80s': {cars: [BOXY, WEDGE, WEDGE, HATCH], paint: ['#8a5a4e', '#5d6870', '#9a948a', '#4f5a4c', '#6f6a78'], wares: ['era.ware.papers', 'era.ware.stickers', 'era.ware.batteries', 'era.ware.cassettes'], aerials: 9, dishes: 0, posters: 3, phone: 'phone-box'},
  '90s': {cars: [HATCH, HATCH, ROUND, WEDGE], paint: ['#556b78', '#7a4f55', '#8e9296', '#4e5d55'], wares: ['era.ware.papers', 'era.ware.stickers', 'era.ware.phonecards', 'era.ware.cassettes'], aerials: 6, dishes: 0, posters: 3, phone: 'payphone'},
  '00s': {cars: [ROUND, ROUND, HATCH, TALL], paint: ['#9aa0a6', '#5c6670', '#3f4650', '#7d8288'], wares: ['era.ware.papers', 'era.ware.stickers', 'era.ware.topup'], aerials: 3, dishes: 4, posters: 2, phone: 'payphone'},
  '10s': {cars: [TALL, ROUND, TALL], paint: ['#c9cdd1', '#4a4f56', '#7a7f86', '#2f343a'], wares: ['era.ware.papers', 'era.ware.stickers', 'era.ware.topup'], aerials: 1, dishes: 3, posters: 2, phone: 'none'},
  '20s': {cars: [TALL, TALL, ROUND], paint: ['#d6d8da', '#3b4047', '#8a9097', '#5a6068'], wares: ['era.ware.papers', 'era.ware.stickers'], aerials: 0, dishes: 2, posters: 1, phone: 'none'},
}
/**
 * The street lamps of a decade and the paint on its parked cars, for the dusk rig (look/dusk.ts): low-pressure sodium,
 * deep orange, into the nineties; high-pressure sodium warmer-white in the 2000s; LED, nearly white, from the 2010s.
 * Lamp colours stay under 30 degrees of hue or desaturated (never yellow, rule 8). With no year: today's mix.
 */
export function lampTone(d: Decade | null): {head: string; pool: string; cars: string[]} {
  const head = d === '70s' || d === '80s' || d === '90s' ? '#ff9440' : d === '00s' ? '#ffac6a' : d ? '#f4e6da' : '#ffa862'
  const pool = d === '70s' || d === '80s' || d === '90s' ? '#ff8a3a' : d === '00s' ? '#ffa264' : d ? '#e8dcd2' : '#ffa862'
  return {head, pool, cars: d ? [...ERA_DRESS[d].paint] : ['#ece8de', '#2c3a55', '#9a3a2c', '#3f5f4c', '#6b6f78']}
}

/** the things each dressing table puts in the street (the anachronism test reads this) */
export const DRESS_ITEMS: Readonly<Record<Decade, string[]>> = Object.fromEntries(DECADES.map(d => {
  const t = ERA_DRESS[d], out: string[] = []
  if (t.phone !== 'none') out.push(t.phone)
  if (t.aerials) out.push('tv-aerial')
  if (t.dishes) out.push('satellite-dish')
  for (const w of t.wares) { if (w === 'era.ware.cassettes') out.push('cassette'); if (w === 'era.ware.topup') out.push('mobile'); if (w === 'era.ware.stickers') out.push('sticker-packet') }
  return [d, out]
})) as Record<Decade, string[]>

type DressCtx = {scene: THREE.Scene; keep: <T extends {dispose(): void}>(x: T) => T; level: Level; night: boolean; lite?: boolean}

/**
 * The era's first pass in the street, only when the hood knows its year (`level.hood.year`): parked cars of the decade
 * along the main street's kerbs, the phone box or the payphone across from the kiosk, aerials or dishes on the roof line.
 * Plain boxes, cheap on the lite tier; placed off every walkable step and away from the people.
 */
export function dressEra(x: DressCtx): void {
  const year = x.level.hood?.year
  if (typeof year !== 'number') return
  const t = ERA_DRESS[decadeOf(year)], hood = x.level.hood!, W = x.level.walk
  const box = x.keep(new THREE.BoxGeometry(1, 1, 1))
  const mats = new Map<string, THREE.Material>()
  const mat = (c: string) => { if (!mats.has(c)) mats.set(c, x.keep(new THREE.MeshStandardMaterial({color: c, roughness: 0.75}))); return mats.get(c)! }
  const put = (c: string, px: number, py: number, pz: number, sx: number, sy: number, sz: number) => { const m = new THREE.Mesh(box, mat(c)); m.position.set(px, py, pz); m.scale.set(sx, sy, sz); x.scene.add(m); return m }
  // parked cars: in the road's edge between the crossings, never on a crossing, never by a person (the dusk rig parks its
  // own, shaped and painted by the decade, so the plain boxes stand down there)
  const clear = (z: number) => x.level.crossings.every(c => Math.abs(c - z) > 12) && hood.people.every(p => Math.abs(p.z - z) > 6) && Math.abs(hood.kiosk.z - z) > 6
  let k = 0
  for (let z = -20; z > -x.level.length + 30 && !x.scene.userData.duskCars; z -= 17) {
    if (!clear(z)) continue
    const s = t.cars[k % t.cars.length]!, side = k % 2 ? 1 : -1, cx = side * (x.level.half - 1.1), paint = t.paint[k % t.paint.length]!
    put(paint, cx, 0.45, z, 1.75, s.h * (1 - s.cabin) + 0.2, s.len)
    put(paint, cx, 0.45 + s.h * (1 - s.cabin) + s.h * s.cabin / 2, z + s.len * (s.bonnet - 0.2) * 0.5, 1.6, s.h * s.cabin, s.len * (0.55 - s.round * 0.08))
    k++
  }
  // the phone box (or the payphone on its post) across the main street from the kiosk
  if (t.phone !== 'none') {
    const px = W - 1.0, pz = hood.kiosk.z + 5
    if (t.phone === 'phone-box') { put('#5b5f66', px, 1.25, pz, 1.1, 2.5, 1.1); put('#e9e4da', px, 2.45, pz, 1.15, 0.2, 1.15) }
    else { put('#6a6e74', px, 0.8, pz, 0.12, 1.6, 0.12); put('#3d4148', px, 1.5, pz, 0.35, 0.5, 0.3) }
  }
  if (x.lite) return
  // aerials and dishes on the roof line both sides of the main street
  for (let i = 0; i < t.aerials; i++) { const z = -10 - i * 34, sx = i % 2 ? 1 : -1; put('#4a4d52', sx * (W + 3), 9.5, z, 0.08, 2.2, 0.08); put('#4a4d52', sx * (W + 3), 10.4, z, 0.08, 0.08, 1.6) }
  for (let i = 0; i < t.dishes; i++) { const z = -27 - i * 51, sx = i % 2 ? -1 : 1; put('#c8c9cb', sx * (W + 0.3), 6.5, z, 0.12, 0.8, 0.8) }
}
