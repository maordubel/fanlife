/**
 * LIFE · RUSH — the contract between the two engines (ADR-fanlife-0013).
 *
 * TOWN (the voxel diorama, `public/life/voxel`) lives the day. RUSH plays the mission. They meet
 * in exactly one place: LIFE hands RUSH a `MissionSpec` (data only) and RUSH hands back a
 * `MissionResult`. RUSH never writes the save, never reads a chapter and never names a club —
 * the club arrives as a skin and, when the club's archive holds it, one approved archive row.
 *
 * A mission is written ONCE, as a `MissionTemplate`, and fits itself to every club through that
 * club's own archive (`fit.ts`). There is no pilot club: a template that cannot stand on a club's
 * archive runs in its neutral version, or is held until research finds what it needs.
 *
 * Nothing in `lib/life/rush` names a club, a rival or a ground. Pure TypeScript, no DOM, no three.
 */
import type {ArchiveRef} from '../universal/types'

/* ───────────── what a mission is ───────────── */

/** The five things a supporter does in a hurry. Every mission is one verb. */
export type Verb = 'run' | 'drive' | 'sneak' | 'carry' | 'find'

/** `chase` = behind the back (GTA), `eyes` = first person (DOOM). A mission may switch inside, e.g. a tunnel. */
export type Camera = 'chase' | 'eyes'

/**
 * `main` = no harm to anyone: the danger is the clock, the traffic, the police, the crowd, height.
 * `ultras` = the ultras route only: very light violence — a thrown object, a shove, a rival group's
 * gear "stolen". Never blood, never a weapon, never an injury on screen; someone hit stumbles and
 * gets up. Rival ultras groups are invented, and the club's rival-colour bans apply to them.
 */
export type Route = 'main' | 'ultras'

/** What can go wrong in a mission. `strike`, `shove` and `steal` exist only on the ultras route (validated). */
export type Hazard = 'clock' | 'traffic' | 'police' | 'crowd' | 'height' | 'weather' | 'steward' | 'strike' | 'shove' | 'steal'
export const ULTRAS_ONLY: readonly Hazard[] = ['strike', 'shove', 'steal']

/* ───────────── what a mission needs from the archive ───────────── */

/**
 * The kinds of archive row a mission can stand on. Read from an approved row's own words
 * (`archive.ts`), never invented: a row that does not say it was a final is not a final.
 */
export type AnchorKind =
  | 'match' // a row that is a match the build could read (teams + score)
  | 'home' // a match the club played at home
  | 'away' // a match the club played away
  | 'derby' // a meeting with the club's approved primary rival
  | 'final' // a cup final (or a final of any competition the row names)
  | 'europe' // a European competition match
  | 'title' // a league title won or clinched
  | 'relegation' // the club went down
  | 'promotion' // the club went up
  | 'ground' // a ground opened, moved, rebuilt
  | 'founding' // the club was founded

/** Facts about the club, not a row: whether there IS a rival, a recorded ground, a city. */
export type ClubNeed = 'rival' | 'ground' | 'city'

/** How hard a mission leans on a need. */
export type Grade =
  | 'critical' // without it the mission does not exist for this club
  | 'enriching' // without it the mission runs in its neutral version (no date, no name)
  | 'decor' // a nicety: a sign, a scarf colour, a line

export type Need = {
  /** an archive-row kind, or a club fact */
  of: {anchor: AnchorKind[]} | {club: ClubNeed}
  grade: Grade
  /** the row must know the DAY (not only the year) — a night is a night only when the date is known */
  day?: boolean
  /** why the mission needs it, in one plain line (shown on the research task) */
  why: string
  /**
   * What a missing CRITICAL need means for this club. `held` (default): research may still find it,
   * so the mission waits and a research task is opened. `irrelevant`: its absence is the club's story
   * (no approved rival → no ultras derby night), so the mission is simply not part of this life.
   */
  absentMeans?: 'held' | 'irrelevant'
}

/* ───────────── a mission template ───────────── */

export type MissionTemplate = {
  id: string
  verb: Verb
  /** the opening camera */
  camera: Camera
  route: Route
  /** the supporter's age range this mission fits: a child runs with his father, an adult drives */
  ages: readonly [number, number]
  /** in-game seconds on the clock at the start; the clock is the main pressure in every mission */
  clock: number
  hazards: readonly Hazard[]
  needs: readonly Need[]
  /** title and one-line brief, English source text with `{club}`, `{rival}`, `{ground}`, `{city}`, `{date}` tokens */
  title: string
  brief: string
  /** the neutral version's title and brief: no date, no rival, no ground name */
  neutralTitle: string
  neutralBrief: string
  /**
   * Which anchor kinds make this mission matter MORE for a club (the club's personal story):
   * a club whose archive is full of European nights gets the European trip first.
   */
  weight: Partial<Record<AnchorKind, number>>
}

