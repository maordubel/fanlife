import { t } from '../i18n'
import { craftedWardrobe } from './callbacks'
import { CHARACTERS, characterName, portraitFor } from './characters'
import { CHAPTERS, anchorOwner, chapterFor, chapterOpen, type ChapterDef } from './content/chapters'
import { eraFor } from './content/era'
import { partnerId } from './partner'
import {
  carriedReading,
  purseReading,
  redBoxReading,
  redHeartReading,
  relationshipReading,
  wardrobeReading,
  type CarriedReading,
  type KeepsakeReading,
  type PurseReading,
  type SubscriptionReading,
  type WardrobeReading,
} from './profile'
import { boxContents, type BoxThing } from './redboxView'
import { LIFE_ROUTES, ROUTE_STAGES, hasStage, heldStage, isActive, leftFlag, offeredFlag, type RouteId, type RouteStage } from './routes'
import { SHIRTS, chapterIndex } from './shirts'
import { seasonFor } from './subscription'
import { LIFE_TRACKS, trackStageOf, type TrackId } from './tracks'
import { GATE_HE } from './gauges'
import { flagOn, relationshipOf, type CharacterId, type LifeState, type PresenceMode, type RedHeartId } from './types'

/**
 * אני, התיק שלי, הסיפור שלי — the read-model of the personal layer (delta 90-H, 25.9.2026).
 *
 * `lib/life/profile.ts` stays the ONE translator of numbers into words (rule 46). This file
 * sits on top of it and composes: it asks `profile.ts`, `routes.ts`, `tracks.ts`,
 * `redboxView.ts` and `subscription.ts` what is already true, and arranges the answers into
 * the shapes the three destinations draw — a hero, a map of paths, a constellation of
 * people, a biography, a bag. It holds no state, invents no field of `LifeState`, and writes
 * nothing; every function is pure over the state the snapshot already carries.
 *
 * It is a sibling rather than more of `profile.ts` for one structural reason: it reads
 * `redboxView.ts`, which reads the eras, and `subscription.ts` / `finale.ts` import
 * `profile.ts`. Composition one floor up keeps that graph a tree.
 *
 * Two rules every function here obeys:
 *  · **Nothing Pugi does not know.** A route appears once somebody offered it to him; a
 *    stage he has not reached is an unlabelled mark; a chapter appears once he has lived it.
 *  · **No figure to print.** Tiers, states and bands are names for the drawing, never values.
 */

// ===================================================================================
// מי אני — the hero
// ===================================================================================

export type IdentitySummary = {
  /** small, above the sentence — `שער 5 · מוביל חבורה` */
  eyebrow: string | null
  /** the identity label — who he has become, in one short sentence */
  title: string
  /** the second sentence, quieter */
  line: string
  /** a stable key for the identity MILESTONE this sentence stands for (never shown) */
  key: string
}

type IdentityLine = { title: string; line: string }

/** the sentence for a route, while he is on its way up, and at the top of it */
function routeIdentity(route: RouteId, stage: RouteStage): IdentityLine {
  const apex = stage === 'apex'
  switch (route) {
    case 'ULTRAS':
      return apex
        ? { title: t('life90h.id.ultras.apex'), line: t('life90h.id.ultras.apexLine') }
        : { title: t('life90h.id.ultras'), line: t('life90h.id.ultrasLine') }
    case 'JOURNALIST':
      return apex
        ? { title: t('life90h.id.journalist.apex'), line: t('life90h.id.journalist.apexLine') }
        : { title: t('life90h.id.journalist'), line: t('life90h.id.journalistLine') }
    case 'OWNER':
      return apex
        ? { title: t('life90h.id.owner.apex'), line: t('life90h.id.owner.apexLine') }
        : { title: t('life90h.id.owner'), line: t('life90h.id.ownerLine') }
    case 'CREATOR':
      return apex
        ? { title: t('life90h.id.creator.apex'), line: t('life90h.id.creator.apexLine') }
        : { title: t('life90h.id.creator'), line: t('life90h.id.creatorLine') }
    case 'USSISHKIN_FOUNDER':
      return apex
        ? { title: t('life90h.id.founder.apex'), line: t('life90h.id.founder.apexLine') }
        : { title: t('life90h.id.founder'), line: t('life90h.id.founderLine') }
    case 'TRAVELLER':
      return apex
        ? { title: t('life90h.id.traveller.apex'), line: t('life90h.id.traveller.apexLine') }
        : { title: t('life90h.id.traveller'), line: t('life90h.id.travellerLine') }
    case 'DISTANCE_RETURN':
    default:
      return apex
        ? { title: t('life90h.id.distance.apex'), line: t('life90h.id.distance.apexLine') }
        : { title: t('life90h.id.distance'), line: t('life90h.id.distanceLine') }
  }
}

