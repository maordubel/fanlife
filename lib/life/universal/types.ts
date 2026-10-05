/**
 * LIFE, universal — the types every club's life is written in.
 *
 * One engine, one vocabulary. A chapter is DATA: who stands in which room, what each of them
 * says, which doors are open, and what has to be true for the day to end. Nothing in this file,
 * or in any file under `lib/life/universal`, names a club — a club arrives as a `LifePack`.
 *
 * The save is an append-only list of `LifeEvent`s and the state is what you get by folding it
 * (the rule the hand-authored Hapoel LIFE already lives by): a chapter can be rewritten without
 * breaking a save, and an event from a newer build folds to nothing.
 */
import type {KitPattern, VoxelSkin} from './skin'

/* ───────────── text ───────────── */

/** English source text. `{club}`, `{city}`, `{ground}`, `{dad}`… are filled when the pack is composed. */
export type Tx = string

/* ───────────── the world ───────────── */

export type RoomId = string
export type TimeOfDay = 'day' | 'night'
export type Dir = 'n' | 's' | 'e' | 'w'

export type Look = {
  h?: number
  /** wears the club's shirt, in the club's own pattern */
  kit?: boolean
  shirt?: string
  shirt2?: string
  pat?: Exclude<KitPattern, 'solid'> | null
  pants?: string
  skin?: string
  hair?: string
  long?: boolean
  /** true = the club's scarf */
  scarf?: boolean
  cap?: boolean | string
  vest?: string
  cane?: boolean
  anim?: 'idle' | 'cheer'
}

export type Slot = {x: number; z: number; yaw?: number; sit?: {seat: number; y?: number}; head?: number; /** how far away he can be spoken to (a man behind a counter) */ reach?: number}
export type DoorGeo = {x: number; z: number; w: number; d: number; dir: Dir}
export type SpotGeo = {x: number; z: number; y?: number}

/** Where a body can be in a voxel room. Geometry only — what a door leads to is the chapter's business. */
export type RoomPlay = {
  id: RoomId
  floorY: number
  /** x0, z0, x1, z1 — the walkable rectangle; the room's own boxes cut the furniture out of it */
  walk: [number, number, number, number]
  /** how much of a tall room the phone camera frames (the sky above a street is not a room) */
  viewH?: number
  surface: 'floor' | 'stone' | 'grass' | 'wood'
  spawns: Record<string, {x: number; z: number; yaw?: number}>
  slots: Record<string, Slot>
  spots: Record<string, SpotGeo>
  doors: Record<string, DoorGeo>
  blocks?: [number, number, number, number][]
  clear?: [number, number, number, number][]
}

/* ───────────── conditions and effects ───────────── */

export type CastId = string
export type Gauge = 'heart' | 'coins' | 'energy' | 'standing'

export type Cond =
  | {flag: string}
  | {not: string}
  | {is: [string, string | number | boolean]}
  | {all: Cond[]}
  | {any: Cond[]}
  | {none: Cond[]}
  | {min: [Gauge, number]}
  | {bond: [CastId, number]}
  | {has: string}
  | {wears: Wear}

export type Wear = 'plain' | 'shirt' | 'scarf' | 'both'

export type Effect =
  | {e: 'flag'; k: string; v?: string | number | boolean}
  | {e: 'heart'; by: number}
  | {e: 'bond'; who: CastId; by: number}
  | {e: 'coins'; by: number}
  /** tiredness: a day has a limited amount of doing in it */
  | {e: 'energy'; by: number}
  /** how the street and the terrace see you */
  | {e: 'standing'; by: number}
  /** something goes into the box under the bed */
  | {e: 'keep'; item: string}
  | {e: 'wear'; what: Wear}
  /** a cut: the day moves to another room without a door */
  | {e: 'goto'; room: RoomId; spawn: string; time?: TimeOfDay}
  | {e: 'time'; to: TimeOfDay}
  /** hands, not words: a small thing the player does. It never fails the chapter. */
  | {e: 'play'; game: MiniGame; id: string; then?: Effect[]}
  | {e: 'card'; card: string}
  | {e: 'sound'; cue: SoundCue}
  | {e: 'end'; ending: string}

export type MiniGame = 'tune' | 'clap' | 'carry' | 'count'
export type SoundCue = 'roar' | 'murmur' | 'whistle' | 'radio' | 'door' | 'coin' | 'bus'

/* ───────────── conversations ───────────── */

export type Line = {who: CastId | 'me' | null; t: Tx}
export type Choice = {id: string; t: Tx; when?: Cond; then?: Effect[]; next?: string}
export type Branch = {when?: Cond; lines: Line[]; choices?: Choice[]; then?: Effect[]; next?: string}
/** The first branch whose `when` holds is the one that plays. The last branch carries no `when`: there is always something to say. */
export type Talk = {id: string; branches: Branch[]}

/* ───────────── a chapter ───────────── */

export type Verb = 'talk' | 'look' | 'take' | 'use' | 'buy' | 'listen' | 'go' | 'sit' | 'open'

export type Placement = {who: CastId; room: RoomId; slot: string; when?: Cond; talk?: string; look?: Look; follow?: boolean; mark?: boolean}
export type SpotUse = {id: string; room: RoomId; spot: string; when?: Cond; talk: string; verb: Verb; label: Tx}
export type DoorUse = {id: string; room: RoomId; door: string; to: RoomId; spawn: string; label: Tx; time?: TimeOfDay; when?: Cond; needs?: Cond; blocked?: Tx}
/** Plays by itself, once, the first time its room is entered while `when` holds. */
export type Beat = {id: string; room: RoomId; when?: Cond; talk: string}
export type Objective = {id: string; t: Tx; done: Cond; room?: RoomId}
export type Ending = {title: Tx; body: Tx; keep?: string}
export type Keepsake = {id: string; name: Tx; note: Tx}
/** `kickoff` names the two sides and hides the score; `result` shows it. A card with neither is a plain archive card. */
export type CardDef = {id: string; kicker: Tx; title: Tx; body: Tx; archive?: ArchiveRef; stage?: 'kickoff' | 'result'}

