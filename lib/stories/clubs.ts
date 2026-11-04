import 'server-only'
import {REGISTRY} from '@/lib/master/registry'
import {livery} from '@/lib/club-livery'
import {clubTheme,rivalBans} from '@/lib/clubs/theme'
import type {Palette} from './jobs'
import seasonsFile from '@/content/generated/stories-seasons.json'

const byName=(a:{name:string},b:{name:string})=>a.name.localeCompare(b.name)
/** Every club the studio can validate a brief for, with the colours the film may print (its own) and may not (its rival's). */
export const clubNames=()=>new Map(REGISTRY.map(c=>[c.id,c.name]))
const SEASONS=(seasonsFile as {clubs:Record<string,Record<string,number>>}).clubs
export type StoryClub={id:string;name:string;seasons:{season:string;matches:number}[]}
/** The clubs and seasons the studio OFFERS: only seasons whose matches the research stage can read
 *  (content/generated/stories-seasons.json, written by `python3 -m studio.seasons` with the same reader) — a club or a
 *  season without them would queue a film that fails at its first stage. Newest season first. */
export async function storyClubs():Promise<StoryClub[]>{
 return REGISTRY.filter(c=>SEASONS[c.id]&&Object.keys(SEASONS[c.id]!).length)
  .map(c=>({id:c.id,name:c.name,seasons:Object.entries(SEASONS[c.id]!).map(([season,matches])=>({season,matches})).sort((a,b)=>b.season.localeCompare(a.season))})).sort(byName)
}
export function paletteFor(id:string):Palette{
 const club=REGISTRY.find(c=>c.id===id),l=livery(id)
 if(!club||!l)throw new Error('Unknown club')
 return {club_id:id,club_name:club.name,primary:l.primary,on_primary:l.on,bans:rivalBans(clubTheme(club))}
}