const STAGE_WEIGHT: Record<RouteStage, number> = { entry: 1, practice: 2, apex: 3 }

/** the route that says most about him today: the highest ACTIVE stage, registry order breaking ties */
function leadingRoute(state: LifeState): { id: RouteId; stage: RouteStage; titleHe: string } | null {
  let best: { id: RouteId; stage: RouteStage; titleHe: string } | null = null
  for (const route of LIFE_ROUTES) {
    if (!isActive(state, route.id)) continue
    const stage = heldStage(state, route.id)
    if (!stage) continue
    if (!best || STAGE_WEIGHT[stage] > STAGE_WEIGHT[best.stage]) best = { id: route.id, stage, titleHe: route.stageTitlesHe[stage] }
  }
  return best
}

/**
 * מי נהייתי — deterministic, milestone-based, never an LLM and never a number.
 *
 * Priority is what a person would say first about himself: the title somebody gave him,
 * then the house he made, then the title he put down, then — for the long years with no
 * title at all — what his age and his Saturdays make him. `key` changes only when the
 * MILESTONE changes, which is what lets the sheet strike the old sentence through once and
 * never on an ordinary update (§38).
 */
export function identitySummaryReading(state: LifeState): IdentitySummary {
  const gate = GATE_HE[state.gate?.identity ?? 'gate7'] ?? null
  const lead = leadingRoute(state)
  if (lead) {
    const said = routeIdentity(lead.id, lead.stage)
    return { eyebrow: gate ? `${gate} · ${lead.titleHe}` : lead.titleHe, ...said, key: `route:${lead.id}:${lead.stage === 'apex' ? 'apex' : 'rising'}` }
  }
  const parent = trackStageOf(state, 'PARENTHOOD')
  if (parent && parent.id !== 'expecting') {
    return { eyebrow: gate, title: t('life90h.id.parent'), line: t('life90h.id.parentLine'), key: 'track:parent' }
  }
  if (parent) return { eyebrow: gate, title: t('life90h.id.expecting'), line: t('life90h.id.expectingLine'), key: 'track:expecting' }
  const partner = trackStageOf(state, 'PARTNERSHIP')
  if (partner?.id === 'home') return { eyebrow: gate, title: t('life90h.id.home'), line: t('life90h.id.homeLine'), key: 'track:home' }
  const stoodDown = LIFE_ROUTES.some((route) => flagOn(state, leftFlag(route.id)))
  if (stoodDown) return { eyebrow: gate, title: t('life90h.id.left'), line: t('life90h.id.leftLine'), key: 'route:left' }
  if (state.age < 11) {
    return state.attendedAnchors.length > 0
      ? { eyebrow: gate, title: t('life90h.id.childIn'), line: t('life90h.id.childInLine'), key: 'age:child-in' }
      : { eyebrow: null, title: t('life90h.id.child'), line: t('life90h.id.childLine'), key: 'age:child' }
  }
  if (state.age < 18) return { eyebrow: gate, title: t('life90h.id.teen'), line: t('life90h.id.teenLine'), key: 'age:teen' }
  if (partner) return { eyebrow: gate, title: t('life90h.id.together'), line: t('life90h.id.togetherLine'), key: 'track:together' }
  return { eyebrow: gate, title: t('life90h.id.fan'), line: t('life90h.id.fanLine'), key: 'age:fan' }
}

/** the day he is standing in, the way the chapter names it — `24 במאי 1986` */
export function todayHe(state: LifeState): string {
  const chapter = CHAPTERS.find((row) => row.id === state.chapter)
  return state.dateHe ?? chapter?.hudDateHe ?? chapter?.dateHe ?? String(state.year)
}

