import 'server-only'
import {kitViews} from '@/lib/clubs/gate-content'
import {loadClub} from '@/lib/clubs/resolver'
import {rumbleWardrobe} from '@/lib/clubs/rumble-kit'
import {livery} from '@/lib/club-livery'
import {documentedCloth,type ClothSpec} from '@/lib/clubs/kit-model'
import {crestFor} from '@/lib/clubs/crest'
import {legendsReel,liveReel,type ClubKit} from './reel'
import {pixelKit} from '@/lib/highlights/kit'
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
 const views=kitViews(r.data),cloth:Record<string,ClothSpec>={}
 // the garment renderer's spec of each documented kit it can draw faithfully: colours, cut, maker and sponsor; the crest when we hold one
 for(const k of views){const c=documentedCloth(k,()=>false);if(c)cloth[k.id]={...c,crest:!!crestFor(club)}}
 const kit={wardrobe:rumbleWardrobe(views,()=>false),primary:livery(club)?.primary??'#1C2F93',cloth}
 cache.set(club,{key:r.data.version,kit});return kit
}
/** the view, with the reel of the manager's last result attached — the theatre plays it */
export async function withHighlights(v:CareerView,c:Career):Promise<CareerView>{
 const kits=Object.fromEntries(await Promise.all(c.teams.map(async t=>[t.club,await clubKit(t.club)] as const)))
 // a chip per club: the shirt of its most recent documented home kit, or its livery
 const colours=Object.fromEntries(c.teams.map(t=>{const k=kits[t.club],last=k?.wardrobe.home.at(-1),px=last?pixelKit(last):null
  return [t.club,px?{shirt:px.shirt,second:px.second,pattern:px.pattern}:{shirt:k?.primary??'#1C2F93',second:null,pattern:'plain'}]}))
 let out:CareerView={...v,colours}
 if(v.live){const reel=liveReel(c,kits);if(reel)out={...out,live:{...v.live,reel}}}
 if(!v.last)return out
 const f=[...c.season.fixtures,...(c.season.playoff?[c.season.playoff]:[])].find(x=>x.id===v.last!.id);if(!f?.result?.sides)return out
 const champion=v.phase==='season-end'&&!!v.seasonEnd?.champion
 const reel=legendsReel(c,f,kits,{champion})
 return reel?{...out,last:{...v.last,reel}}:out
}
