/**
 * LIFE · the hood — the STUDIO BRIDGE: which interstitials the story needs from the film studio, per club.
 *
 * Derived, never typed by hand: one title card per chapter, one time-advance bridge wherever the spine moves the
 * life on, one matchday opener per matchday chapter. A request carries the archive night only when the Fitter
 * bound one (`night.ts`), with the row's own title and sources, so the studio prints nothing it was not handed.
 * This is a REQUEST list: nothing here renders, uploads or publishes (`scripts/life/transition-requests.ts` writes it).
 */
import {missionById, SPINE} from './director'
import {nightFor, type ChapterFits} from './night'
import type {Mission} from './types'
import {storyWord} from './words'

export type TransitionKind = 'chapter-card' | 'time-bridge' | 'matchday-opener'
export type RequestNight = {factId: string; on: string | null; year: number; precision: 'day' | 'year'; title: string; locale: string; sources: {title: string; publisher: string; url: string | null}[]}
export type TransitionRequest = {
  id: string
  club: string
  chapter: string
  kind: TransitionKind
  stage: string
  age: number
  /** the archive night, exactly as approved; null when the chapter is personal (no date, no score on the clip) */
  night: RequestNight | null
  seconds: number
  formats: ['9:16', '16:9']
  /** the words on the clip, in order; a personal chapter has no date beat */
  beats: string[]
  status: 'requested'
}

export const TRANSITION_SECONDS: Record<TransitionKind, number> = {'chapter-card': 4, 'time-bridge': 3, 'matchday-opener': 5}
const FORMATS: ['9:16', '16:9'] = ['9:16', '16:9']

const nightOf = (m: Mission, fits: ChapterFits, birthYear: number | null): RequestNight | null => {
  const n = nightFor(m, fits, birthYear)
  if (!n.dated) return null
  const a = n.anchor
  return {factId: a.factId, on: a.on, year: a.year, precision: a.precision, title: a.title, locale: a.locale, sources: a.sources.map(s => ({...s}))}
}
const dateBeat = (n: RequestNight): string => n.precision === 'day' && n.on ? n.on : String(n.year)

export function transitionRequests(club: string, fits: ChapterFits, birthYear: number | null = null): TransitionRequest[] {
  const out: TransitionRequest[] = []
  let age: number | null = null
  for (const slot of SPINE) {
    const missions = slot.map(id => missionById(id)!)
    const first = missions[0]!
    if (age !== null && first.age > age) {
      out.push({id: `${club}:${first.id}:time-bridge`, club, chapter: first.id, kind: 'time-bridge', stage: first.stage, age: first.age, night: null, seconds: TRANSITION_SECONDS['time-bridge'], formats: FORMATS,
        beats: [storyWord('story.age', {n: String(age)}), storyWord('story.age', {n: String(first.age)}), storyWord('story.bridge')], status: 'requested'})
    }
    age = first.age
    for (const m of missions) {
      const night = nightOf(m, fits, birthYear)
      const title = storyWord(`story.m.${m.id}.title`)
      const card = [storyWord(`story.stage.${m.stage}`), storyWord('story.age', {n: String(m.age)}), title]
      out.push({id: `${club}:${m.id}:chapter-card`, club, chapter: m.id, kind: 'chapter-card', stage: m.stage, age: m.age, night, seconds: TRANSITION_SECONDS['chapter-card'], formats: FORMATS, beats: night ? [...card, dateBeat(night)] : card, status: 'requested'})
      if (m.day === 'matchday') out.push({id: `${club}:${m.id}:matchday-opener`, club, chapter: m.id, kind: 'matchday-opener', stage: m.stage, age: m.age, night, seconds: TRANSITION_SECONDS['matchday-opener'], formats: FORMATS,
        beats: night ? [storyWord('story.day.6'), dateBeat(night), night.title] : [storyWord('story.day.6'), title], status: 'requested'})
    }
  }
  return out
}

export type TransitionManifest = {schema: 1; what: string; rule: string; clubs: Record<string, {birthYear: number | null; requests: TransitionRequest[]}>}
export const manifestOf = (clubs: Record<string, {birthYear: number | null; fits: ChapterFits}>): TransitionManifest => ({
  schema: 1,
  what: 'LIFE interstitials the story asks the studio for. Requests only: nothing is rendered, uploaded or published by this file.',
  rule: 'docs/rules/life-story-watch.md',
  clubs: Object.fromEntries(Object.keys(clubs).sort().map(id => [id, {birthYear: clubs[id]!.birthYear, requests: transitionRequests(id, clubs[id]!.fits, clubs[id]!.birthYear)}])),
})
