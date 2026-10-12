import 'server-only'
import {kitViews} from '@/lib/clubs/gate-content'
import {loadClub} from '@/lib/clubs/resolver'
import {rumbleWardrobe} from '@/lib/clubs/rumble-kit'
import {livery} from '@/lib/club-livery'
import {legendsReel,type ClubKit} from './reel'
import type {Career} from './types'
import type {CareerView} from './view'

/**
 * The shirts LEGENDS MANAGER dresses its highlights in: each club's own documented kits (the Royal Rumble's wardrobe — home and
 * away lists by season), read once per club data version. ALL FOOTBALL is a hub surface, so every club wears its own colours,
 * yellow included (rule 95); no club page's rival ban applies here.
 */
const g=globalThis as typeof globalThis&{legendsKits?:Map<string,{key:string;kit:ClubKit}>}
const cache=g.legendsKits??=new Map()
export async function clubKit(club:string):Promise<ClubKit|undefined>{
 const r=await loadClub(club).catch(()=>null);if(!r)return undefined
 const hit=cache.get(club);if(hit&&hit.key===r.data.version)return hit.kit
 const kit={wardrobe:rumbleWardrobe(kitViews(r.data),()=>false),primary:livery(club)?.primary??'#1C2F93'}
 cache.set(club,{key:r.data.version,kit});return kit
}
/** the view, with the reel of the manager's last result attached — the theatre plays it */
export async function withHighlights(v:CareerView,c:Career):Promise<CareerView>{
 if(!v.last)return v
 const f=[...c.season.fixtures,...(c.season.playoff?[c.season.playoff]:[])].find(x=>x.id===v.last!.id);if(!f?.result?.sides)return v
 const [h,a]=await Promise.all([clubKit(f.home),clubKit(f.away)])
 const champion=v.phase==='season-end'&&!!v.seasonEnd?.champion
 const reel=legendsReel(c,f,{[f.home]:h,[f.away]:a},{champion})
 return reel?{...v,last:{...v.last,reel}}:v
}
