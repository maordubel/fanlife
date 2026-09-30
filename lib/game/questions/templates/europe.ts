import 'server-only'

import { archive } from '../../archive'
import { fact, sourceOf, stripThe, type Draft, type Template } from '../draft'
import { CLUB } from '@/lib/club/context'

/**
 * הלילות האירופיים — the European record read as TIES rather than fixtures: a two-legged
 * tie is the unit a supporter remembers, and the aggregate is the fact.
 */

const ties = () => archive.euroTies.filter((tie) => !tie.opponentHe.includes(' · '))

export function euroTieFact(tie: (typeof archive.euroTies)[number]) {
  return fact({
    kind: 'euro-tie',
    key: tie.slug,
    subject: tie.opponentHe,
    value: tie.seasonLabel,
    valueType: 'season',
    when: tie.seasonLabel,
    topics: ['europe'],
    source: sourceOf(tie),
  })
}

export const EUROPE_TEMPLATES: Template[] = [
  {
    slug: 'euro-opponent',
    base: 2,
    build: () => {
      const opponents = archive.euroTies.map((tie) => tie.opponentHe)
      return ties().map(
        (tie): Draft => ({
          key: `euro-opponent:${tie.slug}`,
          legacyKey: `euro-opponent:${tie.slug}`,
          template: 'euro-opponent',
          type: 'mcq',
          prompt: `מול מי שיחקה ${CLUB.names.he} ב${stripThe(tie.stageHe)} של ${tie.competitionHe}, עונת ${tie.seasonLabel}?`,
          answer: tie.opponentHe,
          pool: opponents,
          source: sourceOf(tie),
          explanation: `${tie.aggregateHe} · ${tie.opponentCountryHe}`,
          when: tie.seasonLabel,
          topics: ['europe'],
          hint: { kind: 'context', he: tie.opponentCountryHe },
          facts: [euroTieFact(tie)],
        }),
      )
    },
  },
  {
    slug: 'euro-round',
    base: 4,
    build: () => {
      const stages = archive.euroTies.map((tie) => tie.stageHe)
      return ties().map(
        (tie): Draft => ({
          key: `euro-round:${tie.slug}`,
          legacyKey: `euro-round:${tie.slug}`,
          template: 'euro-round',
          type: 'mcq',
          prompt: `באיזה שלב פגשה ${CLUB.names.he} את ${tie.opponentHe} בעונת ${tie.seasonLabel}?`,
          answer: tie.stageHe,
          pool: stages,
          source: sourceOf(tie),
          explanation: `${tie.competitionHe} · ${tie.aggregateHe}`,
          when: tie.seasonLabel,
          topics: ['europe'],
          hint: { kind: 'context', he: tie.competitionHe },
          facts: [euroTieFact(tie)],
        }),
      )
    },
  },
  {
    // באיזו עונה — a season is a point on a scale, so this is asked on the year scale.
    slug: 'euro-season',
    base: 3,
    build: () => {
      const seasons = archive.euroTies.map((tie) => tie.seasonLabel)
      return ties().map(
        (tie): Draft => ({
          key: `euro-season:${tie.slug}`,
          legacyKey: `euro-season:${tie.slug}`,
          template: 'euro-season',
          type: 'year',
          prompt: `באיזו עונה שיחקה ${CLUB.names.he} מול ${tie.opponentHe} ב${stripThe(tie.competitionHe)}?`,
          answer: tie.seasonLabel,
          pool: seasons,
          source: sourceOf(tie),
          explanation: `${tie.stageHe} · ${tie.aggregateHe}`,
          when: tie.seasonLabel,
          topics: ['europe'],
          facts: [euroTieFact(tie)],
        }),
      )
    },
  },
  {
    slug: 'euro-aggregate',
    base: 5,
    build: () => {
      const aggregates = archive.euroTies
        .map((tie) => tie.aggregateHe)
        .filter((value) => /^\d+:\d+$/.test(value))
      return ties()
        .filter((tie) => /^\d+:\d+$/.test(tie.aggregateHe))
        .map(
          (tie): Draft => ({
            key: `euro-aggregate:${tie.slug}`,
            legacyKey: `euro-aggregate:${tie.slug}`,
            template: 'euro-aggregate',
            type: 'mcq',
            prompt: `מה היה המצטבר מול ${tie.opponentHe} בעונת ${tie.seasonLabel}?`,
            answer: tie.aggregateHe,
            pool: aggregates,
            source: sourceOf(tie),
            explanation: `${tie.stageHe} · ${tie.advanced ? 'עלינו' : 'נעצרנו'}`,
            when: tie.seasonLabel,
            topics: ['europe', 'numbers'],
            hint: { kind: 'context', he: tie.advanced ? 'עלינו שלב' : 'נעצרנו בשלב הזה' },
            facts: [euroTieFact(tie)],
          }),
        )
    },
  },
  {
    /**
     * איפה שיחקנו "בבית". Ten European home legs were played abroad — only ties with a
     * recorded displacement qualify.
     */
    slug: 'euro-venue',
    base: 5,
    build: () => {
      const places = archive.euroTies
        .map((tie) => tie.homeAbroadHe)
        .filter((value): value is string => value !== undefined)
      return archive.euroTies
        .filter((tie) => typeof tie.homeAbroadHe === 'string')
        .map(
          (tie): Draft => ({
            key: `euro-venue:${tie.slug}`,
            legacyKey: `euro-venue:${tie.slug}`,
            template: 'euro-venue',
            type: 'mcq',
            prompt: `איפה שיחקה ${CLUB.names.he} את משחק ה"בית" מול ${tie.opponentHe} בעונת ${tie.seasonLabel}?`,
            answer: tie.homeAbroadHe as string,
            pool: places,
            source: sourceOf(tie),
            explanation: tie.notableHe ?? `${tie.competitionHe} · ${tie.stageHe}`,
            when: tie.seasonLabel,
            topics: ['europe'],
            facts: [euroTieFact(tie)],
          }),
        )
    },
  },
  {
    slug: 'euro-milestone',
    base: 4,
    build: () => {
      const rows = archive.euroTies.filter(
        (tie) => typeof tie.notableHe === 'string' && tie.notableHe.length > 30,
      )
      const labels = rows.map((tie) => `${tie.opponentHe} · ${tie.seasonLabel}`)
      return rows.map(
        (tie): Draft => ({
          key: `euro-milestone:${tie.slug}`,
          legacyKey: `euro-milestone:${tie.slug}`,
          template: 'euro-milestone',
          type: 'mcq',
          prompt: 'על איזה מפגש אירופי נכתב זה?',
          quoteHe: tie.notableHe as string,
          answer: `${tie.opponentHe} · ${tie.seasonLabel}`,
          pool: labels,
          source: sourceOf(tie),
          explanation: `${tie.competitionHe} · ${tie.stageHe} · ${tie.aggregateHe}`,
          when: tie.seasonLabel,
          topics: ['europe'],
          facts: [euroTieFact(tie)],
        }),
      )
    },
  },
]
