import 'server-only'

import { archive, nameOf } from '../../archive'
import { isContested } from '../conflicts'
import { fact, sourceOf, type Draft, type Template } from '../draft'
import { CLUB } from '@/lib/club/context'

/** התארים, הסמל והרגעים — the club's own chronology. */

const won = () => archive.trophies.filter((row) => row.result === 'won')

export function trophyFact(row: (typeof archive.trophies)[number]) {
  return fact({
    kind: 'trophy-won',
    key: `${row.competitionSlug}|${row.seasonLabel}`,
    subject: nameOf.competition(row.competitionSlug),
    value: row.seasonLabel,
    valueType: 'season',
    when: row.seasonLabel,
    topics: ['history'],
    source: sourceOf(row),
  })
}

export function crestFact(row: (typeof archive.crests)[number]) {
  return fact({
    kind: 'crest',
    key: String(row.fromYear),
    subject: row.nameHe,
    value: String(row.fromYear),
    valueType: 'year',
    when: String(row.fromYear),
    topics: ['history', 'kits'],
    source: sourceOf(row),
  })
}

export function momentFact(row: (typeof archive.moments)[number] & { sport?: string }) {
  return fact({
    kind: 'moment',
    key: row.slug,
    subject: row.titleHe,
    value: (row.happenedOn ?? '').slice(0, 4),
    valueType: 'year',
    when: row.happenedOn,
    sport: row.sport === 'basketball' ? 'basketball' : 'football',
    topics: ['history'],
    source: sourceOf(row),
  })
}

