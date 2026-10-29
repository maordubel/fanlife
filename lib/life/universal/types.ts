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
  /** the figure: who this is, so the body is built for them (the town reads these; the block picture ignores them) */
  sex?: 'm' | 'f'
  age?: number
  /** -1 thin · 0 average · 1 heavy */
  build?: number
  style?: 'short' | 'curly' | 'curlyLong' | 'long' | 'bun' | 'pony' | 'buzz' | 'bald' | 'slick' | 'spiky'
  mustache?: boolean
  beard?: boolean
  stubble?: boolean
  glasses?: boolean
  sleeves?: 'long' | 'short'
  /** an open jacket over the shirt (its colour) · `denimJacket` makes it denim */
  jacket?: string
  denimJacket?: boolean
  cardigan?: string
  /** a zipped track top with two stripes, in the club's colour unless `trackCol` says otherwise */
  track?: boolean
  trackCol?: string
  denim?: boolean
  /** a two-tone retro track top: shoulders and sleeves in this colour over the body, a white band between ('club' = the club's colour) */
  yoke?: string
  trackPants?: boolean
  /** trainers: the shoe, and three stripes on its side ('club' / 'club2' resolve to the club's colours) */
  shoe?: string
  shoeStripe?: string
  /** a steward's armband on the left arm */
  armband?: string
  bangles?: boolean
  bag?: string
  necklace?: boolean
  watch?: boolean
  skirt?: string
  apron?: string
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
  /** shared money held for others (`coach`, `comm-tin`) is at least this much */
  | {fund: [string, number]}
  /** an envelope of his own (`shirt`, `trip`) holds at least this much */
  | {saved: [string, number]}
  /** he has done this order (`job-crates`) for this person before, in an earlier chapter: a returning client */
  | {worked: string}
  /** copies of a collection item he has at hand (owned and not lent out) */
  | {owns: [string, number]}

export type Wear = 'plain' | 'shirt' | 'scarf' | 'both'

export type Effect =
  | {e: 'flag'; k: string; v?: string | number | boolean}
  | {e: 'heart'; by: number}
  | {e: 'bond'; who: CastId; by: number}
  | {e: 'coins'; by: number}
  /**
   * Wages for one piece of work, paid ONCE (owner's spec §2, §8). `order` names the job; the engine makes it
   * `<chapter>/<order>`, so the same client's next order in another chapter is a new order and pays again,
   * while a replay, a double tap or a second route to the same shift does not.
   */
  | {e: 'pay'; order: string; by: number}
  /** money put aside in an envelope (`by` > 0, at most what the wallet holds) or taken back out of it (`by` < 0) */
  | {e: 'envelope'; id: string; by: number}
  /** money spent straight out of an envelope (`by` > 0): it was put aside for exactly this. Guard it with `saved`. */
  | {e: 'spend'; from: string; by: number}
  /** a shared fund (the café till, the coach money, the community tin): never the wallet, never spendable as coins */
  | {e: 'fund'; id: string; by: number}
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
  /**
   * hands, not words: a small thing the player does. It never fails the chapter.
   * `then` always happens; `good` follows a clean or good-enough go ('good' and 'ok'), `slip` follows a go that got away.
   * A slip is a different outcome, not a lost day: put what the story needs in `then`, what skill earns in `good`.
   */
  /**
   * A small game, or a RUSH mission (ADR-fanlife-0013). `game` is what plays when RUSH is not open on this site or
   * device; `null` means the option simply happens without a game then. A mission never fails the day either.
   */
  | {e: 'play'; game: MiniGame | null; id: string; mission?: MissionCall; scope?: WorkScope; then?: Effect[]; good?: Effect[]; slip?: Effect[]}
  /** the collection: copies come in, go to somebody for good, go out on loan and come back */
  | {e: 'collect'; item: string; n?: number}
  | {e: 'give'; item: string; to: string}
  | {e: 'lend'; item: string; to: string}
  | {e: 'back'; item: string}
  | {e: 'card'; card: string}
  | {e: 'sound'; cue: SoundCue}
  | {e: 'end'; ending: string}
  /* ── Season One: what the screen shows, never what the life remembers (each is a directive only) ── */
  /** a staged scene in the room: people move, turn, hold and cheer while the camera cuts (`Chapter.cines`) */
  | {e: 'cine'; id: string}
  /** an interview, 2026: somebody of his life, older, talks to the camera about what he did (`Chapter.docs`) */
  | {e: 'doc'; id: string}
  /** the archive night happens around him: the board, the count, the people beside him (`Chapter.lives`) */
  | {e: 'live'; id: string}
  /** a stamp across the screen: a mission passed, a mission lost, a new place, a new person */
  | {e: 'stamp'; kind: StampKind; text: Tx}

