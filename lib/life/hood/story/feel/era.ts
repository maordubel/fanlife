/**
 * LIFE · the hood — the ERA as he lives it (feel pass, 24.11.2026): which year the chapter is, what money is called and
 * what things cost in that decade, how the match reaches him (the radio, the television, a text), and the era's texture
 * lines the inner voice may say on the way. General history only: no club fact, no score, no date, no real person.
 *
 * Money: the story counts small whole UNITS (a shirt is six of them, `childhood.ts`). What is printed is the era's own
 * money where the club pack gives the country (`CURRENCY`), else neutral coins; the factor turns units into the amount
 * said out loud in that decade. Texture, not a record: the factor keeps proportions (a shirt is about six jobs, a packet
 * of stickers one bottle) the way THE WORKER's `prices.ts` derives them; no price here is claimed as history.
 */
import {decadeOf, inEra, type Decade} from '@/lib/life/rush-render/era'

export type {Decade}
/** the year of the chapter: the birth year plus his age (null when the club has no life timeline) */
export const yearAt = (born: number | null | undefined, age: number): number | null => typeof born === 'number' ? born + age : null

type Money = {unit: string; small?: string; factor: Partial<Record<Decade, number>>}
/** the money a country's street counted in, by decade (euro from 2002 where it replaced the old money) */
const CURRENCY: Readonly<Record<string, (year: number) => Money>> = {
  Israel: () => ({unit: 'era.money.shekel', factor: {'70s': 2, '80s': 5, '90s': 10, '00s': 18, '10s': 26, '20s': 30}}),
  Greece: y => y >= 2002 ? {unit: 'era.money.euro', factor: {'00s': 1, '10s': 2, '20s': 2}} : {unit: 'era.money.drachma', factor: {'70s': 20, '80s': 50, '90s': 150, '00s': 300}},
  Italy: y => y >= 2002 ? {unit: 'era.money.euro', factor: {'00s': 1, '10s': 2, '20s': 2}} : {unit: 'era.money.lira', factor: {'70s': 300, '80s': 1000, '90s': 2000, '00s': 3000}},
  Germany: y => y >= 2002 ? {unit: 'era.money.euro', factor: {'00s': 1, '10s': 2, '20s': 2}} : {unit: 'era.money.mark', factor: {'70s': 1, '80s': 2, '90s': 3, '00s': 3}},
  Scotland: () => ({unit: 'era.money.pound', factor: {'70s': 1, '80s': 1, '90s': 2, '00s': 3, '10s': 4, '20s': 5}}),
  Morocco: () => ({unit: 'era.money.dirham', factor: {'70s': 2, '80s': 5, '90s': 10, '00s': 15, '10s': 20, '20s': 25}}),
  Egypt: () => ({unit: 'era.money.egp', factor: {'70s': 1, '80s': 1, '90s': 2, '00s': 4, '10s': 8, '20s': 20}}),
  'Bosnia and Herzegovina': y => y >= 1998 ? {unit: 'era.money.km', factor: {'90s': 2, '00s': 3, '10s': 4, '20s': 5}} : {unit: 'era.money.dinar', factor: {'70s': 20, '80s': 100, '90s': 100}},
}
const NEUTRAL: Partial<Record<Decade, number>> = {'70s': 1, '80s': 1, '90s': 2, '00s': 3, '10s': 4, '20s': 5}

/** the amount said out loud for `units`, and the words key of the money (`{n}` fills it) */
export function moneyOf(units: number, country: string | null | undefined, year: number | null): {n: number; key: string} {
  if (year === null) return {n: units, key: 'era.money.coins'}
  const d = decadeOf(year), m = country ? CURRENCY[country]?.(year) : undefined
  if (!m) return {n: units * (NEUTRAL[d] ?? 1), key: 'era.money.coins'}
  return {n: units * (m.factor[d] ?? NEUTRAL[d] ?? 1), key: m.unit}
}

/** how the match reaches him at home, that decade: the radio alone in the 80s, the television later, a text in the 2000s */
export type Live = 'radio' | 'tv' | 'text' | 'phone'
export const liveOf = (year: number): Live => year >= 2010 ? 'phone' : year >= 2000 ? 'text' : year >= 1990 ? 'tv' : 'radio'

/**
 * The era's texture lines, each tied to the thing it shows (`ERA_ITEMS` holds the years): the inner voice says one on a
 * long walk. A line is said only in a year its thing exists (`texture`), so no mobile rings before 2000.
 */
export const TEXTURE: readonly {key: string; item: string}[] = [
  {key: 'era.t.radio', item: 'transistor-radio'},
  {key: 'era.t.radio-window', item: 'transistor-radio'},
  {key: 'era.t.phone-box', item: 'phone-box'},
  {key: 'era.t.payphone', item: 'payphone'},
  {key: 'era.t.cassette', item: 'cassette'},
  {key: 'era.t.walkman', item: 'walkman'},
  {key: 'era.t.aerial', item: 'tv-aerial'},
  {key: 'era.t.teletext', item: 'teletext'},
  {key: 'era.t.window', item: 'ticket-window'},
  {key: 'era.t.paper', item: 'morning-paper'},
  {key: 'era.t.dish', item: 'satellite-dish'},
  {key: 'era.t.pager', item: 'pager'},
  {key: 'era.t.text', item: 'text-message'},
  {key: 'era.t.mobile', item: 'mobile'},
  {key: 'era.t.smartphone', item: 'smartphone'},
  {key: 'era.t.video', item: 'video-tape'},
]
export const texture = (year: number): string[] => TEXTURE.filter(t => inEra(t.item, year)).map(t => t.key)
/** the line for "the match is on" in his year: the radio's crackle, the set in the corner, the phone in his pocket */
export const liveKey = (year: number | null): string => `era.live.${year === null ? 'radio' : liveOf(year)}`
