import 'server-only'

import { archive, nameOf } from '../../archive'
import { seasonsInSpell, spellCoversSeason } from '../../seasons'
import { fact, sourceOf, type Draft, type Template } from '../draft'
import { CLUB } from '@/lib/club/context'

/**
 * החולצות — who made the shirt and whose name was on its chest. The thirty-three kits
 * Maor photographed are a far denser record than the deal table; the supply spells cover
 * every season inside their range, not only the one they start in.
 *
 * Nothing here asks a shirt ↔ season question in a form that would hand gate 4 its
 * answer sheet (rule 24): the kit-look question quotes the archive's own note about a
 * shirt, it never draws one.
 */

export function kitSupplyFact(maker: string, season: string, row: Parameters<typeof sourceOf>[0]) {
  return fact({
    kind: 'kit-supply',
    key: `${maker}|${season}`,
    subject: maker,
    value: season,
    valueType: 'season',
    when: season,
    topics: ['kits'],
    source: sourceOf(row),
  })
}

export function kitTemplates(openThrough: number): Template[] {
  return [
    {
      slug: 'kit-sponsor-season',
      base: 3,
      build: () => {
        const rows = archive.kitDesigns.filter((row) => row.sponsorHe !== null && row.variant === 'home')
        const sponsors = rows.map((row) => row.sponsorHe as string)
        return rows.map(
          (row): Draft => ({
            key: `kit-sponsor-season:${row.seasonLabel}`,
            legacyKey: `kit-sponsor-season:${row.seasonLabel}`,
            template: 'kit-sponsor-season',
            type: 'mcq',
            prompt: `איזה ספונסר היה על חזה חולצת הבית בעונת ${row.seasonLabel}?`,
            answer: row.sponsorHe as string,
            pool: sponsors,
            source: sourceOf(row),
            explanation: row.noteHe ?? '',
            when: row.seasonLabel,
            topics: ['kits'],
          }),
        )
      },
    },
    {
      slug: 'kit-maker-season',
      base: 2,
      build: () => {
        const rows = archive.kitDesigns.filter((row) => row.makerHe !== null && row.variant === 'home')
        const makers = rows.map((row) => row.makerHe as string)
        return rows.map(
          (row): Draft => ({
            key: `kit-maker-season:${row.seasonLabel}`,
            legacyKey: `kit-maker-season:${row.seasonLabel}`,
            template: 'kit-maker-season',
            type: 'mcq',
            prompt: `מי הלבישה את ${CLUB.names.he} בעונת ${row.seasonLabel}?`,
            answer: row.makerHe as string,
            pool: makers,
            source: sourceOf(row),
            explanation: row.noteHe ?? '',
            when: row.seasonLabel,
            topics: ['kits'],
            facts: [kitSupplyFact(row.makerHe as string, row.seasonLabel, row)],
          }),
        )
      },
    },
    {
      slug: 'kit-look',
      base: 5,
      build: () => {
        const rows = archive.kitDesigns.filter((row) => typeof row.noteHe === 'string' && row.noteHe.length > 20)
        const seasons = rows.map((row) => row.seasonLabel)
        return rows.map(
          (row): Draft => ({
            key: `kit-look:${row.seasonLabel}:${row.variant}`,
            legacyKey: `kit-look:${row.seasonLabel}:${row.variant}`,
            template: 'kit-look',
            type: 'year',
            prompt: 'מאיזו עונה החולצה הזאת?',
            quoteHe: row.noteHe,
            answer: row.seasonLabel,
            pool: seasons,
            source: sourceOf(row),
            explanation: `${row.seasonLabel} · ${row.variant}`,
            when: row.seasonLabel,
            topics: ['kits'],
          }),
        )
      },
    },
    {
      slug: 'kit-maker',
      base: 2,
      build: () => {
        const makers = archive.manufacturers.map((maker) => maker.nameHe)
        const out: Draft[] = []
        for (const spell of archive.kitSupply) {
          const correct = nameOf.manufacturer(spell.manufacturerSlug)
          for (const season of seasonsInSpell(spell, openThrough)) {
            out.push({
              key: `kit:${spell.manufacturerSlug}:${season}`,
              legacyKey: `kit:${spell.manufacturerSlug}:${season}`,
              template: 'kit-maker',
              type: 'mcq',
              prompt: `איזה יצרן חתום על מדי ${CLUB.names.he} בעונת ${season}?`,
              answer: correct,
              pool: makers,
              source: sourceOf(spell),
              explanation: `${correct} · ${
                spell.toLabel === spell.fromLabel ? spell.fromLabel : `${spell.fromLabel}${spell.toLabel ? `–${spell.toLabel}` : ' ואילך'}`
              }`,
              when: season,
              topics: ['kits'],
              facts: [kitSupplyFact(correct, season, spell)],
            })
          }
        }
        return out
      },
    },
    {
      /** Competition-scoped: 2010/11 carried Keter in Europe and Bonei HaTichon at home. */
      slug: 'sponsor',
      base: 3,
      build: () => {
        const seasons = new Set(archive.kitSupply.flatMap((spell) => seasonsInSpell(spell, openThrough)))
        const sponsors = archive.sponsors.map((sponsor) => sponsor.nameHe)
        const out: Draft[] = []
        for (const deal of archive.sponsorDeals) {
          const correct = nameOf.sponsor(deal.sponsorSlug)
          const where = deal.competitionSlug ? `ב${nameOf.competition(deal.competitionSlug)} ` : ''
          for (const season of seasons) {
            if (!spellCoversSeason(deal, season)) continue
            out.push({
              key: `sponsor:${deal.sponsorSlug}:${season}:${deal.competitionSlug ?? 'all'}`,
              legacyKey: `sponsor:${deal.sponsorSlug}:${season}:${deal.competitionSlug ?? 'all'}`,
              template: 'sponsor',
              type: 'mcq',
              prompt: `איזו חברה התנוססה על חזה החולצה ${where}בעונת ${season}?`,
              answer: correct,
              pool: sponsors,
              source: sourceOf(deal),
              explanation: deal.noteHe ?? `${correct} · ${season}`,
              when: season,
              topics: ['kits'],
            })
          }
        }
        return out
      },
    },
    {
      // the raw year label, exactly as the source writes it — "בשנת", never "בעונת"
      slug: 'sponsor-year',
      base: 3,
      build: () => {
        const sponsors = archive.sponsorYears.map((other) => other.mainSponsorHe)
        return archive.sponsorYears.map(
          (row): Draft => ({
            key: `sponsor-year:${row.yearLabelRaw}`,
            legacyKey: `sponsor-year:${row.yearLabelRaw}`,
            template: 'sponsor-year',
            type: 'mcq',
            prompt: `מי היה נותן החסות הראשי על חולצת ${CLUB.names.he} בשנת ${row.yearLabelRaw}?`,
            answer: row.mainSponsorHe,
            pool: sponsors,
            source: sourceOf(row),
            explanation: row.noteHe ?? `${row.mainSponsorHe} · ${row.yearLabelRaw}`,
            when: row.yearLabelRaw,
            topics: ['kits'],
          }),
        )
      },
    },
    {
      slug: 'maker-year',
      base: 2,
      build: () => {
        const makers = archive.sponsorYears
          .filter((other) => other.manufacturerHe)
          .map((other) => other.manufacturerHe as string)
        return archive.sponsorYears
          .filter((row) => row.manufacturerHe)
          .map(
            (row): Draft => ({
              key: `maker-year:${row.yearLabelRaw}`,
              legacyKey: `maker-year:${row.yearLabelRaw}`,
              template: 'maker-year',
              type: 'mcq',
              prompt: `איזה מותג ייצר את מדי ${CLUB.names.he} בשנת ${row.yearLabelRaw}?`,
              answer: row.manufacturerHe as string,
              pool: makers,
              source: sourceOf(row),
              explanation: `${row.manufacturerHe} · ${row.yearLabelRaw}`,
              when: row.yearLabelRaw,
              topics: ['kits'],
            }),
          )
      },
    },
  ]
}
