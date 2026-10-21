/**
 * LIFE · RUSH — the Fitter: one template, one club, one answer.
 *
 * There is no pilot club. Every template is fitted to every club through that club's own approved
 * archive, and the answer is one of four states:
 *   READY       every critical need met and an archive night bound — the mission prints its date
 *   NEUTRAL     every critical need met, no night bound — the mission plays with no date and no name
 *   HELD        a critical need the archive does not hold yet — the mission waits, research is asked
 *   IRRELEVANT  a critical need whose absence is the club's own story — the mission is not in this life
 *
 * Whatever is missing becomes a research task that says what, why, how critical, and where it is
 * usually found. The Fitter is pure and deterministic: same view, same answer.
 */
import type {ArchiveRef} from '../universal/types'
import {kindsOf, readArchive, type ClubArchiveView, type ReadArchive} from './archive'
import type {AnchorKind, ClubNeed, Grade, MissionSpec, MissionTemplate, Need} from './spec'
import {MISSION_TEMPLATES, TEMPLATE_HE} from './templates'

export type FitState = 'READY' | 'NEUTRAL' | 'HELD' | 'IRRELEVANT'

export type ResearchTask = {
  clubId: string
  template: string
  grade: Grade
  /** what to find, in one line */
  want: string
  why: string
  /** where this kind of record is usually found, as the research method's own source pairs */
  find: string
}

export type Fit = {
  clubId: string
  template: string
  state: FitState
  /** the archive night the mission stands on (READY only) — the row exactly as approved */
  anchor: ArchiveRef | null
  /** how much this mission belongs to this club's story (higher first) */
  relevance: number
  /** needs not met, with the research that would meet them */
  research: ResearchTask[]
}

const GRADE_WEIGHT: Record<Grade, number> = {critical: 100, enriching: 10, decor: 1}

/** Where each kind of record is found — the pairs the club research method already trusts. */
const WHERE: Record<AnchorKind | ClubNeed, string> = {
  match: 'the club\'s fixtures archive, cross-checked with a national-league record (RSSSF or the FA)',
  home: 'the club\'s fixtures archive with the venue named, plus a second publisher for the date',
  away: 'the club\'s fixtures archive with the venue named, plus a second publisher for the date',
  derby: 'the meetings with the approved rival in the match archive, dated by two publishers',
  final: 'the competition\'s own record (UEFA or the national FA) plus RSSSF',
  europe: 'the UEFA match centre plus RSSSF',
  title: 'the league\'s honours list (RSSSF) plus the club museum or history page; the deciding day from a match report',
  relegation: 'the league tables by season (RSSSF) plus the club\'s history page',
  promotion: 'the league tables by season (RSSSF) plus the club\'s history page',
  ground: 'the club\'s history page plus the ground\'s own page, for the opening or move date',
  founding: 'the club museum plus the national record of the club\'s registration',
  rival: 'an owner-approved primary rival in the club identity file',
  city: 'the club identity file',
}

const satisfies = (row: ReadArchive['rows'][number], need: Need): boolean =>
  'anchor' in need.of && need.of.anchor.some(k => row.kinds.has(k)) && (!need.day || row.ref.precision === 'day')

const clubHas = (view: ClubArchiveView, need: ClubNeed): boolean =>
  need === 'rival' ? !!view.rival : need === 'ground' ? !!view.ground : !!view.city

const met = (read: ReadArchive, need: Need): boolean =>
  'club' in need.of ? clubHas(read.view, need.of.club) : read.rows.some(r => satisfies(r, need))

/** A stable 32-bit hash, so ties between equal nights break the same way every build. */
function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

function want(need: Need): string {
  if ('club' in need.of) return need.of.club === 'rival' ? 'an approved primary rival' : need.of.club === 'ground' ? 'the recorded home ground' : 'the club\'s city'
  const kinds = need.of.anchor.join(' or ')
  return need.day ? `a ${kinds} night dated to the day` : `a recorded ${kinds}`
}