/**
 * הפנים שלו השנה — the plate the dialogue draws him with in THIS chapter, so the hero is
 * the boy of 1986 in 1986 and the man of 2019 in 2019. `null` when the era has none.
 */
export function selfPortrait(state: LifeState): string | null {
  return portraitFor('פוגי', eraFor(state.chapter).portraits ?? {})
}

// ===================================================================================
// הדרך שלי — the life path map
// ===================================================================================

export type TrackVisualState = 'locked' | 'emerging' | 'active' | 'strong' | 'dormant'

export type PathBranch = {
  id: string
  kind: 'route' | 'track' | 'lean'
  titleHe: string
  /** the word for where he is on it — a title somebody gave him, never "2/3" */
  stageHe: string
  state: TrackVisualState
  /** one mark per stage of the ladder; `reached` fills it. Unreached marks carry no name. */
  stops: { reached: boolean }[]
  /** the names of the stages he HAS reached, in order — the milestones, for the detail */
  milestonesHe: string[]
  /** the one sentence under the map when this branch is tapped */
  storyHe: string
  /** people who stand on this path with him, by name, when the fiction says so */
  peopleHe: string[]
}

export type LifePathReading = {
  trunkHe: string
  trunkNoteHe: string
  branches: PathBranch[]
}

/** literal keys, so `tests/i18n.test.ts` can resolve every one of them */
function routeStory(id: RouteId): string {
  switch (id) {
    case 'ULTRAS':
      return t('life90h.path.story.ultras')
    case 'JOURNALIST':
      return t('life90h.path.story.journalist')
    case 'OWNER':
      return t('life90h.path.story.owner')
    case 'CREATOR':
      return t('life90h.path.story.creator')
    case 'USSISHKIN_FOUNDER':
      return t('life90h.path.story.founder')
    case 'TRAVELLER':
      return t('life90h.path.story.traveller')
    default:
      return t('life90h.path.story.distance')
  }
}
function trackStory(id: TrackId): string {
  if (id === 'PARTNERSHIP') return t('life90h.path.story.partner')
  if (id === 'WORK') return t('life90h.path.story.work')
  return t('life90h.path.story.parent')
}

/** a pull of the Red Heart that is already a path of its own, before any title exists */
const LEANS: { key: RedHeartId; unless: RouteId | null }[] = [
  { key: 'basketballLove', unless: 'USSISHKIN_FOUNDER' },
  { key: 'terraceCulture', unless: 'ULTRAS' },
  { key: 'travelDrive', unless: 'TRAVELLER' },
  { key: 'historyMemory', unless: 'JOURNALIST' },
  { key: 'community', unless: null },
  { key: 'professionalFootball', unless: null },
]

function leanStory(key: RedHeartId): string {
  switch (key) {
    case 'basketballLove':
      return t('life90h.path.lean.basketball')
    case 'terraceCulture':
      return t('life90h.path.lean.terrace')
    case 'travelDrive':
      return t('life90h.path.lean.travel')
    case 'historyMemory':
      return t('life90h.path.lean.history')
    case 'community':
      return t('life90h.path.lean.community')
    default:
      return t('life90h.path.lean.play')
  }
}

const STATE_ORDER: Record<TrackVisualState, number> = { strong: 0, active: 1, emerging: 2, dormant: 3, locked: 4 }

/** the people a route's own apex names as its crew — only those he actually trusts */
function crewOf(state: LifeState, route: RouteId): string[] {
  const people = LIFE_ROUTES.find((row) => row.id === route)?.stages.find((stage) => stage.stage === 'apex')?.extra?.people
  if (!people) return []
  return Object.keys(state.relationships)
    .filter((who) => {
      const rel = relationshipOf(state, who)
      return rel.trust >= people.trustMin && rel.bond >= (people.bondMin ?? 0) && Boolean(CHARACTERS[who])
    })
    .slice(0, 3)
    .map((who) => characterName(who))
}

