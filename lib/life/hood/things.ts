/**
 * LIFE · the hood — the club's own THINGS in the game (owner, 28.11.2026: "use the kit SVGs, our cards, the graphics
 * library and the archive wisely for LIFE").
 *
 * Pure. The page hands the game what the club already owns (`lib/clubs/life/things.ts` reads it on the server): its crest,
 * its home shirts by season (the studio-cut kit SVGs of the kit archive) and THE ALBUM's stickers with the years each
 * man played. The game only chooses among them by the YEAR the life has reached, so the shirt a boy saves up for is the
 * one the club wore that season, and a sticker found in the street is a man who was in the squad then. Nothing here is
 * invented: a club with no kit on file shows no shirt, a year with no sticker gives the nearest man in time.
 */
export type KitThing = {year: number; season: string; src: string}
export type CardThing = {id: string; code: string; name: string; from: number; to: number; /** the pressed sticker, when one exists */ src: string | null; /** the shirt of his years */ kit: string | null}
export type HoodThings = {crest: string | null; kits: KitThing[]; cards: CardThing[]}

export const NO_THINGS: HoodThings = {crest: null, kits: [], cards: []}

/** the year the life has reached, when the club's life has a birth year */
export const yearOf = (born: number | null | undefined, age: number): number | null => (typeof born === 'number' ? born + age : null)

/** the home shirt of that year: the latest season that had begun by then, else the earliest on file; with no year, the newest */
export function kitOfYear(things: HoodThings | null | undefined, year: number | null): KitThing | null {
  const ks = things?.kits ?? []
  if (!ks.length) return null
  if (year === null) return ks[ks.length - 1]!
  let best: KitThing | null = null
  for (const k of ks) if (k.year <= year && (!best || k.year > best.year)) best = k
  return best ?? ks[0]!
}

/** how far a year is from a man's years at the club (0 while he played there) */
const gap = (c: CardThing, year: number) => (year < c.from ? c.from - year : year > c.to ? year - c.to : 0)

/**
 * The sticker a boy finds in the street this year: a man of the squad of that year he does not have yet, else the nearest
 * in time. The same life finds the same men in the same order (no dice: a sticker is a memory, not a loot box).
 * Null when every sticker is found, or the club has none.
 */
export function cardFound(things: HoodThings | null | undefined, year: number | null, have: readonly string[]): CardThing | null {
  const left = (things?.cards ?? []).filter(c => !have.includes(c.id))
  if (!left.length) return null
  if (year === null) return left[0]!
  return [...left].sort((a, b) => gap(a, year) - gap(b, year) || a.from - b.from || a.id.localeCompare(b.id))[0]!
}

export const cardsHeld = (things: HoodThings | null | undefined, have: readonly string[]): CardThing[] => {
  const by = new Map((things?.cards ?? []).map(c => [c.id, c]))
  return have.flatMap(id => { const c = by.get(id); return c ? [c] : [] })
}
