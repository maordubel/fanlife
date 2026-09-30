import 'server-only'

import { findPlayer } from '@/lib/archive/player-master'

import { archive, footballPeople, shuffle } from '../../archive'
import { shirtConflict } from '../conflicts'
import { fact, seeded, sourceOf, yearOf, type Draft, type Template } from '../draft'
import { CLUB } from '@/lib/club/context'

/**
 * ארכיון החולצות — "who wore 11 in 2019/20" is the question the corpus was always going
 * to be best at, and it only works because the season is part of the key. A season with
 * two holders — a mid-season transfer, or two lineups that disagree (the conflicts file)
 * — is a real fact and a broken question, so those pairs are dropped rather than
 * resolved.
 */

const FALLBACK_SOURCE = { sourceTitle: 'ארכיון', sourceUrl: null, confidence: 2 }

export function shirtFact(row: (typeof archive.shirtNumbers)[number]) {
  return fact({
    kind: 'shirt-number',
    key: `${row.seasonLabel}|${row.shirtNumber}|${row.personNameHe}`,
    subject: row.personNameHe,
    value: String(row.shirtNumber),
    valueType: 'number',
    when: row.seasonLabel,
    topics: ['numbers'],
    source: sourceOf(row),
  })
}

/** Did this man's recorded span at the club miss the season? Only then is "not in the
 *  squad" a claim the archive can make — a missing shirt-number row is not one. */
function certainlyAbsent(name: string, season: string): boolean {
  const start = yearOf(season)
  const years = findPlayer(name)?.years as { from?: number; to?: number } | undefined
  if (start === null || !years || typeof years.from !== 'number') return false
  const to = typeof years.to === 'number' ? years.to : years.from
  return to < start || years.from > start + 1
}

