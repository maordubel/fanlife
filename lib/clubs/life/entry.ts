import 'server-only'
import {CORE_CLUB_IDS, loadClub} from '@/lib/clubs/resolver'
import {clubLife} from './pack'

/**
 * Where a visitor enters one club's LIFE — the single answer the home page, the club cards and the
 * club hub all read, so no surface can link to a life that does not exist.
 *  - `native`    Hapoel Tel Aviv's own LIFE (`/life`).
 *  - `universal` the shared engine composed with the club's pack (`/clubs/<id>/life`).
 *  - `workshop`  no playable life yet: surfaces say so instead of linking.
 */
export type LifeEntry = {state: 'native' | 'universal' | 'workshop'; href: string | null}

const WORKSHOP: LifeEntry = {state: 'workshop', href: null}

export async function lifeEntry(clubId: string, opts: {evaluation: boolean; paused?: boolean; locale?: string}): Promise<LifeEntry> {
  if (opts.paused) return WORKSHOP
  if (clubId === 'hapoel-tel-aviv') return {state: 'native', href: '/life'}
  if (!opts.evaluation || !CORE_CLUB_IDS.includes(clubId)) return WORKSHOP
  const club = await loadClub(clubId)
  if (!club || !clubLife(club.data).readiness.playable) return WORKSHOP
  return {state: 'universal', href: `/clubs/${clubId}/life${opts.locale ? `?lang=${opts.locale}` : ''}`}
}

export async function lifeEntries(clubs: readonly {id: string; status: string}[], evaluation: boolean): Promise<Record<string, LifeEntry>> {
  const rows = await Promise.all(clubs.map(async c => [c.id, await lifeEntry(c.id, {evaluation, paused: c.status === 'paused'})] as const))
  return Object.fromEntries(rows)
}
