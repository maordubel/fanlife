/**
 * LIFE · the hood — the open neighbourhood, built as a RUSH `Level` with no clock.
 *
 * One continuous street plan, the same for every club and different on every seed (the side streets move):
 *   · the HOME block at the top of the main street (the front door; Dad on the step);
 *   · the MAIN STREET running 330 m to the ground's gate, three crossings with traffic;
 *   · the KIOSK on the first crossing's near corner, the MATE on the second crossing's far corner;
 *   · the SCHOOL gate in the first side street, the small PITCH at the end of the second side street;
 *   · the GROUND at the end of the road, the way RUSH's street already draws it.
 * The walkable world is the union of rects (`areas`); every mover is a function of time (`level.ts`). Club-agnostic:
 * the club arrives as its skin and its cast (first names only where the pack has them). No fact, date or score here.
 */
import {look, rng, type Car, type Level, type Look, type Pickup, type Stander, type Step, type Walker} from '@/lib/life/rush/level'
import {knownLook} from '@/lib/life/rush/call'
import type {MissionSpec} from '@/lib/life/rush/spec'
import {bannedColour} from '@/lib/life/rush-render/colour'
import type {ArchiveRef, CastMember} from '@/lib/life/universal/types'
import type {VoxelSkin} from '@/lib/life/universal/skin'
import type {HoodMeta, HoodPerson, PersonId} from './types'

/** what the hood needs of a club: its skin and its cast (roles with names where the pack has them) */
export type HoodClub = {id: string; skin: VoxelSkin; cast: Readonly<Record<string, Pick<CastMember, 'name' | 'role' | 'look'>>>; /** the archive nights the Fitter dated, by chapter (`storyNights`); absent: every chapter is personal */ nights?: Readonly<Record<string, ArchiveRef>>; /** the club's own city as its pack records it (Tel Aviv pictures only for Tel Aviv) */ town?: string | null; /** the life's birth year (`LIFE_TIMELINE`), when the club has one: the street is dressed for the boy's years */ born?: number | null; /** the country the pack records, for the era's money */ country?: string | null}

export const HOOD = {length: 330, half: 7, walk: 11, side: 62, sideW: 7, age: 11, talk: 2.2} as const
/** the universal cast role each person is, and how it looks to the sim */
const ROLE: Record<PersonId, string> = {dad: 'dad', mate: 'friend', kiosk: 'kiosk', neighbour: 'neighbour'}

export function hoodSpec(clubId: string, seed: number, time: 'day' | 'night' | 'dusk' = 'dusk'): MissionSpec {
  return {template: 'hood', verb: 'run', camera: 'chase', route: 'main', seed, skin: clubId, age: HOOD.age, time, weather: 'clear', clock: 1, hazards: ['traffic', 'crowd'], difficulty: 1, mandatory: false, anchor: null, title: 'The hood', brief: ''}
}

/** a cast member as the level draws him: his own look, minus every colour the club's page may not print */
function personLook(club: HoodClub, id: PersonId, scarf: boolean): Look {
  const m = club.cast[ROLE[id]]
  const base: Look = {tone: 0, hair: 0, top: 0, pants: 0, kit: false, cap: false, scarf, beard: false, size: 1}
  if (!m) return base
  const k = knownLook(ROLE[id], m.look, HOOD.age)
  const hex = Object.fromEntries(Object.entries(k.hex).filter(([, h]) => h && !bannedColour(h, club.skin)))
  return {...base, kit: k.kit, cap: k.cap, scarf: scarf || k.scarf, beard: k.beard, size: k.tall ? 1.08 : 0.99, hex, grey: k.grey}
}

const STEP: Omit<Step, 'kind' | 'x' | 'z' | 'key' | 'say'> = {r: HOOD.talk, npc: null, cost: 0, hold: 0, group: 0, joins: false, leaves: false, reveals: false}