/**
 * לאן החיים הלכו, מצויר — every path is a branch off one trunk: the supporter he has been
 * since the shoulders of 1983.
 *
 *  · a supporter route — once somebody OFFERED it (`route:offered:`) it is `emerging`; a
 *    title taken is `active`; the top of the ladder is `strong`; a title put down is
 *    `dormant` (history, never erased — `leftFlag`).
 *  · a life track — partnership, work, parenthood — `active`, and `strong` at its last stage.
 *  · a lean — a pull of the Red Heart at its second band or higher that no route yet
 *    speaks for (a boy who keeps going to the hall is on a path before anybody names it).
 *
 * `locked` exists in the vocabulary and is not returned: a path nobody offered him is a
 * path he does not know about.
 */
export function lifeTrackVisualReading(state: LifeState): LifePathReading {
  const branches: PathBranch[] = []
  for (const route of LIFE_ROUTES) {
    const held = heldStage(state, route.id)
    const offered = ROUTE_STAGES.some((stage) => flagOn(state, offeredFlag(route.id, stage)))
    if (!held && !offered) continue
    const reached = ROUTE_STAGES.map((stage) => hasStage(state, route.id, stage))
    const left = flagOn(state, leftFlag(route.id))
    const visual: TrackVisualState = !held ? 'emerging' : left ? 'dormant' : held === 'apex' ? 'strong' : 'active'
    branches.push({
      id: `route:${route.id}`,
      kind: 'route',
      titleHe: route.titleHe,
      stageHe: !held ? t('life90h.path.offered') : left ? t('life90h.path.left') : route.stageTitlesHe[held],
      state: visual,
      stops: reached.map((on) => ({ reached: on })),
      milestonesHe: ROUTE_STAGES.filter((_, i) => reached[i]).map((stage) => route.stageTitlesHe[stage]),
      storyHe: !held ? t('life90h.path.story.offered') : left ? t('life90h.path.story.left') : routeStory(route.id),
      peopleHe: held ? crewOf(state, route.id) : [],
    })
  }
  for (const track of LIFE_TRACKS) {
    const stage = trackStageOf(state, track.id)
    if (!stage) continue
    const at = track.stages.findIndex((row) => row.id === stage.id)
    const partner = track.id === 'PARTNERSHIP' ? partnerId(state.flags) : null
    branches.push({
      id: `track:${track.id}`,
      kind: 'track',
      titleHe: track.titleHe,
      stageHe: stage.titleHe,
      state: at === track.stages.length - 1 ? 'strong' : 'active',
      stops: track.stages.map((_, i) => ({ reached: i <= at })),
      milestonesHe: track.stages.slice(0, at + 1).map((row) => row.titleHe),
      storyHe: trackStory(track.id),
      peopleHe: partner && CHARACTERS[partner] ? [characterName(partner)] : [],
    })
  }
  const heart = redHeartReading(state)
  const leans = LEANS.filter((lean) => {
    const pull = heart.find((row) => row.key === lean.key)
    if (!pull || pull.band < 2) return false
    return !(lean.unless && branches.some((row) => row.id === `route:${lean.unless}`))
  })
  // a lean is a whisper beside a life that already has names: at most two, and none once
  // there are five real branches on a phone-sized map
  for (const lean of leans.slice(0, Math.max(0, Math.min(2, 5 - branches.length)))) {
    const pull = heart.find((row) => row.key === lean.key)!
    branches.push({
      id: `lean:${lean.key}`,
      kind: 'lean',
      titleHe: pull.labelHe,
      stageHe: t('life90h.path.pulls'),
      state: 'emerging',
      stops: [],
      milestonesHe: [],
      storyHe: leanStory(lean.key),
      peopleHe: [],
    })
  }
  branches.sort((a, b) => STATE_ORDER[a.state] - STATE_ORDER[b.state])
  const gate = GATE_HE[state.gate?.identity ?? 'gate7'] ?? null
  return {
    trunkHe: t('life90h.path.trunk'),
    trunkNoteHe: gate ?? '',
    branches,
  }
}

// ===================================================================================
// האנשים שלי — the constellation
// ===================================================================================

export type DistanceTier = 'inner' | 'close' | 'present' | 'distant' | 'fractured'

