import type {Cond, Effect, MiniGame, SoundCue, Verb, Wear} from '../types'

/** Authored fiction only. No match fact belongs in these strings. */
export type Words = readonly [en: string, he: string]
export type Speech = readonly [who: string | null, en: string, he: string]
export type Option = {
  id: string; text: Words; reply: Speech[]; effects?: Effect[]; when?: Cond; action?: Speech[]
  /** puts the shirt or the scarf ON, keeping whatever he already wears (a scarf + a shirt becomes both) */
  wearAdd?: 'shirt' | 'scarf'
  /** what is said instead of `reply` when the person this scene is with is not here */
  soloReply?: Speech[]
}
/** When several hold at once they are told together, in the order written, ahead of the scene's own opening. */
export type Callback = {when: Cond; lines: Speech[]; /** callbacks sharing a group never hold together (three outcomes of one thing) */ group?: string}
export type SceneLocation = {room: string; when: Cond; slot?: string; spot?: string}
export type SceneScript = {
  id: string; room: string; who: string; title: Words; lines: Speech[]
  options: Option[]; task: Words; action: Speech[]; game?: MiniGame
  callbacks?: Callback[]
  /** the person is here only while this holds; `solo` is what the room says without them */
  presence?: Cond
  solo?: Speech[]
  locations?: SceneLocation[]
  company?: {who: string; slot: string; when: Cond}[]
  /** where in the room the person stands / the errand is done: a name from the room's own table */
  slot?: string; spot?: string; verb?: Verb
  /** scenes (ids) that must be done first. Default: the one before it. `[]` = open from the start of the chapter. */
  after?: string[]
  /** a further condition on the scene being open at all */
  when?: Cond
  /** while this scene is open, the east door of the street leads here instead of down the road to the ground */
  east?: string
  /** people who walk with the supporter through these rooms while the scene is open */
  escort?: {who: string; rooms: string[]}[]
  /** arrive by a cut rather than on foot (rooms the town does not join, or a night that moved on) */
  cut?: boolean
  /** what a small game earns on top of the scene: never required, never lost */
  reward?: {good?: Effect[]; slip?: Effect[]}
  sound?: SoundCue
  /** the evening has come by the time this scene begins */
  night?: boolean
  /** this scene can end the chapter (a chapter may have more than one road to its end; the last scene always does) */
  final?: boolean
  /** hands the whole group of scenes sharing this name to the player at once ("either order") */
  hub?: string
}
export type ChapterScript = {
  id: string; age: number; act: 1 | 2 | 3; title: Words; intro: Words
  keepsake: {id: string; name: Words; note: Words}
  scenes: SceneScript[]
}
export const flag = (k: string, v: string | number | boolean = true): Effect => ({e: 'flag', k, v})
export const is = (k: string, v: string | number | boolean): Cond => ({is: [k, v]})
export const bond = (who: string, by: number): Effect => ({e: 'bond', who, by})
export const heart = (by: number): Effect => ({e: 'heart', by})
export const coins = (by: number): Effect => ({e: 'coins', by})
export const energy = (by: number): Effect => ({e: 'energy', by})
export const standing = (by: number): Effect => ({e: 'standing', by})
export const speech = (who: string | null, en: string, he: string): Speech => [who, en, he]
export type {Wear, MiniGame}