function whereFor(need: Need): string {
  const keys: (AnchorKind | ClubNeed)[] = 'club' in need.of ? [need.of.club] : need.of.anchor
  return [...new Set(keys.map(k => WHERE[k]))].join('; ')
}

/** The best night for a template: most needs met (by grade), a known day, a readable score, then the template's taste. */
function bestNight(read: ReadArchive, t: MissionTemplate, taken: ReadonlySet<string>): ArchiveRef | null {
  const anchorNeeds = t.needs.filter(n => 'anchor' in n.of)
  if (!anchorNeeds.length) return null
  let best: {ref: ArchiveRef; score: number; tie: number} | null = null
  for (const row of read.rows) {
    const meets = anchorNeeds.filter(n => satisfies(row, n))
    if (!meets.length) continue
    let score = meets.reduce((s, n) => s + GRADE_WEIGHT[n.grade], 0)
    score += row.ref.precision === 'day' ? 3 : 0
    score += row.ref.match ? 2 : 0
    for (const k of row.kinds) score += t.weight[k] ?? 0
    if (taken.has(row.ref.factId)) score -= 50 // another mission already stands on this night
    const tie = hash(`${t.id}|${row.ref.factId}`)
    if (!best || score > best.score || (score === best.score && tie < best.tie)) best = {ref: row.ref, score, tie}
  }
  return best?.ref ?? null
}

function relevanceOf(read: ReadArchive, t: MissionTemplate): number {
  let r = 0
  for (const [k, w] of Object.entries(t.weight) as [AnchorKind, number][]) r += w * Math.log2(1 + read.counts[k])
  return Math.round(r * 100) / 100
}

export function fitTemplate(read: ReadArchive, t: MissionTemplate, taken: ReadonlySet<string> = new Set()): Fit {
  const clubId = read.view.clubId
  const missing = t.needs.filter(n => !met(read, n))
  const research: ResearchTask[] = missing.map(n => ({clubId, template: t.id, grade: n.grade, want: want(n), why: n.why, find: whereFor(n)}))
  const criticalMissing = missing.filter(n => n.grade === 'critical')
  const base = {clubId, template: t.id, relevance: relevanceOf(read, t), research}
  if (criticalMissing.length) {
    const irrelevant = criticalMissing.every(n => n.absentMeans === 'irrelevant')
    // an irrelevant mission asks for no research: its absence is not a gap
    return {...base, state: irrelevant ? 'IRRELEVANT' : 'HELD', anchor: null, research: irrelevant ? [] : research}
  }
  // a night is bound only when it meets every anchor need the template marks critical
  const anchor = bestNight(read, t, taken)
  const criticalAnchors = t.needs.filter(n => n.grade === 'critical' && 'anchor' in n.of)
  const row = anchor ? read.rows.find(r => r.ref === anchor)! : null
  const bound = row && criticalAnchors.every(n => satisfies(row, n)) && t.needs.some(n => 'anchor' in n.of && satisfies(row, n)) ? anchor : null
  return {...base, state: bound ? 'READY' : 'NEUTRAL', anchor: bound}
}

/** Every template for one club, ordered by how much each belongs to this club's story. */
export function fitClub(view: ClubArchiveView, templates: readonly MissionTemplate[] = MISSION_TEMPLATES): Fit[] {
  const read = readArchive(view)
  const order = [...templates].sort((a, b) => relevanceOf(read, b) - relevanceOf(read, a) || a.id.localeCompare(b.id))
  const taken = new Set<string>()
  const fits = new Map<string, Fit>()
  for (const t of order) {
    const fit = fitTemplate(read, t, taken)
    if (fit.anchor) taken.add(fit.anchor.factId)
    fits.set(t.id, fit)
  }
  return order.map(t => fits.get(t.id)!)
}

export const playable = (f: Fit): boolean => f.state === 'READY' || f.state === 'NEUTRAL'

/* ───────────── the spec LIFE hands RUSH ───────────── */

const WORDS = {rival: 'the old rivals', ground: 'the ground'} as const