export type RelationshipNode = {
  id: CharacterId
  label: string
  tier: DistanceTier
  category: 'family' | 'friend' | 'romance' | 'other'
  /** the friction is real and current — drawn as a broken line, never as a figure */
  conflict: boolean
  /** a bond that is strong enough to be drawn in red */
  strong: boolean
  /** the one sentence `profile.ts` already says about the two of you */
  lineHe: string
  tierHe: string
  portrait: string | null
}

export type RelationshipMapReading = {
  nodes: RelationshipNode[]
  /** true when the part of life a partner would stand in is still empty and he is old enough for it to be a thing */
  romanceEmpty: boolean
}

/**
 * The tier is a DISTANCE, read off the two axes that make one: bond pulls in, tension and
 * distance push out, and trust that has gone while familiarity stayed is the fracture.
 * Coarse on purpose — five places to stand, not a percentage of closeness.
 */
export function distanceTierOf(state: LifeState, who: CharacterId): DistanceTier {
  const rel = relationshipOf(state, who)
  if (rel.tension >= 60 || (rel.trust <= 20 && rel.familiarity >= 50)) return 'fractured'
  if (rel.bond >= 70 && rel.tension < 45) return 'inner'
  if (rel.distance >= 55 && rel.bond < 55) return 'distant'
  if (rel.bond >= 45) return 'close'
  if (rel.bond >= 20 || rel.familiarity >= 40) return 'present'
  return 'distant'
}

function tierHe(tier: DistanceTier): string {
  switch (tier) {
    case 'inner':
      return t('life90h.people.tier.inner')
    case 'close':
      return t('life90h.people.tier.close')
    case 'present':
      return t('life90h.people.tier.present')
    case 'fractured':
      return t('life90h.people.tier.fractured')
    default:
      return t('life90h.people.tier.distant')
  }
}

/**
 * `cast` is the list the snapshot's profile already chose (the era's cast, filtered to the
 * people there is something between) — the constellation never introduces a stranger the
 * card did not. The partner, when there is one, is added: a partner is never a stranger.
 */
export function relationshipVisualReading(state: LifeState, cast: readonly CharacterId[]): RelationshipMapReading {
  const partner = partnerId(state.flags)
  const ids = [...new Set([...cast, ...(partner && CHARACTERS[partner] ? [partner] : [])])].filter((who) => {
    const category = CHARACTERS[who]?.category
    return category !== 'historical'
  })
  const portraits = eraFor(state.chapter).portraits ?? {}
  const nodes = ids.map((who): RelationshipNode => {
    const reading = relationshipReading(state, who)
    const tier = distanceTierOf(state, who)
    const def = CHARACTERS[who]
    const category: RelationshipNode['category'] =
      who === partner ? 'romance' : def?.category === 'family' ? 'family' : def?.category === 'friend' || def?.category === 'supporter' ? 'friend' : 'other'
    return {
      id: who,
      label: reading.nameHe,
      tier,
      category,
      conflict: reading.friction >= 2,
      strong: reading.close >= 2 && reading.friction < 2,
      lineHe: reading.lineHe,
      tierHe: tierHe(tier),
      portrait: portraitFor(reading.nameHe, portraits) ?? def?.portraitSet ?? null,
    }
  })
  const TIER_ORDER: Record<DistanceTier, number> = { inner: 0, close: 1, present: 2, fractured: 3, distant: 4 }
  nodes.sort((a, b) => TIER_ORDER[a.tier] - TIER_ORDER[b.tier])
  return { nodes, romanceEmpty: !partner && state.age >= 17 }
}

// ===================================================================================
// הסיפור שלי — the personal timeline
// ===================================================================================

export type StoryPresence = 'there' | 'partial' | 'missed' | 'none'

export type StoryRow = {
  id: string
  year: number
  dateHe: string
  titleHe: string
  /** the chapter he is standing in right now */
  now: boolean
  /** a day history hangs on — drawn a size larger */
  major: boolean
  presence: StoryPresence
  /** in the first person, because it is his */
  presenceHe: string | null
  /** what the day left, by name */
  keptHe: string[]
}

