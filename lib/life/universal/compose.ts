/**
 * LIFE, universal — the composer.
 *
 * Takes what a club pack actually holds — its registry row, its skin, its cast names, and the
 * rows of its archive that are approved and sourced — and returns one playable life.
 *
 * What it will not do is the whole design:
 *  · it never states a year for a universal chapter. A universal chapter has an AGE. Only a row
 *    of the archive carries a date, and it is printed as the archive recorded it;
 *  · it never invents a match. With no archive rows a life still plays — every chapter of it
 *    fiction about one family — and the pack says PARTIAL, with the reasons;
 *  · it never claims to be finished. `provenance.kind` is `generated-from-anchors`, and the
 *    culture a club is entitled to (its food, its songs, its way to the ground) stays `pending`
 *    until somebody who knows that terrace has written it and the owner has approved it.
 */
import {buildCast, HERO_LOOKS, type CastManifest} from './cast'
import {UNIVERSAL_CHAPTERS} from './content'
import {nightChapter, readResult} from './content/night'
import {ROOMS} from './rooms'
import type {VoxelSkin} from './skin'
import {fillChapter, type Vars} from './text'
import type {ArchiveRef, CardDef, Chapter, LifePack, LifeReadiness} from './types'
import {validateChapter, lifeFlagsOf} from './validate'

export type TimelineManifest = {schemaVersion: 1; clubId: string; birthYear: number; status: string; note?: string}
/** `nights` name archive rows by fact id or by the ISO day the archive records; `aliases` are other names the archive writes the club by. */
export type AnchorSelection = {schemaVersion: 1; clubId: string; status: string; nights: string[]; aliases?: string[]; note?: string}

export type ComposeInput = {
  club: {id: string; name: string; city: string; country: string}
  /** other names the archive writes the club by, so a recorded scoreline can be read */
  aliases?: string[]
  skin: VoxelSkin
  skinIssues: string[]
  skinPending: string[]
  cast: CastManifest | null
  timeline: TimelineManifest | null
  selection: AnchorSelection | null
  /** approved, sourced, confidence ≥ 2 — eligibility is decided by the club compiler, not here */
  anchors: ArchiveRef[]
  /** the club's data version: a new archive is a new pack */
  dataVersion: string
}

export const ANCHOR_TARGET = 8
export const MAX_NIGHTS = 5
/** With no approved timeline, the life is placed so that the archive's nights fall in its adult years. */
const DEFAULT_AGE_AT_NIGHT = 38
const FIRST_AGE = 5

function hash(s: string): string {
  let a = 2166136261, b = 16777619
  for (let i = 0; i < s.length; i++) { a ^= s.charCodeAt(i); a = Math.imul(a, 16777619); b = Math.imul(b ^ s.charCodeAt(i), 2246822519) }
  return ((a >>> 0).toString(16).padStart(8, '0') + (b >>> 0).toString(16).padStart(8, '0'))
}

const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]! }

/** Up to `max`, spread over the span: the first, the last, and what lies evenly between. */
function spread<T>(items: T[], max: number): T[] {
  if (items.length <= max) return items
  return Array.from({length: max}, (_, i) => items[Math.round(i * (items.length - 1) / (max - 1))]!)
}

