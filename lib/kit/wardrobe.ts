import { lifeStore } from '@/lib/life/save'

/**
 * הארון — what gate 5 can say about the person's closet (ONE RED WORLD §14). Client-safe:
 * counts over the catalogue the page already holds, and the LIFE save read through its own
 * reader (`lib/life/save.ts`, which imports types only) — the LIFE runtime never enters here.
 */

/** "שנות ה־90" — the decade as the terrace says it: the two digits before 2000, the year after. */
export function decadeWord(decade: number): string {
  return decade < 2000 ? String(decade % 100).padStart(2, '0') : String(decade)
}

/**
 * The ONE objective the landing names (§14): the decade closest to closing — the fewest shirts
 * still missing, at least one — among the shirts gate 4 can actually deal (`playable`). A tie
 * goes to the later decade. Null when every playable shirt is home, or nothing is playable.
 * Counted from the catalogue and the device's collection, never typed.
 */
export function closestDecade(
  catalog: ReadonlyArray<{ key: string; decade: number; playable: boolean }>,
  built: Readonly<Record<string, unknown>>,
): { decade: number; left: number } | null {
  const left = new Map<number, number>()
  for (const kit of catalog) {
    if (!kit.playable) continue
    if (!left.has(kit.decade)) left.set(kit.decade, 0)
    if (!built[kit.key]) left.set(kit.decade, (left.get(kit.decade) ?? 0) + 1)
  }
  let best: { decade: number; left: number } | null = null
  for (const [decade, n] of left) {
    if (n === 0) continue
    if (!best || n < best.left || (n === best.left && decade > best.decade)) best = { decade, left: n }
  }
  return best
}

/**
 * A LIFE archive shirt id (`kit199900H`, `lib/life/generated/kitShirts.ts`) → the catalogue key
 * it IS (`1999/00|home`). The generator writes the id from the season and the variant, so this is
 * a parse, not a lookup; `tests/one-red-world-gates-a.test.ts` holds it to every generated row.
 * A photographed LIFE shirt (`visa86`) is not an archive season and answers null.
 */
const VARIANT = { H: 'home', A: 'away', T: 'third' } as const
export function kitKeyOfLifeShirt(id: string): string | null {
  const match = /^kit(\d{4})(\d{2})([HAT])$/.exec(id)
  if (!match) return null
  return `${match[1]}/${match[2]}|${VARIANT[match[3] as keyof typeof VARIANT]}`
}

/**
 * The catalogue keys this life OWNS — an `own:shirt:<id>` flag it raised, or a `clothing.gained`
 * item — read off the event log. Only what the save shows: nothing is inferred from a chapter.
 */
export function lifeKitKeys(events: ReadonlyArray<{ t: string; flag?: string; item?: string }>): Set<string> {
  const out = new Set<string>()
  for (const event of events) {
    const id =
      event.t === 'flag.raised' && typeof event.flag === 'string' && event.flag.startsWith('own:shirt:')
        ? event.flag.slice('own:shirt:'.length)
        : event.t === 'clothing.gained' && typeof event.item === 'string'
          ? event.item
          : null
    const key = id ? kitKeyOfLifeShirt(id) : null
    if (key) out.add(key)
  }
  return out
}

/** The device's LIFE save, as the set of catalogue keys it owns. Empty when there is no life. */
export async function readLifeKitKeys(): Promise<Set<string>> {
  try {
    const file = await lifeStore.read()
    return file ? lifeKitKeys(file.events as unknown as ReadonlyArray<{ t: string; flag?: string; item?: string }>) : new Set()
  } catch {
    return new Set()
  }
}