export const NUMBER_TEMPLATES: Template[] = [
  {
    slug: 'number-season',
    base: 4,
    build: () => {
      const byPersonNumber = new Map<string, Set<string>>()
      for (const row of archive.shirtNumbers) {
        const key = `${row.personNameHe}|${row.shirtNumber}`
        const seen = byPersonNumber.get(key) ?? new Set<string>()
        seen.add(row.seasonLabel)
        byPersonNumber.set(key, seen)
      }
      const seasons = [...new Set(archive.shirtNumbers.map((row) => row.seasonLabel))]
      return archive.shirtNumbers
        .filter(
          (row) =>
            byPersonNumber.get(`${row.personNameHe}|${row.shirtNumber}`)?.size === 1 &&
            row.disputed !== true,
        )
        .map(
          (row): Draft => ({
            key: `number-season:${row.personNameHe}:${row.shirtNumber}`,
            legacyKey: `number-season:${row.personNameHe}:${row.shirtNumber}`,
            template: 'number-season',
            type: 'year',
            prompt: `באיזו עונה לבש ${row.personNameHe} את מספר ${row.shirtNumber}?`,
            answer: row.seasonLabel,
            pool: seasons,
            source: sourceOf(row),
            explanation: `${row.personNameHe} · מספר ${row.shirtNumber} · ${row.seasonLabel}`,
            when: row.seasonLabel,
            topics: ['numbers', 'players'],
            facts: [shirtFact(row)],
            conflict: shirtConflict(row.seasonLabel, row.shirtNumber) ?? undefined,
          }),
        )
    },
  },
  {
    /**
     * מי היו בסגל בעונה הזאת — six names, three of them wore a number that season.
     *
     * The wrong three are men whose recorded span at the club (Player Master) misses the
     * season. The old version took any name without a shirt row that season, and a
     * shirt table is not a squad list: a man can be in the squad and absent from it.
     */
    slug: 'number-era',
    base: 3,
    build: () => {
      const bySeason = new Map<string, (typeof archive.shirtNumbers)[number][]>()
      for (const row of archive.shirtNumbers) {
        if (row.disputed === true || shirtConflict(row.seasonLabel, row.shirtNumber)) continue
        const list = bySeason.get(row.seasonLabel) ?? []
        list.push(row)
        bySeason.set(row.seasonLabel, list)
      }
      const everyone = [...new Set(archive.shirtNumbers.map((row) => row.personNameHe))]
      const out: Draft[] = []
      for (const [season, squad] of bySeason) {
        if (squad.length < 7) continue
        const random = seeded(`number-era:${season}`)
        const wore = shuffle(squad, random).slice(0, 3)
        const inSquad = new Set(squad.map((entry) => entry.personNameHe))
        const absent = shuffle(
          everyone.filter((name) => !inSquad.has(name) && certainlyAbsent(name, season)),
          random,
        ).slice(0, 3)
        if (absent.length < 3) continue
        const names = wore.map((entry) => entry.personNameHe)
        out.push({
          key: `number-era:${season}`,
          template: 'number-era',
          type: 'multi',
          prompt: `בחרו שלושה — מי היו בסגל ${CLUB.names.he} בעונת ${season}?`,
          answer: names,
          distractors: absent,
          source: sourceOf(squad[0] ?? FALLBACK_SOURCE),
          explanation: wore.map((entry) => `${entry.personNameHe} (${entry.shirtNumber})`).join(' · '),
          when: season,
          topics: ['numbers', 'players'],
          facts: wore.map(shirtFact),
        })
      }
      return out
    },
  },
  {
    slug: 'shirt-number',
    base: 4,
    build: () => {
      const byPair = new Map<string, string[]>()
      for (const row of archive.shirtNumbers) {
        const key = `${row.shirtNumber}|${row.seasonLabel}`
        byPair.set(key, [...(byPair.get(key) ?? []), row.personNameHe])
      }
      const names = archive.shirtNumbers.map((other) => other.personNameHe)
      const out: Draft[] = []
      for (const row of archive.shirtNumbers) {
        const holders = byPair.get(`${row.shirtNumber}|${row.seasonLabel}`) ?? []
        if (holders.length !== 1) continue
        out.push({
          key: `shirt:${row.shirtNumber}:${row.seasonLabel}`,
          legacyKey: `shirt:${row.shirtNumber}:${row.seasonLabel}`,
          template: 'shirt-number',
          type: 'mcq',
          prompt: `מי לבש את חולצה מספר ${row.shirtNumber} בעונת ${row.seasonLabel}?`,
          answer: row.personNameHe,
          pool: names,
          source: sourceOf(row),
          explanation: `${row.personNameHe} · מספר ${row.shirtNumber} · ${row.seasonLabel}`,
          when: row.seasonLabel,
          topics: ['numbers', 'players'],
          facts: [shirtFact(row)],
          conflict: shirtConflict(row.seasonLabel, row.shirtNumber) ?? undefined,
        })
      }
      return out
    },
  },
  {
    slug: 'which-number',
    base: 3,
    build: () => {
      const numbers = [...new Set(archive.shirtNumbers.map((row) => String(row.shirtNumber)))]
      const byPerson = new Map<string, Set<number>>()
      for (const row of archive.shirtNumbers) {
        const seen = byPerson.get(row.personNameHe) ?? new Set<number>()
        seen.add(row.shirtNumber)
        byPerson.set(row.personNameHe, seen)
      }
      return archive.shirtNumbers
        .filter((row) => byPerson.get(row.personNameHe)?.size === 1)
        .map(
          (row): Draft => ({
            key: `which-number:${row.personNameHe}:${row.seasonLabel}`,
            legacyKey: `which-number:${row.personNameHe}:${row.seasonLabel}`,
            template: 'which-number',
            type: 'mcq',
            prompt: `איזה מספר לבש ${row.personNameHe} בעונת ${row.seasonLabel}?`,
            answer: String(row.shirtNumber),
            pool: numbers,
            source: sourceOf(row),
            explanation: `${row.personNameHe} · מספר ${row.shirtNumber}`,
            when: row.seasonLabel,
            topics: ['numbers', 'players'],
            facts: [shirtFact(row)],
            conflict: shirtConflict(row.seasonLabel, row.shirtNumber) ?? undefined,
          }),
        )
    },
  },
  {
    /**
     * מי לבשו את המספר — six names, exactly three of them wore it. The wrong three are
     * real Hapoel footballers who are NOT recorded on that number.
     */
    slug: 'shirt-multi',
    base: 4,
    build: () => {
      const holders = new Map<number, Set<string>>()
      for (const row of archive.shirtNumbers) {
        const set = holders.get(row.shirtNumber) ?? new Set<string>()
        set.add(row.personNameHe)
        holders.set(row.shirtNumber, set)
      }
      const out: Draft[] = []
      for (const [number, names] of holders) {
        if (names.size < 5) continue
        const random = seeded(`shirt-multi:${number}`)
        const wore = shuffle([...names], random).slice(0, 3)
        const neverWore = shuffle(
          footballPeople.map((person) => person.fullNameHe).filter((name) => !names.has(name)),
          random,
        ).slice(0, 3)
        out.push({
          key: `shirt-multi:${number}`,
          template: 'shirt-multi',
          type: 'multi',
          prompt: `בחרו שלושה — מי לבשו את חולצת מספר ${number} של ${CLUB.names.he}?`,
          answer: wore,
          distractors: neverWore,
          source: sourceOf(
            archive.shirtNumbers.find((row) => row.shirtNumber === number) ?? FALLBACK_SOURCE,
          ),
          explanation: `${wore.join(' · ')} — מספר ${number}`,
          topics: ['numbers', 'players'],
        })
      }
      return out
    },
  },
]
