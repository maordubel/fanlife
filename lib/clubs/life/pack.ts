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
import type {ArchiveRef, LifePack} from '@/lib/life/universal/types'
import {LIFE_ANCHORS, LIFE_CAST, LIFE_MATCH_DETAIL, LIFE_TIMELINE} from './packs'
import {clubSkin} from './skins'

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

const cache = new Map<string, LifePack>()

export function clubLife(data: ClubData, story: {locale?: 'en' | 'he'} = {}): LifePack {
  const key = `${data.identity.id}:${data.version}:${story.locale ?? 'en'}`
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
    anchors: lifeAnchors(data), details: has(LIFE_MATCH_DETAIL) ?? undefined, dataVersion: data.version,
    storyLocale: story.locale,
  })
  cache.set(key, pack)
  return pack
}
