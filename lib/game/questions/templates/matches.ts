import 'server-only'

import { matchLine } from '@/components/ui/Num'

import { DERBY_RIVAL, US, archive, footballPeople, nameOf, opponentOf } from '../../archive'
import { matchConflict } from '../conflicts'
import { fact, sourceOf, type Draft, type Template } from '../draft'
import type { QTopic } from '../types'
import { CLUB } from '@/lib/club/context'

/**
 * המשחקים — 3,063 fixtures, and the three things the old bank got wrong about them.
 *
 *  · **The europe topic read every match.** `opponent`, `score` and `venue` were listed
 *    under europe and ran over the whole table, so a "European" round asked about round
 *    15 of the 1985/86 league. A match is tagged `europe` only when its competition is
 *    one of the five UEFA competitions, and `derby` only when the opponent is the club
 *    flagged `is_derby_rival` (rule 13).
 *  · **The ids collided.** `score:<season>:<home>:<away>` is the same key for a league
 *    game and a cup tie between the same two clubs in one season; the later one silently
 *    replaced the earlier. The key now carries the competition, the stage and the date.
 *  · **"Opponent in round 20 of 1961/62" was rated easy.** A league-round fixture is a
 *    deep-archive question: rated 5 and dealt only in Hard and Era runs. A European
 *    night, a derby, a final or a title decider keeps its template's rating.
 *
 * And the prompts now name the competition and the season: "מחזור 15" alone was asked
 * of fifty different seasons, and the ambiguity guard had to throw away 1,700 score
 * questions whose prompt could not say which match it meant.
 */

export const EURO_COMPETITIONS = new Set([
  'גביע-אופא',
  'הליגה-האירופית',
  'גביע-האינטרטוטו',
  'ליגת-האלופות',
  'קונפרנס-ליג',
])

type Match = (typeof archive.matches)[number]

export function isEuropean(match: Match): boolean {
  return EURO_COMPETITIONS.has(match.competitionSlug)
}

export function isDerby(match: Match): boolean {
  return DERBY_RIVAL !== null && opponentOf(match) === DERBY_RIVAL
}

function isFinal(match: Match): boolean {
  const stage = match.stage ?? ''
  return /^גמר/.test(stage) || /מחזור אחרון|האליפות הוכרעה/.test(stage)
}

/** a European night, a derby, a final or a title decider — everything else is deep */
export function isNotable(match: Match): boolean {
  return isEuropean(match) || isDerby(match) || isFinal(match)
}

function topicsOf(match: Match, fallback: QTopic): QTopic[] {
  if (isDerby(match)) return ['derby', fallback]
  if (isEuropean(match)) return ['europe', fallback]
  return [fallback]
}

function matchKey(match: Match): string {
  return [
    match.seasonLabel,
    match.competitionSlug,
    match.stage ?? '',
    match.homeClubSlug,
    match.awayClubSlug,
    match.playedOn ?? '',
  ].join('|')
}

/** "ליגה לאומית 1985/86, מחזור 15" — enough to name ONE match */
function where(match: Match): string {
  const competition = nameOf.competition(match.competitionSlug)
  return `${competition} ${match.seasonLabel}${match.stage ? `, ${match.stage}` : ''}`
}

function line(match: Match): string {
  return matchLine(
    nameOf.club(match.homeClubSlug),
    match.homeScore,
    nameOf.club(match.awayClubSlug),
    match.awayScore,
  )
}

export function matchFact(match: Match) {
  return fact({
    kind: isDerby(match) ? 'derby-match' : 'match',
    key: matchKey(match),
    subject: nameOf.club(opponentOf(match)),
    value: match.seasonLabel,
    valueType: 'season',
    when: match.playedOn ?? match.seasonLabel,
    topics: topicsOf(match, 'history'),
    source: sourceOf(match),
    contested: matchConflict(match) !== null,
  })
}

/** notable matches carry a fact; three thousand league rounds would only bloat the index */
function factsFor(match: Match) {
  return isNotable(match) ? [matchFact(match)] : []
}

function common(match: Match, fallback: QTopic): Pick<Draft, 'when' | 'topics' | 'deep' | 'difficulty' | 'conflict' | 'facts'> {
  const deep = !isNotable(match)
  return {
    when: match.playedOn ?? match.seasonLabel,
    topics: topicsOf(match, fallback),
    deep: deep || undefined,
    difficulty: deep ? 5 : undefined,
    conflict: matchConflict(match) ?? undefined,
    facts: factsFor(match),
  }
}

const OPPONENT_POOL = () =>
  archive.clubs.filter((club) => !club.isUs && club.sport !== 'basketball').map((club) => club.nameHe)

