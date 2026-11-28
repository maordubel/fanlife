/**
 * LIFE · the hood — THE STREET KNOWS (owner, 28.11.2026: "fill the game with what we hold in the archive; reach a mission
 * through life, through stories, through meeting people, never by jumping mechanically from one to the next").
 *
 * Pure. Before anybody offers him anything, a person of the street talks about the club the way a street does: about a
 * man who wears the shirt THIS year, about the shirt in the kiosk window, about an old player from before his time,
 * about a night he was at himself. Every name, season, date and score here is the club's own record:
 *   - a player is named only in a year he was at the club (THE ALBUM's edition, `from`–`to`);
 *   - a shirt is the home shirt of that season (the kit archive);
 *   - a night is one he has LIVED in this life, printed as the archive records it (rule life-story-watch).
 * What is said ABOUT them is the street's own voice (a kid being his hero in a kickabout, a father's "watch him off the
 * ball"): opinion and play, never an invented fact. No record, no line: he gets the plain talk he had.
 * The same person does not say the same thing twice running: the topic turns with every talk.
 */
import type {CardThing, HoodThings} from './things'
import {kitOfYear} from './things'

export type StreetWho = 'dad' | 'mate' | 'kiosk' | 'neighbour'
export type LivedNight = {date: string | null; result: string | null}
export type StreetLine = {key: string; vars: Record<string, string>}

const active = (cards: readonly CardThing[], year: number) => cards.filter(c => c.from <= year && year <= c.to)
const before = (cards: readonly CardThing[], year: number) => cards.filter(c => c.to < year - 4)
const at = <T,>(list: readonly T[], turn: number): T | null => (list.length ? list[((turn % list.length) + list.length) % list.length]! : null)

/** what this person opens with now, or null when the record has nothing for him to say */
export function streetLine(o: {who: StreetWho; things: HoodThings | null | undefined; year: number | null; /** stickers found */ have: readonly string[]; /** the dated nights he has lived, oldest first */ lived: readonly LivedNight[]; /** how many times he has talked to this person */ turn: number}): StreetLine | null {
  const {who, things, year, turn} = o
  if (!things || year === null) return null
  const now = active(things.cards, year), old = before(things.cards, year), kit = kitOfYear(things, year)
  const kitNow = kit && kit.year <= year && year - kit.year <= 2 ? kit : null
  const night = at(o.lived.filter(n => n.date && n.result), turn)
  const topics: (StreetLine | null)[] = []
  const man = at(now, turn + (who === 'mate' ? 1 : who === 'dad' ? 2 : 0))
  if (who === 'kiosk') {
    if (man) topics.push(o.have.includes(man.id) ? {key: 'hood.street.kiosk.have', vars: {player: man.name}} : {key: 'hood.street.kiosk.sticker', vars: {player: man.name}})
    if (kitNow) topics.push({key: 'hood.street.kiosk.shirt', vars: {season: kitNow.season}})
  } else if (who === 'mate') {
    if (man) topics.push({key: 'hood.street.mate.be', vars: {player: man.name}})
    const two = at(now, turn + 2)
    if (man && two && two.id !== man.id) topics.push({key: 'hood.street.mate.swap', vars: {player: two.name, other: man.name}})
  } else if (who === 'dad') {
    if (night) topics.push({key: 'hood.street.dad.night', vars: {date: night.date!, result: night.result!}})
    if (man) topics.push({key: 'hood.street.dad.watch', vars: {player: man.name}})
  } else {
    const elder = at(old, turn)
    if (elder) topics.push({key: 'hood.street.neighbour.old', vars: {player: elder.name, from: String(elder.from)}})
    if (night) topics.push({key: 'hood.street.neighbour.night', vars: {date: night.date!}})
    if (man) topics.push({key: 'hood.street.neighbour.new', vars: {player: man.name}})
  }
  return at(topics.filter((t): t is StreetLine => !!t), turn)
}

export const STREET_KEYS = ['hood.street.kiosk.have', 'hood.street.kiosk.sticker', 'hood.street.kiosk.shirt', 'hood.street.mate.be', 'hood.street.mate.swap', 'hood.street.dad.night', 'hood.street.dad.watch', 'hood.street.neighbour.old', 'hood.street.neighbour.night', 'hood.street.neighbour.new'] as const
