import 'server-only'

import { DERBY_RIVAL, US, archive, nameOf, opponentOf, shuffle } from '../../archive'
import { seasonsInSpell } from '../../seasons'
import { goalOpponentConflict, matchConflict, shirtConflict } from '../conflicts'
import { hash, seeded, sourceOf, yearOf, type Draft, type Template } from '../draft'
import type { Fact } from '../types'
import { euroTieFact } from './europe'
import { goalFact, goalTopics } from './goals'
import { crestFact, momentFact, trophyFact } from './history'
import { kitSupplyFact } from './kits'
import { isDerby } from './matches'
import { shirtFact } from './numbers'
import { CLUB } from '@/lib/club/context'

/**
 * השאלות שנבנות מעובדות — true/false, order and match, all derived from rows the
 * archive already holds. Nothing here is hand-written:
 *
 *  · **tf** — the true statement is the row. The false one swaps in a REAL value of the
 *    same kind that the archive can show is wrong (a season the club did not win that
 *    cup, a maker that did not supply that season, a number somebody else wore). Each
 *    fact yields ONE statement; which of the two is decided by a hash, so the bank is
 *    about half true and a player cannot learn a bias.
 *  · **order** — three dated facts of one kind, at least a year apart, labelled so that
 *    no label carries its own date.
 *  · **match** — three facts of one pairable kind, cross-checked so that no left item
 *    also fits a right item other than its own.
 */

const coin = (label: string) => parseInt(hash(`tf:${label}`, 2), 16) % 2 === 0

function pickOther<T>(label: string, items: readonly T[]): T | undefined {
  return shuffle(items, seeded(label))[0]
}

const wonRows = () =>
  archive.trophies.filter(
    (row) =>
      row.result === 'won' &&
      // the league titles of the abandoned 1930s seasons are the ones the sources count
      // differently (fact-conflicts: championship_count) — never a statement either way
      !(row.competitionSlug === 'ליגת-העל' && (yearOf(row.seasonLabel) ?? 0) < 1950),
  )

/** three items drawn around each anchor, pairwise at least `gap` apart; deduplicated */
function triples<T>(
  label: string,
  items: readonly T[],
  ok: (a: T, b: T) => boolean,
  id: (item: T) => string,
): T[][] {
  const out: T[][] = []
  const seen = new Set<string>()
  items.forEach((anchor, index) => {
    const random = seeded(`${label}:${id(anchor)}`)
    const picked = [anchor]
    for (const other of shuffle(items.filter((_, at) => at !== index), random)) {
      if (picked.every((member) => ok(member, other))) picked.push(other)
      if (picked.length === 3) break
    }
    if (picked.length < 3) return
    const key = picked.map(id).sort().join('|')
    if (seen.has(key)) return
    seen.add(key)
    out.push(picked)
  })
  return out
}

function unique<T>(items: readonly T[], label: (item: T) => string): T[] {
  const count = new Map<string, number>()
  for (const item of items) count.set(label(item), (count.get(label(item)) ?? 0) + 1)
  return items.filter((item) => count.get(label(item)) === 1)
}

const SOURCE_OF_FACTS = (facts: Fact[]) => facts[0]?.source ?? { title: 'ארכיון', url: null, confidence: 2 }

