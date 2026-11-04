import 'server-only'
import {REGISTRY} from '@/lib/master/registry'
import {livery} from '@/lib/club-livery'
import {clubTheme,rivalBans} from '@/lib/clubs/theme'
import type {Palette} from './jobs'
import {compiledClubIds} from '@/lib/clubs/precompiled'

const byName=(a:{name:string},b:{name:string})=>a.name.localeCompare(b.name)
/** Every club the studio can validate a brief for, with the colours the film may print (its own) and may not (its rival's). */
export const clubNames=()=>new Map(REGISTRY.map(c=>[c.id,c.name]))
/** The clubs the studio OFFERS: those with a compiled pack (the worker researches from it) — a research-only club would
 *  queue a film that fails at its first stage. Without a manifest (development) every club is offered. */
export async function storyClubs():Promise<{id:string;name:string}[]>{
 const ids=await compiledClubIds()
 return REGISTRY.filter(c=>!ids||ids.includes(c.id)).map(c=>({id:c.id,name:c.name})).sort(byName)
}
export function paletteFor(id:string):Palette{
 const club=REGISTRY.find(c=>c.id===id),l=livery(id)
 if(!club||!l)throw new Error('Unknown club')
 return {club_id:id,club_name:club.name,primary:l.primary,on_primary:l.on,bans:rivalBans(clubTheme(club))}
}