export type Act = 1 | 2 | 3

export type Chapter = {
  id: string
  act: Act
  /** how old the supporter is. A universal chapter states an age and never a year. */
  age: number
  title: Tx
  kicker: Tx
  intro: Tx
  start: {room: RoomId; spawn: string; time: TimeOfDay}
  cast: Placement[]
  /** what a walk-on is called in this chapter ("Neighbour"): a role is a face, the chapter says who he is today */
  names?: Record<CastId, Tx>
  spots: SpotUse[]
  doors: DoorUse[]
  beats: Beat[]
  talks: Talk[]
  objectives: Objective[]
  endings: Record<string, Ending>
  cards?: CardDef[]
  keepsakes?: Keepsake[]
  /** archive cards shown before the chapter opens: years the club's own book remembers */
  prelude?: CardDef[]
  /** an anchored night carries the archive row it stands on; a universal chapter carries none */
  anchor?: ArchiveRef
  /** the one night of this life that is the club's own match, told with its teams, its competition and its result */
  centrepiece?: boolean
}

/* ───────────── history (only what the archive holds) ───────────── */

/** What a recorded scoreline says, read with certainty or not at all. The competition is the archive row's own `hint`. */
export type MatchFacts = {
  home: string
  away: string
  homeGoals: number
  awayGoals: number
  /** which side the club was on */
  us: 'home' | 'away'
  result: 'won' | 'lost' | 'drew'
  /** what the title adds after the score ("league title secured", "after extra time"), as recorded */
  note: string | null
  /** who scored and who started, only where the club's own match record states it for this day */
  detail?: MatchDetail
}

export type MatchDetail = {
  /** the club's own goals, in order; `null` minute when the record has none. Empty when the record does not list them all. */
  scorers: {name: string; minute: number | null}[]
  lineup: string[]
  bench: string[]
}

/** A row of the club's approved archive, quoted — never paraphrased, never completed. */
export type ArchiveRef = {
  factId: string
  title: string
  /** ISO day when the archive knows the day; null when it knows only the year */
  on: string | null
  year: number
  precision: 'day' | 'year'
  hint: string
  /** the language the archive row is written in (a row is printed as it was recorded) */
  locale: string
  sources: {title: string; publisher: string; url: string | null}[]
  /** present only when the title is a scoreline this build could read with certainty */
  match?: MatchFacts
}

/* ───────────── a club's life, composed ───────────── */

export type CastMember = {id: CastId; name: string; /** the role's own word: Kiosk, Teacher */ role: string; /** one line, printed when the supporter is introduced */ blurb: string; look: Look; fictional: true}

export type LifeReadiness = {state: 'READY' | 'PARTIAL' | 'LOCKED'; playable: boolean; reasons: string[]; anchors: number; target: number}

export type LifePack = {
  schemaVersion: 1
  /** changes whenever anything a save depends on changes */
  version: string
  clubId: string
  club: {name: string; short: string; city: string; country: string}
  skin: VoxelSkin
  cast: Record<CastId, CastMember>
  /** the supporter, at the ages the chapters visit */
  hero: {birthYear: number | null; looks: Record<'child' | 'teen' | 'adult' | 'elder', Look>}
  chapters: Chapter[]
  rooms: Record<RoomId, RoomPlay>
  readiness: LifeReadiness
  /** archive rows that became nights of this life */
  anchors: ArchiveRef[]
  /** honest about what it is: composed from universal beats and this club's approved archive */
  provenance: {kind: 'generated-from-anchors'; universalChapters: number; anchoredChapters: number; cultureDna: 'pending' | 'approved'}
}

/* ───────────── the save ───────────── */

export type FlagValue = string | number | boolean

export type LifeEvent =
  | {t: 'started'; pack: string; at?: string}
  | {t: 'chapter'; id: string}
  | {t: 'moved'; room: RoomId; spawn: string; time: TimeOfDay}
  | {t: 'flag'; k: string; v: FlagValue}
  | {t: 'heart'; by: number}
  | {t: 'bond'; who: CastId; by: number}
  | {t: 'coins'; by: number}
  | {t: 'energy'; by: number}
  | {t: 'standing'; by: number}
  /** he has been introduced to somebody: the first conversation with them */
  | {t: 'met'; who: CastId}
  | {t: 'keep'; item: string}
  | {t: 'wear'; what: Wear}
  | {t: 'time'; to: TimeOfDay}
  | {t: 'ended'; chapter: string; ending: string}

export type LifeState = {
  v: 1
  started: boolean
  chapter: string | null
  room: RoomId | null
  spawn: string
  time: TimeOfDay
  /** flags of the chapter being played; `life:` flags outlive it */
  flags: Record<string, FlagValue>
  heart: number
  coins: number
  /** rested at 100 when a day begins */
  energy: number
  standing: number
  /** people he has been introduced to, in the order he met them (a life, not a day) */
  met: CastId[]
  /** rooms he has stood in, in the order he found them (a life, not a day): what the map has revealed */
  seen: RoomId[]
  bonds: Record<CastId, number>
  keeps: string[]
  wear: Wear
  /** chapter id → the ending it reached */
  done: Record<string, string>
  finished: boolean
}

export type SaveFile = {v: 1; club: string; pack: string; events: LifeEvent[]; savedAt: string}