/** how much of the job this go is: 'short' plays a smaller board (fewer crates, fewer customers). Absent = 'full'. */
export type WorkScope = 'short' | 'full'
export type MiniGame = 'tune' | 'clap' | 'carry' | 'count' | 'kick' | 'chant'
/** a RUSH mission a script asks for: the template (`lib/life/rush/templates.ts`) and whether the script lets it be skipped */
export type MissionCall = {template: string; mandatory: boolean; beat?: string}
/** How a small game went. 'ok' is good enough: it applies the same effects as 'good'. */
export type PlayResult = 'good' | 'ok' | 'slip'
export type SoundCue = 'roar' | 'murmur' | 'whistle' | 'radio' | 'door' | 'coin' | 'bus'

/* ───────────── conversations ───────────── */

/** How a moment feels. Bends the picture (camera, light, pace) and nothing else; a line without one lets the feeling go. */
export type Mood = 'tender' | 'warm' | 'tense' | 'grief' | 'joy' | 'wonder'
export type Line = {who: CastId | 'me' | null; t: Tx; mood?: Mood}
export type Choice = {id: string; t: Tx; when?: Cond; then?: Effect[]; next?: string}
export type Branch = {when?: Cond; lines: Line[]; choices?: Choice[]; then?: Effect[]; next?: string
  /** a moment, not a menu: the choices stand for `s` seconds and then `pick` is taken for him (silence is an answer) */
  timer?: {s: number; pick: string}}
/** The first branch whose `when` holds is the one that plays. The last branch carries no `when`: there is always something to say. */
export type Talk = {id: string; branches: Branch[]}

/* ───────────── a chapter ───────────── */

export type Verb = 'talk' | 'look' | 'take' | 'use' | 'buy' | 'listen' | 'go' | 'sit' | 'open'

export type Placement = {who: CastId; room: RoomId; slot: string; when?: Cond; talk?: string; look?: Look; follow?: boolean; mark?: boolean}
export type SpotUse = {id: string; room: RoomId; spot: string; when?: Cond; talk: string; verb: Verb; label: Tx}
export type DoorUse = {id: string; room: RoomId; door: string; to: RoomId; spawn: string; label: Tx; time?: TimeOfDay; when?: Cond; needs?: Cond; blocked?: Tx}
/** Plays by itself, once, the first time its room is entered while `when` holds. */
export type Beat = {id: string; room: RoomId; when?: Cond; talk: string}
export type Objective = {id: string; t: Tx; done: Cond; room?: RoomId; /** Season One: jobs open together share a hub; the HUD names the ones still to do */ hub?: string}
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
  /** the chapter is part of this life only while this holds when its turn comes (a route the player was invited into); otherwise it is skipped, never dead-ended */
  when?: Cond
  /* ── Season One (all optional: a chapter without them plays as before) ── */
  /** an episode of a season: its number, its line, and what the HUD calls the main job */
  episode?: EpisodeMeta
  /** a clock against him: it runs only while he can move, and running out is a different life, not a lost one */
  clocks?: ClockDef[]
  /** what people say as he walks past them: never stops him */
  barks?: Bark[]
  /** staged scenes (`{e:'cine'}`) */
  cines?: CineDef[]
  /** interviews, 2026 (`{e:'doc'}`) */
  docs?: DocDef[]
  /** the archive night, played around him (`{e:'live'}`) */
  lives?: LiveDef[]
  /** objectives that are his to take or leave: side jobs, shown apart from the main job */
  side?: string[]
}

