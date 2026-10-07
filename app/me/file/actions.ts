'use server'

import { CORE_CLUB_IDS, loadClub } from '@/lib/clubs/resolver'

/**
 * Names for the player ids a device saved in its XIs. The device sends ids only; names come from
 * the club pack, so a renamed or removed player is shown as the pack has it (or dropped).
 */
export async function xiNames(club: string, ids: string[]): Promise<Record<string, string>> {
  if (!CORE_CLUB_IDS.includes(club) || !Array.isArray(ids)) return {}
  const want = new Set(ids.filter((id) => typeof id === 'string' && id.length < 120).slice(0, 11))
  const pack = await loadClub(club)
  const out: Record<string, string> = {}
  for (const row of pack?.data.players ?? []) if (want.has(row.value.id)) out[row.value.id] = row.value.name
  return out
}
