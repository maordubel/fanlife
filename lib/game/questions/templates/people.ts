import 'server-only'

import { archive } from '../../archive'
import { fact, sourceOf, type Draft, type Template } from '../draft'
import { CLUB } from '@/lib/club/context'

/**
 * מי שחצה, מי שנאמר עליו, ומי שאמר — the crossings, the enemies' sourced facts and the
 * calls the terrace remembers.
 */

export function crossingFact(row: (typeof archive.grievances)[number]) {
  return fact({
    kind: 'crossing',
    key: row.slug,
    subject: row.personNameHe ?? row.titleHe,
    value: row.toClubHe ?? row.titleHe,
    valueType: 'club',
    when: row.dateConfirmed === true ? row.happenedOn : null,
    topics: ['players'],
    source: sourceOf(row),
  })
}

export const PEOPLE_TEMPLATES: Template[] = [
  {
    slug: 'crossing-club',
    base: 3,
    build: () => {
      const rows = archive.grievances.filter((row) => row.kind === 'crossing' && typeof row.toClubHe === 'string')
      const clubs = [...rows.map((row) => row.toClubHe as string), ...archive.clubs.map((club) => club.nameHe)]
      return rows.map(
        (row): Draft => ({
          key: `crossing-club:${row.slug}`,
          legacyKey: `crossing-club:${row.slug}`,
          template: 'crossing-club',
          type: 'mcq',
          prompt: `לאן עבר ${row.personNameHe} מ${CLUB.names.he}?`,
          answer: row.toClubHe as string,
          pool: clubs,
          source: sourceOf(row),
          explanation: row.bodyHe,
          when: row.dateConfirmed === true ? row.happenedOn : null,
          topics: ['players'],
          facts: [crossingFact(row)],
        }),
      )
    },
  },
  {
    slug: 'crossing-year',
    base: 4,
    build: () => {
      const rows = archive.grievances.filter(
        (row) => row.kind === 'crossing' && row.dateConfirmed === true && typeof row.happenedOn === 'string',
      )
      const years = archive.grievances
        .filter((row) => typeof row.happenedOn === 'string')
        .map((row) => (row.happenedOn as string).slice(0, 4))
      return rows.map((row): Draft => {
        const year = (row.happenedOn as string).slice(0, 4)
        return {
          key: `crossing-year:${row.slug}`,
          legacyKey: `crossing-year:${row.slug}`,
          template: 'crossing-year',
          type: 'year',
          prompt: `באיזו שנה חצה ${row.personNameHe} את הכביש?`,
          answer: year,
          pool: years,
          source: sourceOf(row),
          explanation: row.bodyHe,
          when: row.happenedOn,
          topics: ['players'],
          facts: [crossingFact(row)],
        }
      })
    },
  },
  {
    /**
     * העובדה → הדמות. FOOTBALL ONLY by the `sport` field (rule 14). The fact asked is the
     * sourced one on the row, never the charge — a charge is what the terrace feels and
     * belongs on the plate in gate 11, not in a quiz with a right answer.
     */
    slug: 'enemy-fact',
    base: 4,
    build: () => {
      const rows = archive.enemies.filter((row) => row.sport === 'football' && row.keyFactHe.length > 4)
      const names = rows.map((row) => row.nameHe)
      return rows.map(
        (row): Draft => ({
          key: `enemy-fact:${row.slug}`,
          legacyKey: `enemy-fact:${row.slug}`,
          template: 'enemy-fact',
          type: 'mcq',
          prompt: `על מי זה נכון — "${row.keyFactHe}"?`,
          answer: row.nameHe,
          pool: names,
          source: sourceOf(row),
          explanation: row.detailHe !== '' ? row.detailHe : row.eraHe,
          when: row.happenedOn,
          topics: [row.category === 'crossed' ? 'players' : 'history'],
          hint: { kind: 'context', he: row.eraHe },
        }),
      )
    },
  },
  {
    /** the distractors ride on the row — a generated fixture here could be one that never happened */
    slug: 'call-match',
    base: 3,
    build: () =>
      archive.calls
        .filter((row) => row.shape === 'match' && row.distractorsHe.length >= 3)
        .map(
          (row): Draft => ({
            key: `call-match:${row.slug}`,
            legacyKey: `call-match:${row.slug}`,
            template: 'call-match',
            type: 'mcq',
            prompt: 'באיזה משחק נאמר המשפט הזה?',
            quoteHe: row.textHe,
            quoteByHe: `${row.speakerHe} · ${row.roleHe}`,
            answer: row.answerHe,
            distractors: row.distractorsHe.slice(0, 3),
            source: sourceOf(row),
            explanation: `${row.speakerHe} · ${row.contextHe}`,
            topics: ['history'],
          }),
        ),
  },
  {
    slug: 'call-person',
    base: 2,
    build: () =>
      archive.calls
        .filter((row) => row.shape === 'person' && row.distractorsHe.length >= 3)
        .map(
          (row): Draft => ({
            key: `call-person:${row.slug}`,
            legacyKey: `call-person:${row.slug}`,
            template: 'call-person',
            type: 'mcq',
            prompt: 'מי אמר את זה?',
            quoteHe: row.textHe,
            answer: row.answerHe,
            distractors: row.distractorsHe.slice(0, 3),
            source: sourceOf(row),
            explanation: `${row.speakerHe} · ${row.contextHe}`,
            topics: ['history'],
            hint: { kind: 'context', he: row.roleHe },
          }),
        ),
  },
]