/* ───────────── Season One ───────────── */

export type StampKind = 'passed' | 'failed' | 'new' | 'unlocked' | 'secret'
export type EpisodeMeta = {
  season: number; no: number; of: number
  /** one line under the title card: what this episode is about, never a fact */
  logline: Tx
  /** the objective ids that are THE mission (the rest are steps on the way or side jobs) */
  main: string[]
  /** what is coming next, for the end card ("Next: Six Short") */
  next?: Tx
  /** the cold open, played once as the day begins: an interview first, then the room comes to life; `mission` is the banner after it */
  open?: {doc?: string; cine?: string; mission?: Tx}
  /** the interviews played over the end card, in order */
  close?: string[]
  /** HOOKS — what makes a player press "next" before he has decided to.
   * `texts`: the season's first seconds, messages on a phone in 2026 (episode one only).
   * `box`: the object out of the box this episode is about, shown on the title card before anything is played.
   * `flash`: a few seconds from later in the day, played first, then a card ("Two hours earlier").
   * `tease`: one line under "Next" on the end card — a question, never an answer.
   * `letter`: the season's sealed envelope, opened on the last end card; `after` is what lies under it. */
  texts?: {from: Tx; t: Tx}[]
  box?: {item: Tx; line: Tx}
  flash?: {cine: string; card: Tx}
  tease?: Tx
  letter?: {head: Tx; lines: Tx[]; sign: Tx; after: Tx}
}
export type ClockDef = {
  id: string
  /** seconds of play (the clock stands still while anybody talks, a card is open, or a game is played) */
  s: number
  /** what it counts down to: "Kick-off" */
  label: Tx
  /** it runs while this holds (default: from the start of the chapter) */
  from?: Cond
  /** it stops for good once this holds — the job is done in time */
  until: Cond
  /** raised when it runs out */
  fail: string
  /** said when it runs out, then the life goes on another way */
  talk?: string
}
export type Bark = {id: string; who: CastId; room: RoomId; when?: Cond; lines: Tx[]}

export type CineAct =
  | {who: CastId | 'me'; do: 'walk'; to: string}
  | {who: CastId | 'me'; do: 'face'; to: CastId | 'me'}
  | {who: CastId | 'me'; do: 'hold'; item: 'cup' | 'ticket' | 'scarf' | 'bag' | 'phone' | null}
  | {who: CastId | 'me'; do: 'emote'; mood: Mood}
  | {who: 'all'; do: 'cheer'}
/** One shot: where the camera looks, what is said under it (a caption), what people do while it runs. */
export type Shot = {
  cam: 'wide' | 'two' | 'close' | 'over'
  /** who the camera holds: one person (close), two (two-shot, over the shoulder) */
  on?: (CastId | 'me')[]
  /** how long it holds, in milliseconds, before the cut (a caption may hold it longer for reading) */
  ms: number
  say?: Line
  act?: CineAct[]
  when?: Cond
}
export type CineDef = {id: string; shots: Shot[]}

/** An interview: who, how much older, and what they say — each line only if what it remembers happened. */
/** `secret`: a line that tells him something he did not know then — the end card counts the ones he heard, out of all the episode holds */
export type DocLine = {t: Tx; when?: Cond; secret?: Tx}
export type DocDef = {id: string; who: CastId; /** what the lower third calls them: "Your mother", "Your best friend" */ role: Tx; lines: DocLine[]}

