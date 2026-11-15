'use server'

import { CORE_CLUB_IDS, loadClub } from '@/lib/clubs/resolver'
import {clubWardrobe} from '@/lib/clubs/kit-wardrobe'
import {kitFor} from '@/lib/clubs/rumble-kit'

/**
 * Names for the player ids a device saved in its XIs. The device sends ids only; names come from
 * the club pack, so a renamed or removed player is shown as the pack has it (or dropped).
 */
export async function xiPlayers(club: string, ids: string[]): Promise<Record<string, {name:string;shirt?:string;keeperShirt?:string}>> {
  if (!CORE_CLUB_IDS.includes(club) || !Array.isArray(ids)) return {}
  const want = new Set(ids.filter((id) => typeof id === 'string' && id.length < 120).slice(0, 11))
  const pack = await loadClub(club)
  if(!pack)return {}
  const wardrobe=clubWardrobe(pack.data)
  const out: Awaited<ReturnType<typeof xiPlayers>> = {}
  for (const {value:player} of pack.data.players) {
    if(!want.has(player.id))continue
    const field=kitFor(player,'us',wardrobe),keeper=kitFor(player,'us',wardrobe,{keeper:true})
    out[player.id]={name:player.name,shirt:field.source==='archive'?field.kit.svg:undefined,keeperShirt:keeper.source==='archive'?keeper.kit.svg:undefined}
  }
  return out
}
