'use server'

import { resolvePlayer } from '@/lib/archive/player-master'

/**
 * A slip saved before 21.9.2026 holds display NAMES; the ballot stores Player Master ids
 * now. This answers each name with the id of the one pickable person it names — through
 * the master's own resolution (every spelling and alias a source attached to him, exact,
 * never fuzzy: rule 7) — or null. The screen keeps a null pick as it was and says so; it
 * never drops a vote somebody cast.
 *
 * At most eight strings, because a slip has eight rows; anything longer is not a slip.
 */
export async function resolveLegacyPicks(names: string[]): Promise<Record<string, string | null>> {
  const out: Record<string, string | null> = {}
  for (const name of names.slice(0, 8)) {
    if (typeof name !== 'string' || name.length > 80) continue
    const person = resolvePlayer(name)
    out[name] = person && person.kind === 'player' ? person.id : null
  }
  return out
}
