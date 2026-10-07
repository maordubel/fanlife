import 'server-only'

import { CORE_CLUB_IDS, loadClub } from '@/lib/clubs/resolver'
import { clubLife } from '@/lib/clubs/life/pack'
import { livery } from '@/lib/club-livery'
import { REGISTRY } from '@/lib/master/registry'

export type MeClub = { id: string; name: string; city: string; primary: string; pattern: string; initials: string; core: boolean; lifeChapters: number }

/** Every club a supporter can choose, with what the card and the standing need to draw it. */
export async function meClubs(): Promise<MeClub[]> {
  const rows = await Promise.all(REGISTRY.map(async (c) => {
    const l = livery(c.id)
    let lifeChapters = 0
    if (CORE_CLUB_IDS.includes(c.id)) {
      try { const pack = await loadClub(c.id); if (pack) lifeChapters = clubLife(pack.data).chapters.length } catch { /* no LIFE pack: zero chapters */ }
    }
    return { id: c.id, name: c.name, city: c.city, primary: l?.primary ?? c.primary, pattern: l?.pattern ?? 'solid', initials: c.initials, core: CORE_CLUB_IDS.includes(c.id), lifeChapters }
  }))
  return rows.sort((a, b) => a.name.localeCompare(b.name))
}
