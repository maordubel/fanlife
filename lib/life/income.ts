import { decadeOfYear, WAGE } from './prices'
import { trackAtLeast } from './tracks'
import type { LifeState } from './types'

/**
 * הכנסה של מבוגר — a rate, not a scripted gift.
 *
 * Adult chapters carry forward only a bounded amount of what ordinary life could have
 * left in the wallet. The rate comes from the period wage table; the amount kept comes
 * from the life the player actually built. That distinction matters: a partner, an
 * independent home and a child must be felt in the economy without turning family into a
 * penalty screen or requiring a second wallet.
 */

/** hours in a full working month */
const MONTH_HOURS = 186

/** what remains after ordinary living costs */
const KEPT = {
  withParents: 0.4,
  ownPlace: 0.15,
  family: 0.08,
} as const

/** cap on how much of the years between chapters survives as liquid savings */
const CARRY_MONTHS = 2.5
const CARRY_GROWTH = 0.35
const CARRY_CEILING = 6

/** steady work makes income more predictable, not magically lucrative */
const STEADY_WORK = 1.35

export type LivingStage = keyof typeof KEPT

/**
 * איפה הוא חי — read from persistent life facts, never guessed from age.
 *
 * `own:home:independent` is reconciled from the existing 2013 household scene before its
 * chapter-local `hh:home` flag can be cleared. `life:child` is already a durable screenplay
 * fact and is also reconciled into PARENTHOOD. Reading both the canonical track and the
 * old fact makes old saves correct immediately, even before the next room has had a chance
 * to run reconciliation.
 */
export function livingStage(state: LifeState): LivingStage {
  if (trackAtLeast(state, 'PARENTHOOD') || Boolean(state.flags['life:child'])) return 'family'
  if (
    trackAtLeast(state, 'PARTNERSHIP', 'home') ||
    Boolean(state.flags['own:home:independent']) ||
    typeof state.flags['hh:home'] === 'string'
  ) {
    return 'ownPlace'
  }
  return 'withParents'
}

/** what a full working month leaves in the wallet, in agorot */
export function monthlyKeptAgorot(year: number, stage: LivingStage, steady: boolean): number {
  const hourly = WAGE[decadeOfYear(year)]
  const gross = hourly * MONTH_HOURS * 100
  return Math.round(gross * KEPT[stage] * (steady ? STEADY_WORK : 1))
}

/**
 * What survives between two adult chapters. Years matter, but sub-linearly: four years of
 * life are not four years of untouched savings.
 */
export function carriedBetween(fromYear: number, toYear: number, state: LifeState, steady: boolean): number {
  const years = Math.max(0, toYear - fromYear)
  const allowed = Math.min(CARRY_CEILING, CARRY_MONTHS * (1 + CARRY_GROWTH * Math.max(0, years - 1)))
  const months = Math.max(0, Math.min(allowed, years * 12))
  if (months === 0) return 0
  return Math.round((monthlyKeptAgorot(toYear, livingStage(state), steady) * months) / 100) * 100
}

/**
 * Adult chapter entry. WORK is the durable truth; `b:commitKind` is kept as a compatibility
 * read for the first transition immediately after the 2000 bridge.
 */
export function adultEntry(fromYear: number, toYear: number) {
  return (state: LifeState) => {
    const steady = trackAtLeast(state, 'WORK') || state.flags['b:commitKind'] === 'work'
    const agorot = carriedBetween(fromYear, toYear, state, steady)
    if (agorot <= 0) return []
    return [{ t: 'money.changed' as const, agorot, why: steady ? 'מה שנשאר מהמשכורות' : 'מה שנשאר' }]
  }
}

/**
 * A played minute is not an hour of labour. A sixty-minute authored shift can represent a
 * working day; pricing still comes from the historical wage table. Skilled work carries a
 * single shared multiplier rather than a hand-typed scene amount.
 */
const SKILLED = 1.4

export function shiftAgorot(year: number, hours: number, skilled = false): number {
  const hourly = WAGE[decadeOfYear(year)]
  return Math.round(hourly * hours * (skilled ? SKILLED : 1)) * 100
}
