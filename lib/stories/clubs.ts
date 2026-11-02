import 'server-only'
import {REGISTRY} from '@/lib/master/registry'
import {livery} from '@/lib/club-livery'
import {clubTheme,rivalBans} from '@/lib/clubs/theme'
import type {Palette} from './jobs'

/** Every club the studio can make a film about, with the colours the film may print (its own) and may not (its rival's). */
export function storyClubs():{id:string;name:string}[]{return REGISTRY.map(c=>({id:c.id,name:c.name})).sort((a,b)=>a.name.localeCompare(b.name))}
export const clubNames=()=>new Map(storyClubs().map(c=>[c.id,c.name]))
export function paletteFor(id:string):Palette{
 const club=REGISTRY.find(c=>c.id===id),l=livery(id)
 if(!club||!l)throw new Error('Unknown club')
 return {club_id:id,club_name:club.name,primary:l.primary,on_primary:l.on,bans:rivalBans(clubTheme(club))}
}