export const MATCH_TEMPLATES: Template[] = [
  {
    slug: 'scorer',
    base: 4,
    build: () => {
      const names = footballPeople.map((person) => person.fullNameHe)
      const out: Draft[] = []
      for (const event of archive.matchEvents) {
        if (event.type !== 'goal' || event.personSlug === null) continue
        const match = archive.matches.find(
          (row) =>
            [row.seasonLabel, row.competitionSlug, row.homeClubSlug, row.awayClubSlug, row.stage ?? ''].join('|') ===
            event.matchNaturalKey,
        )
        if (!match) continue
        const correct = nameOf.person(event.personSlug)
        out.push({
          key: `scorer:${event.matchNaturalKey}:${event.minute}:${event.personSlug}`,
          legacyKey: `scorer:${event.matchNaturalKey}:${event.minute}`,
          template: 'scorer',
          type: 'mcq',
          prompt: `מי הבקיע בדקה ה־${event.minute} מול ${nameOf.club(opponentOf(match))} בעונת ${match.seasonLabel}?`,
          answer: correct,
          pool: names,
          source: sourceOf(event),
          explanation: `${correct} · ${nameOf.competition(match.competitionSlug)} · ${match.playedOn ?? match.seasonLabel}`,
          ...common(match, 'players'),
          hint: { kind: 'context', he: nameOf.competition(match.competitionSlug) },
        })
      }
      return out
    },
  },
  {
    slug: 'score',
    base: 3,
    build: () =>
      archive.matches
        .filter((row) => row.homeScore !== null && row.awayScore !== null)
        .map((row): Draft => {
          // NOT "what was the score" — one side's goals is unambiguous in any direction
          const us = row.homeClubSlug === US ? 'home' : 'away'
          const ours = us === 'home' ? row.homeScore : row.awayScore
          const homeAway = us === 'home' ? 'בבית' : 'בחוץ'
          return {
            key: `score:${matchKey(row)}`,
            legacyKey: `score:${row.seasonLabel}:${row.homeClubSlug}:${row.awayClubSlug}`,
            template: 'score',
            type: 'mcq',
            prompt: `כמה שערים הבקיעה ${CLUB.names.he} ${homeAway} מול ${nameOf.club(opponentOf(row))} — ${where(row)}?`,
            answer: String(ours),
            pool: ['0', '1', '2', '3', '4', '5'],
            source: sourceOf(row),
            explanation: `${line(row)} · ${nameOf.competition(row.competitionSlug)} · ${row.playedOn ?? row.seasonLabel}`,
            ...common(row, 'numbers'),
          }
        }),
  },
  {
    slug: 'venue',
    base: 2,
    build: () => {
      const venues = archive.venues.map((venue) => venue.nameHe)
      return archive.matches
        .filter((row) => row.venueSlug !== null)
        .map((row): Draft => {
          const correct = nameOf.venue(row.venueSlug as string)
          return {
            key: `venue:${matchKey(row)}`,
            legacyKey: `venue:${row.seasonLabel}:${row.awayClubSlug}`,
            template: 'venue',
            type: 'mcq',
            prompt: `היכן נערך ${nameOf.club(row.homeClubSlug)} מול ${nameOf.club(row.awayClubSlug)} — ${where(row)}?`,
            answer: correct,
            pool: venues,
            source: sourceOf(row),
            explanation: `${correct} · ${row.playedOn ?? row.seasonLabel}`,
            ...common(row, 'history'),
          }
        })
    },
  },
  {
    slug: 'opponent',
    base: 2,
    build: () => {
      const clubs = OPPONENT_POOL()
      return archive.matches
        .filter((row) => row.stage !== null)
        .map(
          (row): Draft => ({
            key: `opponent:${matchKey(row)}`,
            legacyKey: `opponent:${row.seasonLabel}:${row.stage}`,
            template: 'opponent',
            type: 'mcq',
            prompt: `מי הייתה היריבה ב${row.stage}, ${nameOf.competition(row.competitionSlug)} ${row.seasonLabel}?`,
            answer: nameOf.club(opponentOf(row)),
            pool: clubs,
            source: sourceOf(row),
            explanation: `${line(row)} · ${row.playedOn ?? row.seasonLabel}`,
            ...common(row, 'history'),
            // A derby asked as "who was the opponent" has one answer in every derby — so it
            // never sits in the derby topic (where it would be a giveaway), and it is rated
            // as the hard question it is rather than as an easy famous night.
            ...(isDerby(row) ? { topics: ['history' as const], difficulty: 4 as const } : {}),
          }),
        )
    },
  },
  {
    slug: 'attendance',
    base: 4,
    build: () => {
      const gates = archive.matches
        .map((row) => row.attendance)
        .filter((value): value is number => typeof value === 'number')
        .map(String)
      return archive.matches
        .filter((row) => typeof row.attendance === 'number' && row.attendanceDisputed !== true)
        .map(
          (row): Draft => ({
            key: `attendance:${matchKey(row)}`,
            legacyKey: `attendance:${row.seasonLabel}:${row.stage}`,
            template: 'attendance',
            type: 'mcq',
            prompt: `כמה צופים היו ב${nameOf.club(row.homeClubSlug)} מול ${nameOf.club(row.awayClubSlug)} — ${where(row)}?`,
            answer: String(row.attendance),
            pool: gates,
            source: sourceOf(row),
            explanation: `${line(row)} · ${row.playedOn ?? row.seasonLabel}`,
            ...common(row, 'numbers'),
          }),
        )
    },
  },
  {
    // the San Siro number — a statistic about the SUPPORTERS
    slug: 'travelling',
    base: 5,
    build: () =>
      archive.matches
        .filter((row) => typeof row.travellingSupporters === 'number')
        .map(
          (row): Draft => ({
            key: `travelling:${matchKey(row)}`,
            legacyKey: `travelling:${row.seasonLabel}:${row.stage}`,
            template: 'travelling',
            type: 'mcq',
            prompt: `כמה אוהדי הפועל נסעו ל${nameOf.club(row.homeClubSlug)} ב${row.stage ?? row.seasonLabel}, עונת ${row.seasonLabel}?`,
            answer: String(row.travellingSupporters),
            pool: ['1500', '3000', '5000', '7000', '10000', '12000'],
            source: sourceOf(row),
            explanation: row.noteHe ?? `${row.playedOn ?? row.seasonLabel}`,
            ...common(row, 'numbers'),
          }),
        ),
  },
]