/** The archive night, live: fiction around a recorded row. The row says what happened; these lines are only the room. */
export type LiveDef = {
  id: string
  /** who is beside him (the room's people react) */
  with: CastId[]
  /** where he lives it: on the radio at home, on the terrace, on a screen */
  at: 'radio' | 'terrace' | 'screen'
  /** said by the people beside him; never a fact about the match */
  before: Line[]
  goal: Line[]
  against: Line[]
  end: {won: Line[]; lost: Line[]; drew: Line[]; unread: Line[]}
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
  storyLocale?: 'en' | 'he'
  /** changes whenever anything a save depends on changes */
  version: string
  clubId: string
  club: {name: string; short: string; city: string; country: string}
  skin: VoxelSkin
  cast: Record<CastId, CastMember>
  /** the supporter, at the ages the chapters visit */
  hero: {birthYear: number | null; looks: Record<'child' | 'teen' | 'adult' | 'elder', Look>; /** the name the pack suggests for him (fiction); the player may give another */ name?: string}
  chapters: Chapter[]
  rooms: Record<RoomId, RoomPlay>
  readiness: LifeReadiness
  /** archive rows that became nights of this life */
  anchors: ArchiveRef[]
  /** the names the pack gives its people (Mum and Dad included, which the cast keeps as roles): for an interview's lower third */
  given?: Record<CastId, string>
  /** honest about what it is: composed from universal beats and this club's approved archive */
  provenance: {kind: 'generated-from-anchors'; universalChapters: number; anchoredChapters: number; cultureDna: 'pending' | 'approved'}
  /** the club's matchday culture, read from its sourced world.json only — never typed in code; a kind the record lacks is absent */
  culture?: LifeCulture[]
}
export type LifeCultureKind = 'food' | 'habit' | 'humour' | 'meetup' | 'route' | 'home'
/** `home` names the supporter's own neighbourhood; `fromYear`/`untilYear` bind a line to the years it was true */
export type LifeCulture = {id: string; kind: LifeCultureKind; line: string; local?: string; name?: string; fromYear?: number; untilYear?: number}

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
  /** wages for an order; a second row for the same order changes nothing */
  | {t: 'paid'; order: string; by: number}
  | {t: 'envelope'; id: string; by: number}
  | {t: 'fund'; id: string; by: number}
  | {t: 'collected'; item: string; n: number}
  | {t: 'gave'; item: string; to: string}
  | {t: 'lent'; item: string; to: string}
  | {t: 'returned'; item: string}
  | {t: 'energy'; by: number}
  | {t: 'standing'; by: number}
  /** he has been introduced to somebody: the first conversation with them */
  | {t: 'met'; who: CastId}
  | {t: 'keep'; item: string}
  | {t: 'wear'; what: Wear}
  | {t: 'time'; to: TimeOfDay}
  | {t: 'ended'; chapter: string; ending: string}
  /** a thing he made or changed (a washed car, a stitched scarf, the crew's banner): seen in the world, never a condition */
  | {t: 'made'; a: Artefact}

/** What a finished small game leaves in the world — `artefacts.ts` makes it, TOWN draws it. */
export type ArtefactKind = 'car' | 'scarf' | 'banner' | 'poster' | 'shirt' | 'photo'
export type ArtefactMark = {type: 'crooked-stroke' | 'painted-over' | 'own-star' | 'patch' | 'crease' | 'streak'; at?: string}
export type Artefact = {
  /** one per thing in a life: a second wash of the same car replaces the first */
  id: string
  kind: ArtefactKind
  /** how it came out: the minigame's own variant (`mud`, `one coat`…) or the choice that shaped it */
  variant: string
  /** share of the work done, 0..1 — a car washed in a hurry keeps a streak */
  zonesDone: number
  marks: ArtefactMark[]
  /** the chapter it was made in */
  madeIn: string
}

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
  /** orders already paid (`<chapter>/<order>`): one payment per piece of work */
  paid: string[]
  /** money put aside for something (`shirt`, `trip`…): out of the wallet, still his */
  envelopes: Record<string, number>
  /** shared money he holds or adds to and does not own (`till`, `coach`…): never part of `coins` */
  funds: Record<string, number>
  /** the collection (stickers, doubles, a favourite): how many he owns and who has one on loan. Old saves fold to {} */
  collection: Record<string, CollectionEntry>
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
  /** what he made, by id (a life, not a day; absent in a save from before artefacts) */
  made?: Record<string, Artefact>
}

/** `n` copies owned; `lent` names who holds one of them right now (one entry per copy out) */
export type CollectionEntry = {n: number; lent: string[]}

export type SaveFile = {v: 1; club: string; pack: string; events: LifeEvent[]; savedAt: string}
