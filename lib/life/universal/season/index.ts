/**
 * LIFE · Season One — the six episodes of a childhood and a youth, ages six to sixteen.
 *
 * Every club plays the same season: the episodes are universal and name nothing but the pack's tokens. What a club
 * changes is the night under an episode: where the club's own approved archive holds a match in the years an episode
 * spans, the episode stands on it and the night is played live (`LiveDef`); where it holds none, the same episode is a
 * personal matchday, with no date and no score.
 */
import type {ArchiveRef, Chapter} from '../types'
import {compileEpisode} from './compile'
import {e1, e1Ages} from './e1'
import {E2} from './e2'
import {e3, e3Ages} from './e3'
import {E4} from './e4'
import {e5, e5Ages} from './e5'
import {e6, e6Ages} from './e6'
import type {EpisodeScript} from './write'

/** The last age Season One covers: the life's own chapters take over after it. */
export const SEASON_ONE_UNTIL = 16

export type SeasonInput = {birthYear: number | null; nights: readonly ArchiveRef[]; /** the nights the pack chose by hand: they come first */ chosen?: readonly string[]}

/** An episode that may stand on a night: the ages it can span, and the night chosen for it among the pack's rows. */
type Anchored = {script: (anchor: ArchiveRef | null, age: number) => EpisodeScript; ages: [number, number]; /** what kind of night the episode can stand on at all */ need?: (r: ArchiveRef) => boolean}

const FIXED: EpisodeScript[] = [E2, E4]
const home = (r: ArchiveRef) => r.match?.us === 'home'
const ANCHORED: Anchored[] = [{script: e3, ages: e3Ages, need: home}, {script: e5, ages: e5Ages, need: home}, {script: e6, ages: e6Ages, need: r => r.match?.us === 'away'}, /* last: the radio night takes what the ground nights left */ {script: e1, ages: e1Ages}]

/** Season One for one club: the fixed episodes, and the anchored ones on the club's own nights where it has them. */
export function seasonOne(input: SeasonInput): Chapter[] {
  const used = new Set<string>()
  const out: EpisodeScript[] = [...FIXED]
  for (const a of ANCHORED) {
    const ageOf = (r: ArchiveRef) => input.birthYear === null ? null : r.year - input.birthYear
    const fit = input.nights.filter(r => !used.has(r.factId) && r.match && (!a.need || a.need(r)) && (() => { const g = ageOf(r); return g !== null && g >= a.ages[0] && g <= a.ages[1] })())
    const picked = new Set(input.chosen ?? [])
    const best = fit.sort((x, y) => (picked.has(y.factId) ? 10 : 0) - (picked.has(x.factId) ? 10 : 0) || weight(y) - weight(x) || (x.on ?? '').localeCompare(y.on ?? ''))[0] ?? null
    if (best) used.add(best.factId)
    out.push(a.script(best, best ? ageOf(best)! : a.ages[0]))
  }
  return out.sort((a, b) => a.no - b.no).map(compileEpisode)
}

/** the nights that serve best: a won night, then what the row itself says about it */
const weight = (r: ArchiveRef) => (r.match?.result === 'won' ? 4 : r.match?.result === 'drew' ? 1 : 0) + (/final|title|champion|derby|גמר|אליפות|דרבי|מחזור אחרון/iu.test(`${r.title} ${r.hint}`) ? 3 : 0)

/** the archive rows Season One stands on, so the life does not play them twice */
export function seasonNights(chapters: readonly Chapter[]): Set<string> {
  return new Set(chapters.flatMap(c => c.anchor ? [c.anchor.factId] : []))
}