export function generatedTemplates(openThrough: number): Template[] {
  return [
    /* ------------------------------------------------------------------ true / false */
    {
      slug: 'tf-trophy',
      base: 2,
      build: () => {
        const rows = wonRows()
        const out: Draft[] = []
        for (const row of rows) {
          const competition = nameOf.competition(row.competitionSlug)
          const wonThis = new Set(rows.filter((other) => other.competitionSlug === row.competitionSlug).map((other) => other.seasonLabel))
          const truth = coin(`trophy:${row.competitionSlug}:${row.seasonLabel}`)
          // a false season is one the club won SOMETHING in, so it is a real season in the
          // record — and the trophy table says this competition was not won in it
          const falseSeason = pickOther(
            `tf-trophy:${row.competitionSlug}:${row.seasonLabel}`,
            [...new Set(rows.map((other) => other.seasonLabel))].filter(
              (season) => !wonThis.has(season) && (yearOf(season) ?? 0) >= 1950,
            ),
          )
          if (!truth && !falseSeason) continue
          const season = truth ? row.seasonLabel : (falseSeason as string)
          out.push({
            key: `tf-trophy:${row.competitionSlug}:${row.seasonLabel}`,
            template: 'tf-trophy',
            type: 'tf',
            prompt: `${CLUB.names.he} זכתה ב${competition} בעונת ${season}.`,
            answer: truth ? 'true' : 'false',
            source: sourceOf(row),
            explanation: truth
              ? `${competition} · ${row.seasonLabel}`
              : `${competition} לא הגיע בעונת ${season}. אחת הזכיות: ${row.seasonLabel}`,
            when: row.seasonLabel,
            topics: ['history'],
            // not a count: the league's count is the contested number (13 · 12 · 14)
            hint: { kind: 'decade' },
            facts: [trophyFact(row)],
          })
        }
        return out
      },
    },
    {
      slug: 'tf-euro',
      base: 3,
      build: () => {
        const ties = archive.euroTies.filter((tie) => !tie.opponentHe.includes(' · '))
        const seasons = [...new Set(ties.map((tie) => tie.seasonLabel))]
        const out: Draft[] = []
        for (const tie of ties) {
          const truth = coin(`euro:${tie.slug}`)
          const met = new Set(ties.filter((other) => other.opponentHe === tie.opponentHe).map((other) => other.seasonLabel))
          const falseSeason = pickOther(`tf-euro:${tie.slug}`, seasons.filter((season) => !met.has(season)))
          if (!truth && !falseSeason) continue
          const season = truth ? tie.seasonLabel : (falseSeason as string)
          out.push({
            key: `tf-euro:${tie.slug}`,
            template: 'tf-euro',
            type: 'tf',
            prompt: `בעונת ${season} שיחקה ${CLUB.names.he} באירופה מול ${tie.opponentHe}.`,
            answer: truth ? 'true' : 'false',
            source: sourceOf(tie),
            explanation: `${tie.opponentHe} · ${tie.competitionHe} · ${tie.stageHe} · ${tie.seasonLabel} · ${tie.aggregateHe}`,
            when: tie.seasonLabel,
            topics: ['europe'],
            hint: { kind: 'context', he: tie.competitionHe },
            facts: [euroTieFact(tie)],
          })
        }
        return out
      },
    },
    {
      slug: 'tf-kit',
      base: 2,
      build: () => {
        const bySeason = new Map<string, Set<string>>()
        const spellOf = new Map<string, (typeof archive.kitSupply)[number]>()
        for (const spell of archive.kitSupply) {
          for (const season of seasonsInSpell(spell, openThrough)) {
            const set = bySeason.get(season) ?? new Set<string>()
            set.add(nameOf.manufacturer(spell.manufacturerSlug))
            bySeason.set(season, set)
            spellOf.set(`${season}|${nameOf.manufacturer(spell.manufacturerSlug)}`, spell)
          }
        }
        const makers = [...new Set(archive.kitSupply.map((spell) => nameOf.manufacturer(spell.manufacturerSlug)))]
        const out: Draft[] = []
        for (const [season, supplied] of bySeason) {
          // a season two spells both claim is not a statement either way
          if (supplied.size !== 1) continue
          const maker = [...supplied][0] as string
          const spell = spellOf.get(`${season}|${maker}`)
          if (!spell) continue
          const truth = coin(`kit:${season}`)
          const other = pickOther(`tf-kit:${season}`, makers.filter((name) => !supplied.has(name)))
          if (!truth && !other) continue
          out.push({
            key: `tf-kit:${season}`,
            template: 'tf-kit',
            type: 'tf',
            prompt: `${truth ? maker : other} הלבישה את ${CLUB.names.he} בעונת ${season}.`,
            answer: truth ? 'true' : 'false',
            source: sourceOf(spell),
            explanation: `${maker} · ${season}`,
            when: season,
            topics: ['kits'],
            hint: { kind: 'decade' },
            facts: [kitSupplyFact(maker, season, spell)],
          })
        }
        return out
      },
    },
    {
      slug: 'tf-goal',
      base: 3,
      build: () => {
        const goals = archive.goals.filter((goal) => !goalOpponentConflict(goal.goalId))
        const opponents = [...new Set(goals.map((goal) => goal.opponentHe))]
        const out: Draft[] = []
        for (const goal of goals) {
          const truth = coin(`goal:${goal.goalId}`)
          const other = pickOther(`tf-goal:${goal.goalId}`, opponents.filter((name) => name !== goal.opponentHe))
          if (!truth && !other) continue
          out.push({
            key: `tf-goal:${goal.goalId}`,
            template: 'tf-goal',
            type: 'tf',
            prompt: `"${goal.titleHe}" נכבש מול ${truth ? goal.opponentHe : other}.`,
            answer: truth ? 'true' : 'false',
            source: sourceOf(goal),
            explanation: `${goal.titleHe} · ${goal.opponentHe} · ${goal.subtitleHe}`,
            when: (goal as { playedOn?: string }).playedOn ?? null,
            topics: goalTopics(goal),
            hint: { kind: 'context', he: goal.competitionHe },
            facts: [goalFact(goal)],
          })
        }
        return out
      },
    },
    {
      slug: 'tf-shirt',
      base: 4,
      build: () => {
        const holders = new Map<string, string[]>()
        for (const row of archive.shirtNumbers) {
          const key = `${row.seasonLabel}|${row.shirtNumber}`
          holders.set(key, [...(holders.get(key) ?? []), row.personNameHe])
        }
        const clean = archive.shirtNumbers.filter(
          (row) =>
            row.disputed !== true &&
            !shirtConflict(row.seasonLabel, row.shirtNumber) &&
            holders.get(`${row.seasonLabel}|${row.shirtNumber}`)?.length === 1,
        )
        const out: Draft[] = []
        for (const row of clean) {
          const truth = coin(`shirt:${row.seasonLabel}:${row.shirtNumber}`)
          // a number somebody ELSE — and only somebody else — wore that season
          const wrong = pickOther(
            `tf-shirt:${row.seasonLabel}:${row.shirtNumber}`,
            clean.filter(
              (other) =>
                other.seasonLabel === row.seasonLabel &&
                other.shirtNumber !== row.shirtNumber &&
                other.personNameHe !== row.personNameHe &&
                !archive.shirtNumbers.some(
                  (mine) =>
                    mine.personNameHe === row.personNameHe &&
                    mine.seasonLabel === row.seasonLabel &&
                    mine.shirtNumber === other.shirtNumber,
                ),
            ),
          )
          if (!truth && !wrong) continue
          const number = truth ? row.shirtNumber : (wrong as (typeof clean)[number]).shirtNumber
          out.push({
            key: `tf-shirt:${row.seasonLabel}:${row.shirtNumber}`,
            template: 'tf-shirt',
            type: 'tf',
            prompt: `${row.personNameHe} לבש את מספר ${number} בעונת ${row.seasonLabel}.`,
            answer: truth ? 'true' : 'false',
            source: sourceOf(row),
            explanation: `${row.personNameHe} · מספר ${row.shirtNumber} · ${row.seasonLabel}`,
            when: row.seasonLabel,
            topics: ['numbers', 'players'],
            hint: { kind: 'strike' },
            facts: [shirtFact(row)],
          })
        }
        return out
      },
    },
    {
      /** the derby result, as a statement — the sides and the score are the row's own */
      slug: 'tf-derby',
      base: 3,
      build: () => {
        const out: Draft[] = []
        for (const match of archive.matches) {
          if (!isDerby(match) || match.homeScore === null || match.awayScore === null) continue
          if (matchConflict(match)) continue
          const ours = match.homeClubSlug === US ? match.homeScore : match.awayScore
          const theirs = match.homeClubSlug === US ? match.awayScore : match.homeScore
          const won = ours > theirs
          const competition = nameOf.competition(match.competitionSlug)
          const where = `${competition} ${match.seasonLabel}${match.stage ? `, ${match.stage}` : ''}`
          out.push({
            key: `tf-derby:${match.seasonLabel}|${match.competitionSlug}|${match.stage ?? ''}|${match.playedOn ?? ''}`,
            template: 'tf-derby',
            type: 'tf',
            prompt: `${CLUB.names.he} ניצחה את ${nameOf.club(opponentOf(match))} בדרבי — ${where}.`,
            answer: won ? 'true' : 'false',
            source: sourceOf(match),
            explanation: `הפועל ${ours} · ${nameOf.club(DERBY_RIVAL ?? '')} ${theirs} · ${match.playedOn ?? match.seasonLabel}`,
            when: match.playedOn ?? match.seasonLabel,
            topics: ['derby'],
            hint: { kind: 'context', he: match.homeClubSlug === US ? 'הפועל ארחה' : 'מכבי ארחה' },
          })
        }
        return out
      },
    },
    /* ----------------------------------------------------------------------- order */
    {
      slug: 'order-euro',
      base: 4,
      build: () => {
        const ties = unique(
          archive.euroTies.filter((tie) => !tie.opponentHe.includes(' · ')),
          (tie) => tie.opponentHe,
        )
        return triples(
          'order-euro',
          ties,
          (a, b) => Math.abs((yearOf(a.seasonLabel) ?? 0) - (yearOf(b.seasonLabel) ?? 0)) >= 1,
          (tie) => tie.slug,
        ).map((picked): Draft => {
          const ordered = [...picked].sort((a, b) => (yearOf(a.seasonLabel) ?? 0) - (yearOf(b.seasonLabel) ?? 0))
          const facts = ordered.map(euroTieFact)
          return {
            key: `order-euro:${picked.map((tie) => tie.slug).sort().join('|')}`,
            template: 'order-euro',
            type: 'order',
            prompt: 'סדרו את שלושת המפגשים האירופיים מהמוקדם למאוחר.',
            answer: ordered.map((tie) => tie.opponentHe),
            source: SOURCE_OF_FACTS(facts),
            explanation: ordered.map((tie) => `${tie.opponentHe} ${tie.seasonLabel}`).join(' · '),
            topics: ['europe'],
            facts,
          }
        })
      },
    },
    {
      slug: 'order-goal',
      base: 4,
      build: () => {
        const goals = archive.goals.filter((goal) => yearOf((goal as { playedOn?: string }).playedOn ?? null) !== null)
        const year = (goal: (typeof goals)[number]) => yearOf((goal as { playedOn?: string }).playedOn ?? null) ?? 0
        return triples('order-goal', goals, (a, b) => Math.abs(year(a) - year(b)) >= 1, (goal) => goal.goalId).map(
          (picked): Draft => {
            const ordered = [...picked].sort((a, b) => year(a) - year(b))
            const facts = ordered.map(goalFact)
            return {
              key: `order-goal:${picked.map((goal) => goal.goalId).sort().join('|')}`,
              template: 'order-goal',
              type: 'order',
              prompt: 'סדרו את שלושת השערים מהמוקדם למאוחר.',
              answer: ordered.map((goal) => goal.titleHe),
              source: SOURCE_OF_FACTS(facts),
              explanation: ordered.map((goal) => `${goal.titleHe} ${year(goal)}`).join(' · '),
              topics: ['history'],
              facts,
            }
          },
        )
      },
    },
    {
      slug: 'order-moment',
      base: 3,
      build: () => {
        // a title with a four-digit number in it could read as its own date — left out
        const moments = archive.moments.filter(
          (row) => row.happenedOn !== null && !/\d{4}/.test(row.titleHe) && (row as { sport?: string }).sport !== 'basketball',
        )
        const year = (row: (typeof moments)[number]) => yearOf(row.happenedOn) ?? 0
        return triples('order-moment', moments, (a, b) => Math.abs(year(a) - year(b)) >= 1, (row) => row.slug).map(
          (picked): Draft => {
            const ordered = [...picked].sort((a, b) => year(a) - year(b))
            const facts = ordered.map(momentFact)
            return {
              key: `order-moment:${picked.map((row) => row.slug).sort().join('|')}`,
              template: 'order-moment',
              type: 'order',
              prompt: 'סדרו את שלושת הרגעים מהמוקדם למאוחר.',
              answer: ordered.map((row) => row.titleHe),
              source: SOURCE_OF_FACTS(facts),
              explanation: ordered.map((row) => `${row.titleHe} ${year(row)}`).join(' · '),
              topics: ['history'],
              facts,
            }
          },
        )
      },
    },
    {
      slug: 'order-crest',
      base: 4,
      build: () =>
        triples('order-crest', archive.crests, (a, b) => a.fromYear !== b.fromYear, (row) => String(row.fromYear)).map(
          (picked): Draft => {
            const ordered = [...picked].sort((a, b) => a.fromYear - b.fromYear)
            const facts = ordered.map(crestFact)
            return {
              key: `order-crest:${picked.map((row) => row.fromYear).sort().join('|')}`,
              template: 'order-crest',
              type: 'order',
              prompt: 'סדרו את שלבי הסמל מהמוקדם למאוחר.',
              answer: ordered.map((row) => row.nameHe),
              source: SOURCE_OF_FACTS(facts),
              explanation: ordered.map((row) => `${row.nameHe} ${row.fromYear}`).join(' · '),
              topics: ['history', 'kits'],
              facts,
            }
          },
        ),
    },
    /* ----------------------------------------------------------------------- match */
    {
      slug: 'match-trophy',
      base: 3,
      build: () => {
        const rows = wonRows()
        const wonIn = (competition: string, season: string) =>
          rows.some((row) => row.competitionSlug === competition && row.seasonLabel === season)
        return triples(
          'match-trophy',
          rows,
          (a, b) =>
            a.competitionSlug !== b.competitionSlug &&
            a.seasonLabel !== b.seasonLabel &&
            // cross-check: neither competition was also won in the other's season
            !wonIn(a.competitionSlug, b.seasonLabel) &&
            !wonIn(b.competitionSlug, a.seasonLabel),
          (row) => `${row.competitionSlug}|${row.seasonLabel}`,
        )
          .filter((picked) =>
            picked.every((a) => picked.every((b) => a === b || !wonIn(a.competitionSlug, b.seasonLabel))),
          )
          .map((picked): Draft => {
            const facts = picked.map(trophyFact)
            return {
              key: `match-trophy:${picked.map((row) => `${row.competitionSlug}|${row.seasonLabel}`).sort().join('|')}`,
              template: 'match-trophy',
              type: 'match',
              prompt: 'התאימו כל תואר לעונה שבה הפועל תל אביב זכתה בו.',
              left: picked.map((row) => nameOf.competition(row.competitionSlug)),
              answer: picked.map((row) => row.seasonLabel),
              source: SOURCE_OF_FACTS(facts),
              explanation: picked.map((row) => `${nameOf.competition(row.competitionSlug)} — ${row.seasonLabel}`).join(' · '),
              topics: ['history'],
              facts,
            }
          })
      },
    },
    {
      slug: 'match-euro',
      base: 4,
      build: () => {
        const ties = unique(
          archive.euroTies.filter((tie) => !tie.opponentHe.includes(' · ')),
          (tie) => tie.opponentHe,
        )
        return triples('match-euro', ties, (a, b) => a.seasonLabel !== b.seasonLabel, (tie) => tie.slug).map(
          (picked): Draft => {
            const facts = picked.map(euroTieFact)
            return {
              key: `match-euro:${picked.map((tie) => tie.slug).sort().join('|')}`,
              template: 'match-euro',
              type: 'match',
              prompt: 'התאימו כל יריבה אירופית לעונה שבה פגשנו אותה.',
              left: picked.map((tie) => tie.opponentHe),
              answer: picked.map((tie) => tie.seasonLabel),
              source: SOURCE_OF_FACTS(facts),
              explanation: picked.map((tie) => `${tie.opponentHe} — ${tie.seasonLabel}`).join(' · '),
              topics: ['europe'],
              facts,
            }
          },
        )
      },
    },
    {
      slug: 'match-goal',
      base: 4,
      build: () => {
        const goals = archive.goals.filter((goal) => !goalOpponentConflict(goal.goalId))
        return triples('match-goal', goals, (a, b) => a.opponentHe !== b.opponentHe, (goal) => goal.goalId).map(
          (picked): Draft => {
            const facts = picked.map(goalFact)
            return {
              key: `match-goal:${picked.map((goal) => goal.goalId).sort().join('|')}`,
              template: 'match-goal',
              type: 'match',
              prompt: 'התאימו כל שער ליריבה שמולה נכבש.',
              left: picked.map((goal) => goal.titleHe),
              answer: picked.map((goal) => goal.opponentHe),
              source: SOURCE_OF_FACTS(facts),
              explanation: picked.map((goal) => `${goal.titleHe} — ${goal.opponentHe}`).join(' · '),
              topics: ['history'],
              facts,
            }
          },
        )
      },
    },
    {
      slug: 'match-crest',
      base: 4,
      build: () =>
        triples('match-crest', archive.crests, (a, b) => a.fromYear !== b.fromYear, (row) => String(row.fromYear)).map(
          (picked): Draft => {
            const facts = picked.map(crestFact)
            return {
              key: `match-crest:${picked.map((row) => row.fromYear).sort().join('|')}`,
              template: 'match-crest',
              type: 'match',
              prompt: 'התאימו כל שלב בסמל לשנה שבה נכנס.',
              left: picked.map((row) => row.nameHe),
              answer: picked.map((row) => String(row.fromYear)),
              source: SOURCE_OF_FACTS(facts),
              explanation: picked.map((row) => `${row.nameHe} — ${row.fromYear}`).join(' · '),
              topics: ['history', 'kits'],
              facts,
            }
          },
        ),
    },
    {
      slug: 'match-shirt',
      base: 5,
      build: () => {
        const holders = new Map<string, string[]>()
        for (const row of archive.shirtNumbers) {
          const key = `${row.seasonLabel}|${row.shirtNumber}`
          holders.set(key, [...(holders.get(key) ?? []), row.personNameHe])
        }
        const clean = archive.shirtNumbers.filter(
          (row) =>
            row.disputed !== true &&
            !shirtConflict(row.seasonLabel, row.shirtNumber) &&
            holders.get(`${row.seasonLabel}|${row.shirtNumber}`)?.length === 1,
        )
        const wore = (name: string, season: string, number: number) =>
          archive.shirtNumbers.some(
            (row) => row.personNameHe === name && row.seasonLabel === season && row.shirtNumber === number,
          )
        return triples(
          'match-shirt',
          clean,
          (a, b) =>
            a.seasonLabel === b.seasonLabel &&
            a.personNameHe !== b.personNameHe &&
            a.shirtNumber !== b.shirtNumber &&
            !wore(a.personNameHe, a.seasonLabel, b.shirtNumber) &&
            !wore(b.personNameHe, b.seasonLabel, a.shirtNumber),
          (row) => `${row.seasonLabel}|${row.shirtNumber}`,
        ).map((picked): Draft => {
          const facts = picked.map(shirtFact)
          const season = picked[0]?.seasonLabel ?? ''
          return {
            key: `match-shirt:${picked.map((row) => `${row.seasonLabel}|${row.shirtNumber}`).sort().join('|')}`,
            template: 'match-shirt',
            type: 'match',
            prompt: `התאימו כל שחקן למספר שלבש בעונת ${season}.`,
            left: picked.map((row) => row.personNameHe),
            answer: picked.map((row) => String(row.shirtNumber)),
            source: SOURCE_OF_FACTS(facts),
            explanation: picked.map((row) => `${row.personNameHe} — ${row.shirtNumber}`).join(' · '),
            topics: ['numbers', 'players'],
            facts,
          }
        })
      },
    },
  ]
}
