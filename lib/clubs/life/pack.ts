/**
 * One club's universal LIFE, composed from what its pack actually holds.
 *
 * A read-model over `ClubData`, like every other game: the nights come from the club's eligible
 * archive — the same rows the timeline game may deal (approved, sourced, confidence ≥ 2, an
 * available and checked source) — and nothing here reads a raw pack, parses a page or adds a fact.
 */
import type {ClubData} from '@/lib/clubs/contract'
import {REGISTRY} from '@/lib/master/registry'
import {composeLife} from '@/lib/life/universal/compose'
import type {ArchiveRef, LifePack, MatchFacts} from '@/lib/life/universal/types'
import {LIFE_ANCHORS, LIFE_CAST, LIFE_MATCH_DETAIL, LIFE_TIMELINE} from './packs'
import {clubSkin} from './skins'
import {clubWorld} from '@/lib/clubs/world'
import {ritualFor} from '@/lib/life/universal/ritual'

const scriptOf = (s: string, fallback: string) => /[֐-׿]/.test(s) ? 'he' : /[Ͱ-Ͽ]/.test(s) ? 'el' : fallback === 'he' || fallback === 'el' ? 'en' : fallback

/** The archive rows a life may stand on: exact days from the dealt timeline, honours known only by year from the archive. */
export function lifeAnchors(data: Pick<ClubData, 'archive' | 'timeline' | 'sources' | 'locales'>): ArchiveRef[] {
  const byId = new Map(data.sources.map(s => [s.id, s]))
  const sourcesOf = (ids: readonly string[]) => ids.flatMap(id => { const s = byId.get(id); return s ? [{title: s.title, publisher: s.publisher, url: s.url}] : [] })
  const dated: ArchiveRef[] = data.timeline.filter(f => f.status === 'approved' && f.confidence >= 2).map(f => ({
    factId: f.id, title: f.value.title, on: f.value.on, year: Number(f.value.on.slice(0, 4)), precision: 'day' as const,
    hint: f.value.hint ?? '', locale: scriptOf(f.value.title, data.locales.content), sources: sourcesOf(f.sources),
  }))
  const yearly: ArchiveRef[] = data.archive
    .filter(f => f.status === 'approved' && f.confidence >= 2 && f.value.precision === 'year' && Number.isInteger(f.value.year) && f.sources.length > 0
      && f.sources.every(id => { const s = byId.get(id); return s?.access === 'available' && !!s.checkedAt }))
    .map(f => ({factId: f.id, title: f.value.name, on: null, year: f.value.year!, precision: 'year' as const, hint: f.value.hint, locale: scriptOf(f.value.name, data.locales.content), sources: sourcesOf(f.sources)}))
  return [...dated, ...yearly]
}
/**
 * The club's own match on a day, from its approved match records (`ClubData.matches`, confidence ≥ 2): the two sides as
 * recorded, the score, the side the club was on, and — where the records hold them — who scored for the club and when
 * (its own match row, or the goal records of that day when they account for every goal). Only a day with exactly ONE
 * recorded match is answered: two matches on one day is a question, not a fact. Used for the nights the pack curated
 * whose own title is not a scoreline (a row called "Minute 86" still stands on a recorded match).
 */
