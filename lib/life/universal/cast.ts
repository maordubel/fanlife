/**
 * LIFE, universal — the people every supporter's life has.
 *
 * Roles, not persons. A club pack gives them names (`life/cast.json`); with no pack they keep the
 * role's own word. Every one of them is fiction and is marked so: nobody here is a real person,
 * and no real person ever speaks in LIFE.
 */
import type {CastId, CastMember, Look} from './types'

export type CastRole = {id: CastId; label: string; look: Look; /** who he is to the supporter — one line, printed when they are introduced */ blurb: string}

const skin = ['#e8b896', '#c68a63', '#a8693f', '#f0c8a8', '#8a5a3a'] as const
const hair = ['#2a1d16', '#5a3a22', '#1b1b1f', '#8a8a90', '#3a2a22'] as const

/** `label` is what the dialogue box prints when the pack has no name for the role. */
export const CAST_ROLES: readonly CastRole[] = [
  {id: 'dad', label: 'Dad', look: {h: 6.6, shirt: '#ece7de', pants: '#4a6588', skin: skin[0], hair: hair[4], sex: 'm', age: 38, build: 0.25, style: 'curly', mustache: true, track: true, yoke: '#1f2a4a', denim: true, shoe: '#ece7de', shoeStripe: 'club', watch: true}, blurb: 'Taught you where to stand, and never explained why it matters.'},
  {id: 'mum', label: 'Mum', look: {h: 6.2, shirt: '#efe6d6', pants: '#3a3f48', skin: skin[0], hair: hair[1], long: true, sex: 'f', age: 36, style: 'curlyLong', cardigan: '#7a3a46', skirt: '#262c46', bangles: true, bag: '#6a4a34'}, blurb: 'Folds towels when she is nervous. Is never nervous.'},
  {id: 'friend', label: 'Friend', look: {h: 4.5, shirt: '#1b1b1f', pants: '#3e5674', skin: skin[1], hair: hair[2], sex: 'm', age: 11, style: 'buzz', track: true, denim: true}, blurb: 'The one who is there before you arrive, and says he does not care if you come.'},
  {id: 'rival', label: 'Classmate', look: {h: 4.6, shirt: '#8a7a9a', pants: '#4a4f5c', skin: skin[3], hair: hair[1], long: true, sex: 'f', age: 11, style: 'pony'}, blurb: 'Sits two desks away and supports somebody else, loudly.'},
  {id: 'kiosk', label: 'Kiosk', look: {h: 5.9, shirt: '#7a8aa8', pants: '#3a3f48', skin: skin[1], hair: hair[3], cap: true, sex: 'm', age: 56, build: 0.7, mustache: true, apron: '#ece4d6', sleeves: 'short'}, blurb: 'Decides who stands where, who owes what, and whose turn it is to be forgiven.'},
  {id: 'elder', label: 'Old supporter', look: {h: 6.1, shirt: '#e2dccd', pants: '#56544f', skin: skin[0], hair: hair[3], scarf: true, cane: true, sex: 'm', age: 71, glasses: true, sleeves: 'short', style: 'short', mustache: true, shoe: '#3a2c22'}, blurb: 'Has seen worse nights than this start better. Does not say how.'},
  {id: 'teacher', label: 'Teacher', look: {h: 6.6, shirt: '#e6e0d4', pants: '#2c3345', skin: skin[3], hair: hair[0], sex: 'm', age: 45, glasses: true, cardigan: '#5a6a5a', beard: true}, blurb: 'Knows exactly what is in your bag and chooses not to say.'},
  {id: 'steward', label: 'Steward', look: {h: 6.6, shirt: '#c9ccd2', jacket: '#1f2b4a', pants: '#5a5a5c', skin: skin[0], hair: hair[3], sex: 'm', age: 56, style: 'short', armband: 'club', shoe: '#1c1a18'}, blurb: 'Holds the gate, the queue and a clipboard, in that order of importance.'},
  {id: 'seller', label: 'Scarf seller', look: {h: 6.2, shirt: '#ece7de', pants: '#2a2e3a', skin: skin[2], hair: hair[2], sex: 'm', age: 34, style: 'curly', track: true, yoke: '#ece7de', trackPants: true, necklace: true, shoe: 'club', shoeStripe: '#ece7de', scarf: true}, blurb: 'Sells scarves out of a bag and stories out of the other pocket.'},
  {id: 'boss', label: 'Boss', look: {h: 6.5, shirt: '#e8e2d8', pants: '#2c3345', skin: skin[1], hair: hair[3], sex: 'm', age: 50, build: 0.5, style: 'slick', jacket: '#2e3442'}, blurb: 'Has an order going out on Monday and a long memory for Saturdays.'},
  {id: 'mate', label: 'Workmate', look: {h: 6.3, kit: true, pants: '#4a4f5c', skin: skin[2], hair: hair[0]}, blurb: 'Asked you a month ago. Will mention it exactly once.'},
  {id: 'driver', label: 'Driver', look: {h: 6.3, shirt: '#3a5a7a', pants: '#2c3345', skin: skin[1], hair: hair[2], cap: '#2c3345'}, blurb: 'The fare is in coins, exact. That is the whole conversation.'},
  {id: 'stranger', label: 'Stranger', look: {h: 6.3, shirt: '#6b7686', pants: '#3a3f48', skin: skin[3], hair: hair[1], stubble: true, jacket: '#3a3a3e'}, blurb: 'Nobody you know yet. Somebody you will half-remember.'},
  {id: 'child', label: 'The little one', look: {h: 4.2, kit: true, pants: '#3a4560', skin: skin[0], hair: hair[1]}, blurb: 'Wears the shirt too big and asks the question you stopped asking.'},
]

export const HERO_LOOKS = {
  child: {h: 4.4, shirt: '#5a7a9a', pants: '#3a4560', skin: skin[0], hair: hair[1]},
  teen: {h: 5.7, shirt: '#4a5a7a', pants: '#2c3345', skin: skin[0], hair: hair[1]},
  adult: {h: 6.4, shirt: '#46556e', pants: '#2c3340', skin: skin[0], hair: hair[1]},
  elder: {h: 6.3, shirt: '#5a5f68', pants: '#2c3340', skin: skin[0], hair: hair[3]},
} satisfies Record<string, Look>

export type CastManifest = {schemaVersion: 1; clubId: string; status: string; names: Record<string, string>; note?: string}

/** The cast of one club's life: the roles, with the pack's names where it has them. */
export function buildCast(manifest: CastManifest | null): Record<CastId, CastMember> {
  const out: Record<CastId, CastMember> = {}
  for (const role of CAST_ROLES) {
    const given = manifest?.names?.[role.id]
    // Dad and Mum are what a child calls them; the pack's name for them is used when somebody else speaks of them
    const name = role.id === 'dad' || role.id === 'mum' ? role.label : (typeof given === 'string' && given.trim() ? given.trim().slice(0, 24) : role.label)
    out[role.id] = {id: role.id, name, role: role.label, blurb: role.blurb, look: role.look, fictional: true}
  }
  return out
}
