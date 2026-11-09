import 'server-only'
import {CORE_CLUB_IDS, loadClub} from '@/lib/clubs/resolver'
import {clubLife} from './pack'
import {readLifePlayable} from '@/lib/clubs/precompiled'
import {compatOf} from '@/lib/life/universal/compat'
import {door} from '@/lib/features-server'

/**
 * Where a visitor enters one club's LIFE — the single answer the home page, the club cards and the
 * club hub all read, so no surface can link to a life that does not exist. Every club is answered by
 * the same rule: no club has a door of its own.
 *  - `universal` the shared engine composed with the club's pack (`/clubs/<id>/life`).
 *  - `workshop`  no playable life yet: surfaces say so instead of linking.
 *  - `soon`      LIFE is closed to fans (switch `life`, owner 9.11.2026): every door says Coming soon, nobody enters
 *                but the owner's preview.
 */
export type LifeEntry = {state: 'universal' | 'workshop' | 'soon'; href: string | null}

const WORKSHOP: LifeEntry = {state: 'workshop', href: null}
const SOON: LifeEntry = {state: 'soon', href: null}
/** Is LIFE open to this viewer (the switch, or the owner's preview)? */
export async function lifeOpen(): Promise<boolean> {
  return (await door('life').catch(() => ({open: false}))).open
}

export async function lifeEntry(clubId: string, opts: {evaluation: boolean; paused?: boolean; status?: string; locale?: string}): Promise<LifeEntry> {
  if (!(await lifeOpen())) return SOON
  if (opts.paused) return WORKSHOP
  if (!CORE_CLUB_IDS.includes(clubId)) return WORKSHOP
  // Preview opens every club; the real site opens LIFE for a club the owner has published (live).
  if (!opts.evaluation && opts.status !== 'live') return WORKSHOP
  const known = await readLifePlayable(clubId)
  if (known === false) return WORKSHOP
  if (known === null) {
    const club = await loadClub(clubId)
    if (!club || !clubLife(club.data).readiness.playable) return WORKSHOP
  }
  return {state: 'universal', href: `/clubs/${clubId}/life${opts.locale ? `?lang=${opts.locale}` : ''}`}
}

export async function lifeEntries(clubs: readonly {id: string; status: string}[], evaluation: boolean): Promise<Record<string, LifeEntry>> {
  const rows = await Promise.all(clubs.map(async c => [c.id, await lifeEntry(c.id, {evaluation, paused: c.status === 'paused', status: c.status})] as const))
  return Object.fromEntries(rows)
}

/**
 * The club's current chapters and rooms (CF-10), for the "Continue" doors: a save that names a chapter this pack no
 * longer has is not a life to continue. Null when the pack cannot be composed — the door then simply says Enter.
 */
export function lifeCompatFor(data: import('@/lib/clubs/contract').ClubData): import('@/lib/life/universal/compat').LifeCompat | null {
  try { return compatOf(clubLife(data)) } catch { return null }
}