/* ───────────── the handoff ───────────── */

/**
 * What LIFE sends RUSH. Data only, serialisable, deterministic: the same spec and the same inputs
 * always play the same mission (the bot test depends on it).
 */
export type MissionSpec = {
  template: string
  verb: Verb
  camera: Camera
  route: Route
  seed: number
  /** the club's skin id — RUSH paints the street, the shirts and the crowd from it */
  skin: string
  age: number
  time: 'day' | 'night'
  /** derived from the archive row's month when the day is known; otherwise the chapter's own */
  weather: 'clear' | 'rain' | 'cold' | 'heat'
  clock: number
  hazards: Hazard[]
  /** 0 easy … 2 hard; the age sets it, never the player's record (no grinding) */
  difficulty: 0 | 1 | 2
  /** set by the SCRIPT, not the template: a mandatory mission cannot be skipped, but it can always be passed in story mode */
  mandatory: boolean
  /** the archive row the mission stands on, printed as it was recorded; absent in the neutral version */
  anchor: ArchiveRef | null
  title: string
  brief: string
  /** which version of the quest the script asked for (`quest.ts`): the same template, other steps — a boy leading his father, a man leading his own child */
  beat?: string | null
}

/** How a mission ended. `ok` = finished with help, skipped, or late but there. */
export type MissionOutcome = 'good' | 'ok' | 'slip'

/** What RUSH hands back. LIFE turns it into its own effects through `afterPlay`; RUSH writes nothing. */
export type MissionResult = {
  outcome: MissionOutcome
  /** seconds left on the clock (negative = late) */
  clockLeft: number
  /** at most three things the mission proves happened, as small flags the chapter may read */
  evidence: string[]
  /** true when story mode (assist) carried the player through */
  assisted: boolean
  skipped: boolean
  /** how it was played, for the result card only: stars, and the optional things found on the way */
  score?: MissionScore
}

/** The result card's score. Never a number LIFE reads: the story takes `outcome` and `evidence`, nothing else. */
/** Display only: LIFE never reads it. `lost` = game seconds the knocks cost, `streak` = the longest run of extras. */
export type MissionScore = {stars: 0 | 1 | 2 | 3; extras: number; extrasOf: number; chants: number; steps: number; lost: number; knocks: number; streak: number; favours: number}

/** Two failures in a mandatory mission open story mode. A mandatory mission never loops forever. */
export const ASSIST_AFTER_FAILS = 2
export const MAX_EVIDENCE = 3

/* ───────────── validation (pure) ───────────── */

export function templateProblems(t: MissionTemplate): string[] {
  const out: string[] = []
  if (!/^[a-z0-9-]+$/.test(t.id)) out.push(`${t.id}: id must be kebab-case`)
  if (t.ages[0] > t.ages[1]) out.push(`${t.id}: ages run backwards`)
  if (t.clock <= 0) out.push(`${t.id}: a mission needs a clock`)
  if (!t.hazards.includes('clock')) out.push(`${t.id}: the clock is a hazard of every mission`)
  if (t.route === 'main') for (const h of t.hazards) if (ULTRAS_ONLY.includes(h)) out.push(`${t.id}: "${h}" belongs to the ultras route only`)
  const neutral = `${t.neutralTitle} ${t.neutralBrief}`
  for (const token of ['{date}', '{rival}', '{ground}']) if (neutral.includes(token)) out.push(`${t.id}: the neutral version may not print ${token}`)
  for (const n of t.needs) {
    if ('anchor' in n.of && n.of.anchor.length === 0) out.push(`${t.id}: a need with no anchor kind`)
    if (!n.why.trim()) out.push(`${t.id}: every need says why`)
  }
  if (t.needs.filter(n => n.grade === 'critical').some(n => 'club' in n.of && n.of.club === 'city')) out.push(`${t.id}: the city is never critical — every club has one`)
  return out
}

export function resultProblems(r: MissionResult, mandatory: boolean): string[] {
  const out: string[] = []
  if (r.evidence.length > MAX_EVIDENCE) out.push('too much evidence')
  if (mandatory && r.skipped) out.push('a mandatory mission cannot be skipped')
  if (r.skipped && r.outcome !== 'ok') out.push('a skip is always ok')
  return out
}