function presenceFirstPerson(mode: PresenceMode): string {
  switch (mode) {
    case 'inside':
      return t('life90h.story.mode.inside')
    case 'late':
      return t('life90h.story.mode.late')
    case 'outside':
      return t('life90h.story.mode.outside')
    case 'radio':
      return t('life90h.story.mode.radio')
    case 'television':
      return t('life90h.story.mode.television')
    case 'army':
      return t('life90h.story.mode.army')
    case 'working':
      return t('life90h.story.mode.working')
    case 'heard-from-friend':
      return t('life90h.story.mode.heard')
    case 'travelling':
      return t('life90h.story.mode.travelling')
    default:
      return t('life90h.story.mode.archive')
  }
}

const THERE_MODES: ReadonlySet<PresenceMode> = new Set(['inside', 'late'])

/** every chapter this life has actually lived, in the order it lived them */
export function livedChapters(state: LifeState): ChapterDef[] {
  const at = CHAPTERS.findIndex((row) => row.id === state.chapter)
  if (at < 0) return []
  return CHAPTERS.slice(0, at + 1).filter((row) => row.id === state.chapter || chapterOpen(row, state.flags))
}

/**
 * The biography of THIS run — not the club's history, his history inside it.
 *
 * One row per chapter he has lived. A chapter that owns its day of history (`anchorOwner`)
 * carries how he was there for it — in the first person, out of `presence` / attended /
 * missed, the same data `presenceReading` reads (and that reading's own rows are what this
 * one is checked against in the test). The objects a day left are named beside it, joined
 * by chapter from the Red Box's own view. The prologue opens the book when it was played.
 */
export function personalStoryReading(state: LifeState, things: readonly BoxThing[] = boxContents(state)): StoryRow[] {
  const rows: StoryRow[] = []
  if (state.flags['prologue:done']) {
    rows.push({
      id: 'prologue',
      year: state.identity.birthYear + 5,
      dateHe: String(state.identity.birthYear + 5),
      titleHe: t('life90h.story.prologue'),
      now: false,
      major: true,
      presence: 'there',
      presenceHe: t('life90h.story.prologueHow'),
      keptHe: [],
    })
  }
  const byYear = new Map<number, string>()
  for (const chapter of livedChapters(state)) {
    if (!byYear.has(chapter.year)) byYear.set(chapter.year, chapter.id)
    const owns = anchorOwner(chapter.anchorKey) === chapter.id
    const now = chapter.id === state.chapter
    const mode = owns ? state.presence[chapter.anchorKey] ?? null : null
    const attended = owns && state.attendedAnchors.includes(chapter.anchorKey)
    const missed = owns && state.missedAnchors.includes(chapter.anchorKey)
    const presence: StoryPresence = mode
      ? THERE_MODES.has(mode) || (attended && mode === 'outside')
        ? 'there'
        : 'partial'
      : attended
        ? 'there'
        : missed
          ? 'missed'
          : 'none'
    const presenceHe = mode
      ? presenceFirstPerson(mode)
      : attended
        ? t('life90h.story.there')
        : missed
          ? t('life90h.story.missed')
          : null
    rows.push({
      id: chapter.id,
      year: chapter.year,
      dateHe: chapter.dateHe,
      titleHe: chapter.titleHe,
      now,
      major: owns && chapter.stage !== 'A',
      presence,
      presenceHe,
      keptHe: [],
    })
  }
  for (const thing of things) {
    const chapter = thing.chapter ?? byYear.get(thing.year) ?? null
    const row = rows.find((entry) => entry.id === chapter)
    if (row && row.keptHe.length < 2 && thing.kind !== 'nothing') row.keptHe.push(thing.nameHe || thing.titleHe || '')
  }
  return rows
}

// ===================================================================================
// התיק שלי — the bag
// ===================================================================================

export type SubscriptionCard = {
  seasonHe: string
  gateHe: string | null
  categoryHe: string | null
  /** the run as a sentence — `עונה שלישית, בלי להפסיק` */
  runHe: string | null
  /** older seasons, newest first, drawn as cards stacked behind it */
  olderHe: string[]
}

function runWords(streak: number): string | null {
  switch (streak) {
    case 0:
    case 1:
      return null
    case 2:
      return t('life90h.sub.run2')
    case 3:
      return t('life90h.sub.run3')
    case 4:
      return t('life90h.sub.run4')
    case 5:
      return t('life90h.sub.run5')
    default:
      return t('life90h.sub.runMany')
  }
}