export function lifeMatches(data: Pick<ClubData, 'matches' | 'goals'>): Record<string, MatchFacts> {
  type Row = {on?: string; home?: string; away?: string; homeGoals?: number; awayGoals?: number; us?: string | null; scorers?: {name: string; minute: number | null}[]; lineup?: string[]}
  const byDay = new Map<string, Row[]>()
  for (const f of data.matches ?? []) {
    const v = f.value as unknown as Row
    if (f.status !== 'approved' || f.confidence < 2 || !v.on || !/^\d{4}-\d{2}-\d{2}$/.test(v.on)) continue
    if (!v.home || !v.away || !Number.isInteger(v.homeGoals) || !Number.isInteger(v.awayGoals) || (v.us !== 'home' && v.us !== 'away')) continue
    byDay.set(v.on, [...(byDay.get(v.on) ?? []), v])
  }
  // the goal records of a day: the club's scorer is the last man of the club to touch it, the minute what the record says
  type Goal = {on?: string; name?: string; subtitle?: string; sequence?: {actor: string | null; side: string; action: string}[]}
  const FINISH = /shot|header|volley|finish|penalty|tap|lob|chip/i
  const goalsOn = new Map<string, {name: string; minute: number | null}[]>()
  for (const f of data.goals ?? []) {
    const g = f.value as unknown as Goal
    if (f.status !== 'approved' || f.confidence < 2 || !g.on) continue
    const last = [...(g.sequence ?? [])].reverse().find(x => x.side === 'club' && x.actor && FINISH.test(x.action))
    if (!last?.actor) continue
    const m = /(?:דקה|minute)\s*(\d{1,3})|(\d{1,3})\s*['′]/i.exec(`${g.subtitle ?? ''} ${g.name ?? ''}`)
    goalsOn.set(g.on, [...(goalsOn.get(g.on) ?? []), {name: last.actor, minute: m ? Number(m[1] ?? m[2]) : null}])
  }
  const out: Record<string, MatchFacts> = {}
  for (const [day, rows] of byDay) {
    if (rows.length !== 1) continue
    const v = rows[0]!, us = v.us as 'home' | 'away', ours = us === 'home' ? v.homeGoals! : v.awayGoals!, theirs = us === 'home' ? v.awayGoals! : v.homeGoals!
    const own = (v.scorers ?? []).filter(x => x && typeof x.name === 'string')
    const fromGoals = goalsOn.get(day) ?? []
    const scorers = own.length === ours ? own.map(x => ({name: x.name, minute: Number.isInteger(x.minute) ? x.minute : null})) : fromGoals.length === ours ? fromGoals : []
    out[day] = {home: v.home!, away: v.away!, homeGoals: v.homeGoals!, awayGoals: v.awayGoals!, us, result: ours > theirs ? 'won' : ours < theirs ? 'lost' : 'drew', note: null,
      ...(scorers.length || (v.lineup?.length ?? 0) === 11 ? {detail: {scorers, lineup: (v.lineup?.length ?? 0) === 11 ? v.lineup! : [], bench: []}} : {})}
  }
  return out
}

const cache = new Map<string, LifePack>()

/** `season: false` composes the life without Season One — the shared chapters from the first age on (tests and tools only). */
export function clubLife(data: ClubData, story: {locale?: 'en' | 'he'; season?: boolean} = {}): LifePack {
  const key = `${data.identity.id}:${data.version}:${story.locale ?? 'en'}:${story.season === false ? 'no-season' : 'season'}`
  const hit = cache.get(key)
  if (hit) return hit
  const club = REGISTRY.find(c => c.id === data.identity.id)
  if (!club) throw new Error('LIFE_CLUB_NOT_IN_REGISTRY')
  const {skin, issues} = clubSkin(club)
  const id = club.id, has = <T,>(table: Record<string, T>) => Object.hasOwn(table, id) ? table[id]! : null
  const pending: string[] = []
  if (skin.crest !== 'real') pending.push('The crest is a monogram of the club\'s initials: no licensed crest artwork is in the pack.')
  if (!skin.stadium) pending.push('No approved ground name in the pack: signs say "the ground".')
  const cast = has(LIFE_CAST)
  if (!cast) pending.push('The family and the street have no names yet: roles keep their own word.')
  else if (cast.status !== 'approved') pending.push(`Cast names are ${cast.status}, not owner-approved.`)
  const selection = has(LIFE_ANCHORS)
  const pack = composeLife({
    club: {id, name: data.identity.name, city: data.identity.city, country: data.identity.country},
    aliases: selection?.aliases ?? [],
    skin, skinIssues: issues, skinPending: pending,
    cast, timeline: has(LIFE_TIMELINE), selection,
    anchors: lifeAnchors(data), details: has(LIFE_MATCH_DETAIL) ?? undefined, matches: lifeMatches(data), dataVersion: data.version,
    storyLocale: story.locale,
    ...(story.season === false ? {season: false} : {}),
    culture: clubWorld(id)?.culture ?? [],
    ritual: ritualFor(id),
  })
  cache.set(key, pack)
  return pack
}
