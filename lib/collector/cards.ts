import { t } from '@/lib/i18n'
import type { StoryCard } from '@/lib/share/story'

import type { SeasonSlot } from './metrics'
import type { CollectorShirt } from './types'

/**
 * המילים של הארון — תאריך של חולצה, שם של עשור, וארבעת כרטיסי השיתוף (מפרט §45–§49).
 *
 * התאריך נבנה כאן ולא נשמר בשום שורה (מפרט §72): `1994/95` כשהארכיון בטוח בעונה, `1994 בערך`
 * כשהמקור נתן שנה (כלל 69 §4). הכרטיסים מקבלים מחרוזות מוכנות ו-`lib/share/story.ts` רק מצייר.
 */

type Dated = Pick<CollectorShirt, 'seasonLabel' | 'seasonAmbiguous' | 'yearRaw' | 'year'>

export function shirtDateText(shirt: Dated): string {
  if (!shirt.seasonAmbiguous && shirt.seasonLabel) return shirt.seasonLabel
  return t('kits.archive.approxOf', { y: String(shirt.yearRaw ?? shirt.year) })
}

export function slotText(slot: Pick<SeasonSlot, 'seasonLabel' | 'year'>): string {
  return slot.seasonLabel ?? t('kits.archive.approxOf', { y: String(slot.year) })
}

/** `1990` → `שנות ה-90`; `2010` → `שנות ה-2010` — the archive's own wording. */
export function decadeText(decade: number): string {
  return t('kits.archive.decade', { d: decadeShort(decade) })
}

export function decadeShort(decade: number): string {
  return decade < 2000 ? String(decade).slice(2) : String(decade)
}

/**
 * A figure run inside a Hebrew message, isolated LTR with the Unicode isolates — WhatsApp and
 * Telegram have no `<bdi>`, and `1994/95` in an RTL line is exactly the run that reorders.
 */
export const isolate = (text: string): string => `\u2066${text}\u2069`

export function closetCard(args: {
  name: string
  copies: number
  span: { from: number; to: number } | null
  keeper: string | null
}): StoryCard {
  const count = String(args.copies)
  const countLabel = t(args.copies === 1 ? 'collector.card.closet.countOne' : 'collector.card.closet.count')
  const title = t('collector.card.closet.title', { name: args.name })
  return {
    template: 'closet',
    kicker: 'THE WORKER · MY CLOSET',
    label: title,
    eyebrow: countLabel,
    hero: count,
    stats: [],
    cta: t('collector.card.closet.cta'),
    challenge: t('collector.card.closet.challenge'),
    collector: {
      kind: 'closet',
      title,
      count,
      countLabel,
      span: args.span ? { from: String(args.span.from), to: String(args.span.to) } : null,
      keeper: args.keeper ? { label: t('collector.card.closet.keeper'), shirt: args.keeper } : null,
    },
  }
}

/** `variantHe` rides on the club line when it is not the home shirt: "הפועל תל אביב · חוץ". */
export function wantedCard(shirt: string, variantHe: string | null = null): StoryCard {
  const club = variantHe ? `${t('collector.card.wanted.club')} · ${variantHe}` : t('collector.card.wanted.club')
  return {
    template: 'wanted',
    kicker: 'THE WORKER · WANTED',
    label: t('collector.card.wanted.lead'),
    eyebrow: club,
    hero: shirt,
    stats: [],
    cta: t('collector.card.wanted.cta'),
    challenge: t('collector.card.wanted.challenge'),
    collector: {
      kind: 'wanted',
      lead: t('collector.card.wanted.lead'),
      club,
      shirt,
      plea: t('collector.card.wanted.plea'),
    },
  }
}

export function gapsCard(decade: string, score: string, rows: string[]): StoryCard {
  const label = rows.length === 0 ? t('collector.card.gaps.complete') : t('collector.card.gaps.label')
  return {
    template: 'gaps',
    kicker: 'THE WORKER · MY GAPS',
    label: decade,
    eyebrow: label,
    hero: score,
    stats: [],
    cta: t('collector.card.gaps.cta'),
    challenge: t('collector.card.gaps.challenge'),
    collector: { kind: 'gaps', decade, score, label, rows },
  }
}

export function matchCard(mine: string, theirs: string | null): StoryCard {
  return {
    template: 'match',
    kicker: 'THE WORKER · RED MARKET',
    label: 'MATCH COMPLETED',
    eyebrow: t('collector.card.match.via'),
    hero: theirs === null ? mine : `${mine} ⇄ ${theirs}`,
    stats: [],
    cta: t('collector.card.match.cta'),
    challenge: t('collector.card.match.challenge'),
    collector: { kind: 'match', head: 'MATCH COMPLETED', from: mine, to: theirs, via: t('collector.card.match.via') },
  }
}