export const HISTORY_TEMPLATES: Template[] = [
  {
    // Only a competition the club won ONCE can be asked this way — sixteen State Cups
    // would be sixteen right answers.
    slug: 'trophy-season',
    base: 2,
    build: () => {
      const timesWon = new Map<string, number>()
      for (const row of won()) timesWon.set(row.competitionSlug, (timesWon.get(row.competitionSlug) ?? 0) + 1)
      const seasons = archive.trophies.map((row) => row.seasonLabel)
      return won()
        .filter((row) => timesWon.get(row.competitionSlug) === 1)
        .map(
          (row): Draft => ({
            key: `trophy:${row.competitionSlug}:${row.seasonLabel}`,
            legacyKey: `trophy:${row.competitionSlug}:${row.seasonLabel}`,
            template: 'trophy-season',
            type: 'year',
            prompt: `${CLUB.names.he} זכתה ב${nameOf.competition(row.competitionSlug)} פעם אחת בלבד. באיזו עונה?`,
            answer: row.seasonLabel,
            pool: seasons,
            source: sourceOf(row),
            explanation: `${nameOf.competition(row.competitionSlug)} · ${row.seasonLabel}`,
            when: row.seasonLabel,
            topics: ['history'],
            facts: [trophyFact(row)],
          }),
        )
    },
  },
  {
    slug: 'double',
    base: 2,
    build: () => {
      const bySeason = new Map<string, ReturnType<typeof won>>()
      for (const row of won()) bySeason.set(row.seasonLabel, [...(bySeason.get(row.seasonLabel) ?? []), row])
      const competitions = archive.competitions.filter((row) => row.sport !== 'basketball').map((row) => row.nameHe)
      const out: Draft[] = []
      for (const [season, rows] of bySeason) {
        if (rows.length !== 2) continue
        const league = rows.find((row) => row.competitionSlug === 'ליגת-העל')
        const other = rows.find((row) => row.competitionSlug !== 'ליגת-העל')
        if (!league || !other) continue
        const correct = nameOf.competition(other.competitionSlug)
        out.push({
          key: `double:${season}`,
          legacyKey: `double:${season}`,
          template: 'double',
          type: 'mcq',
          prompt: `בעונת ${season} עשתה ${CLUB.names.he} דאבל. באיזה תואר זכתה מלבד האליפות?`,
          answer: correct,
          pool: competitions,
          source: sourceOf(other),
          explanation: `${season} · אליפות ו${correct}`,
          when: season,
          topics: ['history'],
          facts: [trophyFact(league), trophyFact(other)],
        })
      }
      return out
    },
  },
  {
    // The league count is the one the sources fight over (13 · 12 · 14) — never asked.
    slug: 'trophy-count',
    base: 3,
    build: () => {
      const timesWon = new Map<string, number>()
      for (const row of won()) timesWon.set(row.competitionSlug, (timesWon.get(row.competitionSlug) ?? 0) + 1)
      const CONTESTED_COUNT: Record<string, string> = { 'ליגת-העל': 'championship_count' }
      const out: Draft[] = []
      for (const [slug, count] of timesWon) {
        if (count < 5) continue
        const conflictField = CONTESTED_COUNT[slug]
        const contested = conflictField !== undefined && isContested('trophy', conflictField)
        const row = won().find((trophy) => trophy.competitionSlug === slug)
        if (!row) continue
        out.push({
          key: `trophy-count:${slug}`,
          legacyKey: `trophy-count:${slug}`,
          template: 'trophy-count',
          type: 'mcq',
          prompt: `בכמה פעמים זכתה ${CLUB.names.he} ב${nameOf.competition(slug)}?`,
          answer: String(count),
          pool: [count - 2, count - 1, count + 1, count + 2, count + 4].map(String),
          source: sourceOf(row),
          explanation: `${nameOf.competition(slug)} · ${count}`,
          topics: ['history', 'numbers'],
          conflict: contested ? `conflict:trophy:${slug}:championship_count` : undefined,
        })
      }
      return out
    },
  },
  {
    slug: 'crest',
    base: 4,
    build: () => {
      const years = archive.crests.map((crest) => String(crest.fromYear))
      return archive.crests
        .filter((row) => row.changeHe !== null)
        .map(
          (row): Draft => ({
            key: `crest:${row.fromYear}`,
            legacyKey: `crest:${row.fromYear}`,
            template: 'crest',
            type: 'year',
            prompt: `באיזו שנה ${row.changeHe}?`,
            answer: String(row.fromYear),
            pool: years,
            source: sourceOf(row),
            explanation: `${row.nameHe} · ${row.fromYear}${row.toYear ? `–${row.toYear}` : ''}`,
            when: String(row.fromYear),
            topics: ['history', 'kits'],
            facts: [crestFact(row)],
          }),
        )
    },
  },
  {
    slug: 'crest-era',
    base: 4,
    build: () => {
      const names = archive.crests.map((crest) => crest.nameHe)
      return archive.crests
        .filter((row) => row.toYear !== null)
        .map(
          (row): Draft => ({
            key: `crest-era:${row.fromYear}`,
            legacyKey: `crest-era:${row.fromYear}`,
            template: 'crest-era',
            type: 'mcq',
            prompt: `איזה שלב בסמל המועדון נמשך מ־${row.fromYear} עד ${row.toYear}?`,
            answer: row.nameHe,
            pool: names,
            source: sourceOf(row),
            explanation: row.changeHe ?? `${row.fromYear}–${row.toYear}`,
            when: String(row.fromYear),
            topics: ['history', 'kits'],
            facts: [crestFact(row)],
          }),
        )
    },
  },
  {
    slug: 'moment-year',
    base: 3,
    build: () => {
      const years = archive.moments
        .filter((other) => other.happenedOn !== null)
        .map((other) => (other.happenedOn as string).slice(0, 4))
      return archive.moments
        .filter((row) => row.happenedOn !== null && row.category !== 'club')
        .map(
          (row): Draft => ({
            key: `moment:${row.slug}`,
            legacyKey: `moment:${row.slug}`,
            template: 'moment-year',
            type: 'year',
            prompt: `באיזו שנה קרה זה — ${row.titleHe}?`,
            answer: (row.happenedOn as string).slice(0, 4),
            pool: years,
            source: sourceOf(row),
            explanation: row.bodyHe.slice(0, 160),
            when: row.happenedOn,
            sport: (row as { sport?: string }).sport === 'basketball' ? 'basketball' : 'football',
            topics: ['history'],
            facts: [momentFact(row)],
          }),
        )
    },
  },
]