/** the season card in his hand, as an object — or null when his hand is empty */
export function subscriptionCardReading(sub: SubscriptionReading | null | undefined): SubscriptionCard | null {
  if (!sub || !sub.currentHe) return null
  const season = seasonFor(sub.currentHe)
  return {
    seasonHe: sub.currentHe,
    gateHe: season?.gateHe ?? null,
    categoryHe: season?.categoryHe ?? null,
    runHe: runWords(sub.streak),
    olderHe: sub.seasonsHe.filter((id) => id !== sub.currentHe).slice(-3).reverse(),
  }
}

export type MemoryThing = BoxThing & {
  /** the Red Box row behind it, when it is one — the share button needs it */
  keepsake: KeepsakeReading | null
  /** a word about provenance, printed only when it is not `common` */
  rarityHe: string | null
}

/** the box, joined to the keepsake rows that can be shared and carry a provenance word */
export function memoryDrawerReading(state: LifeState): MemoryThing[] {
  const keepsakes = new Map(redBoxReading(state).map((row) => [row.id, row]))
  return boxContents(state).map((thing) => {
    const keepsake = keepsakes.get(thing.id) ?? null
    return { ...thing, keepsake, rarityHe: keepsake?.standout ? keepsake.rarityHe : null }
  })
}

export type BagOverview = {
  carried: CarriedReading[]
  wardrobe: WardrobeReading[]
  memories: MemoryThing[]
  purses: PurseReading[]
  card: SubscriptionCard | null
}

/**
 * הארון בסדר שבו החולצות נכנסו לחיים — the registry lists Maor's photographs first and
 * the archive after, which is a filing order, not a wardrobe. A rail reads oldest → newest,
 * by the chapter each shirt first hangs in (`Shirt.from`), registry order breaking ties.
 */
export function wardrobeInOrder(state: LifeState): WardrobeReading[] {
  const rows = wardrobeReading(state)
  const when = (id: string) => {
    const shirt = SHIRTS.find((row) => row.id === id)
    const at = shirt ? chapterIndex(shirt.from) : -1
    return at < 0 ? Number.MAX_SAFE_INTEGER : at
  }
  const bought = rows.map((row, i) => ({ row, i, at: when(row.id) }))
  // delta 91 — the shirt he made himself hangs on the same rail, in the chapter it was made
  const crafted = craftedWardrobe(state).map((garment, i) => ({
    row: {
      id: garment.outputId,
      nameHe: t('life91m.bag.crafted'),
      sponsorHe: '',
      yearsHe: String(chapterFor(garment.madeIn)?.year ?? ''),
      noteHe: garment.worn ? t('life91m.bag.craftedWorn') : t('life91m.bag.craftedOnChair'),
      art: '',
      spec: undefined,
      wornHe: [],
      craft: garment.data,
      craftedHe: garment.worn ? t('life91m.bag.craftedWorn') : t('life91m.bag.craftedOnChair'),
    } satisfies WardrobeReading,
    i: rows.length + i,
    at: chapterIndex(garment.madeIn) < 0 ? Number.MAX_SAFE_INTEGER : chapterIndex(garment.madeIn) + 0.5,
  }))
  return [...bought, ...crafted].sort((a, b) => a.at - b.at || a.i - b.i).map(({ row }) => row)
}

/**
 * The bag, composed once per opening — every compartment reads from here, so the face of a
 * compartment and the drawer behind it can never disagree about what is inside. Counts are
 * for the DRAWING (how many objects to lay on a compartment) and are never printed — the
 * same contract as `CarriedReading.copies`.
 */
export function bagOverviewReading(state: LifeState, sub: SubscriptionReading | null | undefined): BagOverview {
  return {
    carried: carriedReading(state),
    wardrobe: wardrobeInOrder(state),
    memories: memoryDrawerReading(state),
    purses: purseReading(state),
    card: subscriptionCardReading(sub),
  }
}

/** a stable tilt in whole degrees, −2…+2, from an id — never `Math.random` (§22, §51) */
export function tiltOf(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) | 0
  return (Math.abs(h) % 5) - 2
}

