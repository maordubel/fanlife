/**
 * המחירים — what a ticket costs, what a shirt costs, and what an hour of work is worth.
 *
 * Until 5.9.2026 every price in this game was a number typed where it was needed: a
 * ticket was 800 agorot in 1985 and 1000 in 1990, a shirt was 18 shekels in a chapter and
 * 160 in another, and an hour of carrying crates paid four shekels in every decade. Maor
 * gave the table it should always have been derived from — a ticket is 15, 30, 60, 90 and
 * a shirt is 30, 60, 110, 160 — and this file is that table, so a chapter can no longer
 * invent its own economy.
 *
 * Prices are in WHOLE SHEKELS of their own decade, the way the price is said out loud.
 * The state counts agorot, so everything crossing into an effect goes through
 * `shekels()`.
 *
 * The decade is the chapter's, not the player's: the 1986 chapter buys at 1980s prices
 * even though the boy who plays it may already have seen 2000.
 */
import { chapterFor } from './content/chapters'

export type Decade = '80s' | '90s' | '00s' | '10s'

/** agorot from whole shekels — the one place the hundred lives */
export const shekels = (n: number) => Math.round(n * 100)

/** כרטיס — the turnstile, by decade (Maor, 5.9.2026) */
export const TICKET: Record<Decade, number> = { '80s': 15, '90s': 30, '00s': 60, '10s': 90 }

/** חולצה — a home shirt on a rail, by decade (Maor, 5.9.2026) */
export const SHIRT: Record<Decade, number> = { '80s': 30, '90s': 60, '00s': 110, '10s': 160 }

/**
 * מה שעה שווה — what an hour of a child's work pays, by decade.
 *
 * Derived from the two prices above rather than guessed: a shirt should be about six
 * jobs, which is a summer of them for an eight-year-old and an afternoon for a soldier.
 * It is what makes the shirt mean something — Maor asked for the earnings to be updated
 * "accordingly", and this is what accordingly means.
 */
export const WAGE: Record<Decade, number> = { '80s': 5, '90s': 10, '00s': 18, '10s': 26 }

/** the deposit on one bottle, by decade — the child's first income in every chapter */
export const BOTTLE: Record<Decade, number> = { '80s': 1, '90s': 2, '00s': 3, '10s': 4 }

/**
 * מעטפת סופרגול — a packet of stickers, by decade.
 *
 * Priced at exactly one bottle deposit on purpose. It makes the album and the shirt the
 * same money: every packet is a bottle that did not go towards the shirt on the rail, and
 * the child has to decide that dozens of times in an afternoon. A collection that costs
 * nothing is not a collection.
 */
export const PACKET: Record<Decade, number> = { '80s': 1, '90s': 2, '00s': 4, '10s': 6 }

/** a bus fare inside the city, by decade */
export const FARE: Record<Decade, number> = { '80s': 3, '90s': 6, '00s': 12, '10s': 18 }

export function decadeOfYear(year: number): Decade {
  if (year >= 2010) return '10s'
  if (year >= 2000) return '00s'
  if (year >= 1990) return '90s'
  return '80s'
}

/**
 * The decade a chapter is priced in. An unknown id is 1980s on purpose: every chapter
 * that is not in the registry is a stage-A one, and stage A is 1984–1986.
 */
export function decadeOf(chapterId: string): Decade {
  const year = chapterFor(chapterId)?.year
  return decadeOfYear(year ?? 1985)
}

export const ticketPrice = (chapterId: string) => TICKET[decadeOf(chapterId)]
export const shirtPrice = (chapterId: string) => SHIRT[decadeOf(chapterId)]
export const wagePerHour = (chapterId: string) => WAGE[decadeOf(chapterId)]
export const bottlePrice = (chapterId: string) => BOTTLE[decadeOf(chapterId)]
export const farePrice = (chapterId: string) => FARE[decadeOf(chapterId)]

/** agorot, for the effects that spend and pay */
export const ticketAgorot = (chapterId: string) => shekels(ticketPrice(chapterId))
export const shirtAgorot = (chapterId: string) => shekels(shirtPrice(chapterId))