export function hoodLevel(club: HoodClub, seed: number): Level {
  const r = rng(seed ^ 2_654_435_761), jr = rng(seed + 7919)
  const {length: L, half, walk, side, sideW} = HOOD
  const gateZ = -L
  // the side streets move with the seed (their own stream): the same hood, a different corner every time
  const crossings = [-62, -134, -212].map(z => z + Math.round((jr() - 0.5) * 16))
  const [c1, c2] = crossings as [number, number, number]

  /* the fixtures */
  const door = {x: -walk + 0.4, z: 6.5}
  const kz = c1 + 10.5
  const kiosk = {x: -(walk - 1.1), z: kz}
  const school = {x: side - 30 + Math.round(jr() * 6), z: c1 - sideW}
  const pitch = {x: -side + 8, z: c2, w: 13, d: 12.4}

  /* the people (solid in the sim, drawn and named by the hood's own dressing) */
  const who = (id: PersonId, x: number, z: number, scarf = false): HoodPerson => {
    const m = club.cast[ROLE[id]]
    const given = m && m.name !== m.role && id !== 'dad' ? m.name : null
    return {id, name: given, role: ROLE[id], x, z, r: HOOD.talk, look: personLook(club, id, scarf)}
  }
  const people: HoodPerson[] = [who('dad', -walk + 1.9, door.z + 0.7), who('neighbour', walk - 2.1, 3.5), who('kiosk', -walk + 3.0, kz), who('mate', walk - 2.4, c2 + 9.2, true)]
  const at = (id: PersonId) => people.find(p => p.id === id)!

  /* the one job: Before kick-off. Batteries on the kiosk's counter, the scarf with the mate, then back to Dad. */
  const steps: Step[] = [
    {...STEP, kind: 'collect', x: kiosk.x + 2.8, z: kz, r: 1.1, key: 'hood.obj.batteries', say: null},
    {...STEP, kind: 'talk', x: at('mate').x, z: at('mate').z, key: 'hood.obj.scarf', say: 'hood.say.mate.scarf'},
    {...STEP, kind: 'talk', x: at('dad').x, z: at('dad').z, key: 'hood.obj.dad', say: 'hood.say.dad.thanks'},
  ]
  const pickups: Pickup[] = [{x: kiosk.x + 2.8, z: kz - 2.6, kind: 'battery', step: 0}, {x: kiosk.x + 2.8, z: kz + 2.6, kind: 'battery', step: 0}]

  /* traffic on every crossing, calm enough to read */
  const cars: Car[] = []
  crossings.forEach(z => { for (let k = 0; k < 2; k++) { const dir: 1 | -1 = k % 2 ? -1 : 1; cars.push({axis: 'x', lane: z + (dir === 1 ? -2.4 : 2.4), dir, v: 6.5 + r() * 4, p0: -60 + r() * 120, span: [-70, 70], len: 4.4, wid: 1.9, police: false, colour: Math.floor(r() * 6)}) } })

  /* people walking the main street, the corners, the school gate, the pitch, the knot at the ground */
  const walkers: Walker[] = []
  for (let i = 0; i < 44; i++) { const onWalk = r() < 0.65, sd = r() < 0.5 ? -1 : 1; walkers.push({x: onWalk ? sd * (half + 1 + r() * (walk - half - 1.8)) : (r() - 0.5) * (half * 2 - 2), z0: 10 - r() * (L - 10), v: 1.2 + r() * 1.3, span: [gateZ + 16, 16], look: look(r)}) }
  const standers: Stander[] = people.map(p => ({x: p.x, z: p.z, face: 0, look: p.look, role: 'fan', hidden: true}))
  const stand = (x: number, z: number, o: Partial<Look> = {}) => standers.push({x, z, face: r() * 6.28, look: look(r, {kit: r() < 0.85, scarf: r() < 0.7, ...o}), role: 'fan'})
  for (let i = 0; i < 26; i++) { const sd = r() < 0.5 ? -1 : 1; stand(sd * (1.7 + r() * 7.3), gateZ + 6 + r() * 9) }
  for (const c of crossings) for (const sd of [-1, 1]) { stand(sd * (walk - 1.6), c + 8.6 + r()); if (r() < 0.6) stand(sd * (walk + 2 + r() * 12), c + (r() < 0.5 ? -4.6 : 4.6)) }
  for (let i = 0; i < 5; i++) stand(school.x - 3 + i * 1.5 + r() * 0.6, school.z + 1.6 + r() * 1.5, {size: 0.78, kit: true})
  for (let i = 0; i < 4; i++) stand(pitch.x - 4 + r() * 8, pitch.z - 4 + r() * 8, {size: 0.92, kit: true, scarf: false})

  const meta: HoodMeta = {
    people, door, kiosk, school, pitch, year: typeof club.born === 'number' ? club.born + HOOD.age - 2 : null,
    places: [
      {id: 'home', key: 'hood.place.home', x: door.x + 2, z: door.z, r: 14},
      {id: 'kiosk', key: 'hood.place.kiosk', x: kiosk.x, z: kz, r: 11},
      {id: 'corner', key: 'hood.place.corner', x: at('mate').x, z: at('mate').z, r: 11},
      {id: 'school', key: 'hood.place.school', x: school.x, z: school.z + 3, r: 11},
      {id: 'pitch', key: 'hood.place.pitch', x: pitch.x, z: pitch.z, r: 9},
      {id: 'ground', key: 'hood.place.ground', x: 0, z: gateZ + 12, r: 26},
    ],
    jobs: [{id: 'before-kickoff', giver: 'dad', from: 0, steps: steps.length, titleKey: 'hood.job.before-kickoff', offerKey: 'hood.say.dad.offer', againKey: 'hood.say.dad.again', doneKey: 'hood.say.dad.done'}],
  }

  return {
    place: 'street', verb: 'run', seed, half, walk, start: {x: -5.5, z: 14.5}, goal: {x: 0, z: gateZ + 3, r: 3.5}, home: null,
    bounds: {x0: -side, x1: side, z0: gateZ + 1, z1: 20}, crossings, cars, walkers, standers, patrols: [], targets: [], throwers: [], checks: [], voice: [],
    // no clock: the sim's own clock is a number it never reaches
    realSeconds: 1e7, timeScale: 1, length: L + 14,
    areas: [{x0: -walk + 0.5, x1: walk - 0.5, z0: gateZ + 1, z1: 20}, ...crossings.map(z => ({x0: -side, x1: side, z0: z - sideW, z1: z + sideW}))],
    steps, pickups, rings: [], noises: [], escort: null, side, kids: false, favours: [], surges: [], grip: 1, rooms: [],
    // the kiosk is a box on the pavement: nobody walks through it
    blocks: [{x0: kiosk.x - 0.9, x1: kiosk.x + 0.9, z0: kz - 1.3, z1: kz + 1.3, kind: 'kiosk', h: 2.4}],
    trips: [], pace: 0.8, searches: [], creaks: [], house: null, hood: meta,
  }
}