function fillText(s: string, view: ClubArchiveView, anchor: ArchiveRef | null): string {
  const date = anchor ? (anchor.precision === 'day' && anchor.on ? anchor.on : String(anchor.year)) : ''
  const vars: Record<string, string> = {club: view.name, city: view.city, rival: view.rival?.name ?? WORDS.rival, ground: view.ground ?? WORDS.ground, date}
  return s.replace(/\{(\w+)\}/g, (whole, key: string) => {
    if (!Object.hasOwn(vars, key)) throw new Error(`RUSH_TEXT_TOKEN_UNKNOWN: ${whole}`)
    return vars[key]!
  })
}

/** Atmosphere only, never printed as a fact: the month of a dated night sets the sky. */
function weatherOf(anchor: ArchiveRef | null): MissionSpec['weather'] {
  const m = anchor?.precision === 'day' && anchor.on ? Number(anchor.on.slice(5, 7)) : 0
  return m === 12 || m === 1 || m === 2 ? 'cold' : m === 3 || m === 11 ? 'rain' : m === 7 || m === 8 ? 'heat' : 'clear'
}

export type SpecContext = {seed: number; skin: string; age: number; mandatory: boolean; time: 'day' | 'night'; locale?: 'en' | 'he'}

/** A playable fit becomes the one object RUSH receives. HELD and IRRELEVANT fits have no spec. */
export function specFor(t: MissionTemplate, fit: Fit, view: ClubArchiveView, ctx: SpecContext): MissionSpec {
  if (!playable(fit)) throw new Error(`RUSH_NOT_PLAYABLE: ${t.id} is ${fit.state} for ${view.clubId}`)
  if (ctx.age < t.ages[0] || ctx.age > t.ages[1]) throw new Error(`RUSH_AGE: ${t.id} is for ages ${t.ages[0]}–${t.ages[1]}, not ${ctx.age}`)
  const anchor = fit.state === 'READY' ? fit.anchor : null
  const text = ctx.locale === 'he' && TEMPLATE_HE[t.id] ? TEMPLATE_HE[t.id]! : t
  return {
    template: t.id, verb: t.verb, camera: t.camera, route: t.route, seed: ctx.seed >>> 0, skin: ctx.skin,
    age: ctx.age, time: ctx.time, weather: weatherOf(anchor), clock: t.clock, hazards: [...t.hazards],
    difficulty: ctx.age < 12 ? 0 : ctx.age < 18 ? 1 : 2, mandatory: ctx.mandatory, anchor,
    title: fillText(anchor ? text.title : text.neutralTitle, view, anchor),
    brief: fillText(anchor ? text.brief : text.neutralBrief, view, anchor),
  }
}

/* ───────────── a mission inside a chapter ───────────── */

/**
 * A mission asked for by a CHAPTER stands on that chapter's night, never on another one: a universal
 * chapter states an age and never a year, so a mission played inside it is the neutral version even
 * when the club's archive holds the perfect night elsewhere. An anchored night chapter lends its own
 * row, and only when the row is the kind the template needs (a derby raid on a derby, not a cup tie).
 * A mission the club cannot play at all (HELD, IRRELEVANT) stays unplayable here too.
 */
export function chapterFit(t: MissionTemplate, clubFit: Fit, chapterAnchor: ArchiveRef | null, view: Pick<ClubArchiveView, 'rival' | 'ownNames'>): Fit {
  if (!playable(clubFit)) return clubFit
  if (chapterAnchor) {
    const kinds = new Set(kindsOf(chapterAnchor, view))
    const row = {ref: chapterAnchor, kinds}
    const anchorNeeds = t.needs.filter(n => 'anchor' in n.of)
    const critical = anchorNeeds.filter(n => n.grade === 'critical')
    if (anchorNeeds.some(n => satisfies(row, n)) && critical.every(n => satisfies(row, n))) return {...clubFit, state: 'READY', anchor: chapterAnchor}
  }
  return {...clubFit, state: 'NEUTRAL', anchor: null}
}