export function composeLife(input: ComposeInput): LifePack {
  const {club, skin} = input
  const cast = buildCast(input.cast && input.cast.clubId === club.id ? input.cast : null)
  const given = (id: string, fallback: string) => { const v = input.cast?.clubId === club.id ? input.cast.names[id] : undefined; return typeof v === 'string' && v.trim() ? v.trim() : fallback }
  const vars: Vars = {
    club: club.name, short: skin.short.charAt(0) + skin.short.slice(1).toLowerCase(), city: club.city,
    ground: skin.stadium ?? 'the ground',
    friend: cast.friend!.name, kiosk: cast.kiosk!.name, elder: cast.elder!.name, rival: cast.rival!.name, teacher: cast.teacher!.name,
    boss: cast.boss!.name, mate: cast.mate!.name, seller: cast.seller!.name, child: cast.child!.name,
    dadName: given('dad', 'your father'), mumName: given('mum', 'your mother'),
  }

  const dated = input.anchors.filter(a => a.precision === 'day' && a.on).sort((a, b) => a.on!.localeCompare(b.on!))
  const yearly = input.anchors.filter(a => a.precision === 'year').sort((a, b) => a.year - b.year)
  const timelineOk = input.timeline?.clubId === club.id && Number.isInteger(input.timeline.birthYear)
  const birthYear = timelineOk ? input.timeline!.birthYear : dated.length ? median(dated.map(a => a.year)) - DEFAULT_AGE_AT_NIGHT : null
  const ageAt = (year: number) => birthYear === null ? null : year - birthYear

  // the nights: the pack's own choice among its approved rows, else an even spread of them
  const chosen = input.selection?.clubId === club.id ? input.selection.nights.map(id => dated.find(a => a.factId === id || a.factId.endsWith(':' + id) || a.on === id)).filter((a): a is ArchiveRef => !!a) : []
  const nightRows = (chosen.length ? chosen : spread(dated, MAX_NIGHTS)).filter(a => { const age = ageAt(a.year); return age !== null && age >= FIRST_AGE })
  // the short name is never used to read a scoreline: "Hapoel" is half the league
  const names = [club.name, ...(input.aliases ?? [])]
  const nights = nightRows.map((a, i) => nightChapter(a, ageAt(a.year)!, readResult(a.title, names), i + 1))

  const universal = UNIVERSAL_CHAPTERS.map(c => c)
  const lastAge = Math.max(...universal.map(c => c.age), ...nights.map(c => c.age), 0)
  // one life, in the order it was lived: by age, a night after the ordinary day of the same age
  const ordered = [...universal.map((c, i) => ({c, k: c.age, o: i, night: 0})), ...nights.map((c, i) => ({c, k: c.age, o: i, night: 1}))]
    .sort((a, b) => a.c.id === 'finale' ? 1 : b.c.id === 'finale' ? -1 : a.k - b.k || a.night - b.night || a.o - b.o)
    .map(x => x.c.id === 'finale' ? {...x.c, age: Math.max(x.c.age, lastAge)} : x.c)

  // a year the archive knows only as a year becomes a card before the chapter of that age — a line from the club's book, not a scene
  const preludes = new Map<string, CardDef[]>()
  for (const a of yearly) {
    const age = ageAt(a.year)
    if (age === null || age < FIRST_AGE) continue
    const host = ordered.find(c => c.age >= age) ?? ordered[ordered.length - 1]
    if (!host) continue
    const list = preludes.get(host.id) ?? []
    list.push({id: `year-${a.factId}`, kicker: `You were ${age}`, title: a.title, body: a.hint, archive: a})
    preludes.set(host.id, list)
  }

  const chapters: Chapter[] = ordered.map(c => fillChapter({...c, prelude: preludes.get(c.id)}, vars))
  const rooms = Object.fromEntries(Object.entries(ROOMS).filter(([id]) => chapters.some(c => c.start.room === id || c.cast.some(p => p.room === id) || c.doors.some(d => d.room === id || d.to === id) || c.spots.some(s => s.room === id) || c.beats.some(b => b.room === id) || JSON.stringify(c.talks).includes(`"room":"${id}"`))))

  const issues: string[] = [], earlier = new Set<string>()
  for (const c of chapters) { issues.push(...validateChapter({rooms, cast}, c, earlier)); lifeFlagsOf(c).forEach(k => earlier.add(k)) }

  const reasons: string[] = []
  if (!universal.length) reasons.push('No universal chapters are available.')
  if (issues.length) reasons.push(`${issues.length} chapter fault(s): ${issues[0]}`)
  if (input.skinIssues.length) reasons.push(`Club skin: ${input.skinIssues.join(', ')}`)
  if (dated.length < ANCHOR_TARGET) reasons.push(`${ANCHOR_TARGET - dated.length} more approved, exact-date archive rows needed for a full life (${dated.length} of ${ANCHOR_TARGET}).`)
  reasons.push('Club culture (matchday habits, food, songs, the way to the ground) is not written yet: the life is told in universal beats and awaits a culture pass and owner approval.')
  for (const p of input.skinPending) reasons.push(p)
  if (!timelineOk) reasons.push(birthYear === null ? 'No archive row with a date: the life has no nights from history yet.' : 'The supporter\'s birth year is the composer\'s default; the pack has not set one.')
  const broken = !universal.length || issues.length > 0 || input.skinIssues.length > 0
  const readiness: LifeReadiness = {state: broken ? 'LOCKED' : 'PARTIAL', playable: !broken, reasons, anchors: dated.length, target: ANCHOR_TARGET}

  return {
    schemaVersion: 1,
    version: hash(JSON.stringify({v: input.dataVersion, chapters: chapters.map(c => c.id), skin, cast, birthYear, text: chapters})),
    clubId: club.id,
    club: {name: club.name, short: skin.short, city: club.city, country: club.country},
    skin, cast,
    hero: {birthYear, looks: HERO_LOOKS},
    chapters, rooms, readiness,
    anchors: [...nightRows, ...yearly.filter(a => { const age = ageAt(a.year); return age !== null && age >= FIRST_AGE })],
    provenance: {kind: 'generated-from-anchors', universalChapters: universal.length, anchoredChapters: nights.length, cultureDna: 'pending'},
  }
}
