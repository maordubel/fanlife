/**
 * מפת הזיכרון — Profile אינו "rating" (ONE RED WORLD §25).
 *
 * Seven ground on which a supporter stands — knowledge, memory, tactics, history, moments,
 * identity, collecting — each read from the records the gates already wrote
 * (`records.ts`), and each printed as a WORD at a SIZE. There is no "Fan Score: 87", no
 * bar, no percentage and no rank: a number here would immediately become the thing people
 * optimise, and the product is about love before competition (§1.1).
 *
 * **This file is the only translator from a count to a word.** The component
 * (`components/profile/MemoryMap.tsx`) receives a `MemoryMapReading`, whose every field is
 * a message key, a size token or an href — it cannot render a raw value because it is never
 * handed one. `tests/personal-area.test.ts` walks every reading this function can return and
 * fails on a number, and reads the component's source for an import of the records.
 * Same shape as LIFE's `lib/life/profile.ts` (rule 46), for the same reason.
 *
 * The thresholds are private to this file and read as "how much of this ground has he
 * walked": a few rounds is a spark, a habit is present, a season is strong, years are deep.
 */

import type { MessageKey } from '@/lib/i18n'

import type { Records } from './records'

export const DOMAINS = ['knowledge', 'memory', 'tactics', 'history', 'moments', 'identity', 'collecting'] as const
export type DomainId = (typeof DOMAINS)[number]

export const LEVELS = ['quiet', 'spark', 'present', 'strong', 'deep'] as const
export type Level = (typeof LEVELS)[number]

/** The only visual scale there is: a size token, never a length proportional to a count. */
export type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

export type DomainReading = {
  id: DomainId
  nameKey: MessageKey
  level: Level
  wordKey: MessageKey
  size: Size
  /** which gates feed this ground */
  fedByKey: MessageKey
  /** the door that walks it — the first gate that feeds it */
  href: string
}

export type MemoryMapReading = {
  domains: DomainReading[]
  /** one sentence naming where he stands strongest — or an invitation when nothing is lit */
  headlineKey: MessageKey
  /** the domain the headline names, for the `{domain}` placeholder; null when quiet */
  headlineDomainKey: MessageKey | null
}

const SIZE: Readonly<Record<Level, Size>> = { quiet: 'xs', spark: 'sm', present: 'md', strong: 'lg', deep: 'xl' }

type Rule = { href: string; weight: (r: Records) => number; steps: readonly [number, number, number, number] }

const n = (r: Records, route: string) => r.plays[route] ?? 0

/**
 * Each ground is a weighted count of real deeds, and four steps turn it into a level. The
 * weights say what one deed is worth next to another inside the ground (a whole team sheet
 * is more than one Rumble night); they are never compared ACROSS grounds.
 */
const RULES: Readonly<Record<DomainId, Rule>> = {
  knowledge: {
    href: '/trivia',
    weight: (r) => r.correct + n(r, '/blind-cow') * 4 + r.triviaTopics.length * 3,
    steps: [1, 30, 120, 400],
  },
  memory: {
    href: '/memory',
    weight: (r) => n(r, '/memory') * 3 + r.shelf.length * 2 + n(r, '/kits/build') * 2,
    steps: [1, 12, 40, 120],
  },
  tactics: {
    href: '/xi',
    weight: (r) => r.xiSheets * 6 + n(r, '/lineup') * 3 + n(r, '/royal-rumble') * 2,
    steps: [1, 12, 40, 120],
  },
  history: {
    href: '/archive',
    weight: (r) => r.archiveSeen.length + r.archiveSaved.length * 2 + n(r, '/timeline') * 3 + r.routes.length * 4,
    steps: [1, 20, 80, 250],
  },
  moments: {
    href: '/goal',
    weight: (r) => r.goals.length * 3 + n(r, '/goal') * 2,
    steps: [1, 10, 30, 90],
  },
  identity: {
    href: '/polls',
    weight: (r) => r.ballotPicks.length + (r.ballotSealed ? 6 : 0) + r.debates * 2 + r.hateWalls * 2,
    steps: [1, 8, 24, 60],
  },
  collecting: {
    href: '/kits',
    weight: (r) => r.kits.length * 2 + r.designs,
    steps: [1, 12, 40, 120],
  },
}

function levelOf(weight: number, steps: Rule['steps']): Level {
  if (!(weight >= steps[0])) return 'quiet'
  if (weight < steps[1]) return 'spark'
  if (weight < steps[2]) return 'present'
  if (weight < steps[3]) return 'strong'
  return 'deep'
}

const NAME: Readonly<Record<DomainId, MessageKey>> = {
  knowledge: 'personal.map.domain.knowledge',
  memory: 'personal.map.domain.memory',
  tactics: 'personal.map.domain.tactics',
  history: 'personal.map.domain.history',
  moments: 'personal.map.domain.moments',
  identity: 'personal.map.domain.identity',
  collecting: 'personal.map.domain.collecting',
}

const FED_BY: Readonly<Record<DomainId, MessageKey>> = {
  knowledge: 'personal.map.fed.knowledge',
  memory: 'personal.map.fed.memory',
  tactics: 'personal.map.fed.tactics',
  history: 'personal.map.fed.history',
  moments: 'personal.map.fed.moments',
  identity: 'personal.map.fed.identity',
  collecting: 'personal.map.fed.collecting',
}

const WORD: Readonly<Record<Level, MessageKey>> = {
  quiet: 'personal.map.level.quiet',
  spark: 'personal.map.level.spark',
  present: 'personal.map.level.present',
  strong: 'personal.map.level.strong',
  deep: 'personal.map.level.deep',
}

export function memoryMap(records: Records): MemoryMapReading {
  const domains: DomainReading[] = DOMAINS.map((id) => {
    const rule = RULES[id]
    const level = levelOf(rule.weight(records), rule.steps)
    return { id, nameKey: NAME[id], level, wordKey: WORD[level], size: SIZE[level], fedByKey: FED_BY[id], href: rule.href }
  })
  const rank = (level: Level) => LEVELS.indexOf(level)
  const top = [...domains].sort((a, b) => rank(b.level) - rank(a.level))[0]
  if (!top || top.level === 'quiet') {
    return { domains, headlineKey: 'personal.map.headline.quiet', headlineDomainKey: null }
  }
  const tied = domains.filter((d) => d.level === top.level).length > 1
  return {
    domains,
    headlineKey: tied ? 'personal.map.headline.tied' : 'personal.map.headline.one',
    headlineDomainKey: top.nameKey,
  }
}
