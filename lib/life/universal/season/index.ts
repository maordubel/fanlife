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
import {e4} from './e4'
import {kindsOf} from '../../rush/archive'
import {e5, e5Ages} from './e5'
import {e6, e6Ages} from './e6'
import type {EpisodeScript} from './write'

/** The last age Season One covers: the life's own chapters take over after it. */
export const SEASON_ONE_UNTIL = 16

export type SeasonInput = {birthYear: number | null; nights: readonly ArchiveRef[]; /** the nights the pack chose by hand: they come first */ chosen?: readonly string[]}

/** An episode that may stand on a night: the ages it can span, and the night chosen for it among the pack's rows. */
type Anchored = {script: (anchor: ArchiveRef | null, age: number) => EpisodeScript; ages: [number, number]; /** what kind of night the episode can stand on at all */ need?: (r: ArchiveRef) => boolean}

/** the episodes that stand on no night; the ones that read the paper of their week are built again with it */
const FIXED: {script: EpisodeScript; withPaper?: (paper: ArchiveRef) => EpisodeScript}[] = [{script: E2}, {script: e4(null), withPaper: e4}]
const home = (r: ArchiveRef) => r.match?.us === 'home'
const ANCHORED: Anchored[] = [{script: e3, ages: e3Ages, need: home}, {script: e5, ages: e5Ages, need: home}, {script: e6, ages: e6Ages, need: r => r.match?.us === 'away'}, /* last: the radio night takes what the ground nights left */ {script: e1, ages: e1Ages}]

/** Season One for one club: the fixed episodes, and the anchored ones on the club's own nights where it has them. */
export function seasonOne(input: SeasonInput): Chapter[] {
  const used = new Set<string>()
  const out: EpisodeScript[] = FIXED.map(f => f.script)
  const remake = new Map(FIXED.filter(f => f.withPaper).map(f => [f.script.id, f.withPaper!]))
  for (const a of ANCHORED) {
    const ageOf = (r: ArchiveRef) => input.birthYear === null ? null : r.year - input.birthYear
    const fit = input.nights.filter(r => !used.has(r.factId) && r.match && (!a.need || a.need(r)) && (() => { const g = ageOf(r); return g !== null && g >= a.ages[0] && g <= a.ages[1] })())
    const picked = new Set(input.chosen ?? [])
    const best = fit.sort((x, y) => Number(picked.has(y.factId)) - Number(picked.has(x.factId)) || weight(y) - weight(x) || (x.on ?? '').localeCompare(y.on ?? ''))[0] ?? null
    if (best) used.add(best.factId)
    out.push(a.script(best, best ? ageOf(best)! : a.ages[0]))
  }
  // the episodes that stand on no night still live in a year the archive remembers: the paper of that week opens them
  const withPaper = out.map(ep => {
    if (ep.anchor || input.birthYear === null) return ep
    const year = input.birthYear + ep.age
    const night = input.nights.filter(r => !used.has(r.factId) && r.match && r.precision === 'day' && Math.abs(r.year - year) <= 0)
      .sort((x, y) => weight(y) - weight(x) || (x.on ?? '').localeCompare(y.on ?? ''))[0]
    if (!night) return ep
    used.add(night.factId)
    const again = remake.get(ep.id)
    return again ? {...again(night), paper: night} : {...ep, paper: night}
  })
  return withPaper.sort((a, b) => a.no - b.no).map(compileEpisode)
}

/**
 * The nights that serve best (rule 135): the BIG nights first, read from the row's own words through the same reader
 * the RUSH Fitter uses (`kindsOf`) — a final, a title, a European night, a derby, a promotion — then a won night,
 * and a night whose scorers the club's own record lists. A night is never made bigger
 * than its row says: a word list that misses a language misses a row.
 */
const BIG: Partial<Record<string, number>> = {final: 6, title: 6, europe: 4, derby: 4, promotion: 3}
export function weight(r: ArchiveRef): number {
  const kinds = new Set<string>(kindsOf(r, {rival: null, ownNames: []}))
  const m = r.match
  const big = Math.max(0, ...[...kinds].map(k => BIG[k] ?? 0))
  const said = /final|title|champion|derby|גמר|אליפות|דרבי|מחזור אחרון/iu.test(`${r.title} ${r.hint}`) ? 3 : 0
  const won = m?.result === 'won' ? 4 : m?.result === 'drew' ? 1 : 0
  // a night whose scorers the club's own record lists can be told closer (the clipping reads the names); a wide
  // scoreline alone does not make a night big — it is the row's own words that do
  const told = m?.detail?.scorers.length ? 0.5 : 0
  return Math.max(big, said) + won + told
}

/** the archive rows Season One stands on, so the life does not play them twice */
export function seasonNights(chapters: readonly Chapter[]): Set<string> {
  return new Set(chapters.flatMap(c => [...(c.anchor ? [c.anchor.factId] : []), ...(c.paper ? [c.paper.factId] : [])]))
}
