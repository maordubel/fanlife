import 'server-only'
import {kitViews} from '@/lib/clubs/gate-content'
import {documentedCloth,variantOf,type ClothSpec} from '@/lib/clubs/kit-model'
import {loadClub} from '@/lib/clubs/resolver'
import {seasonYear} from '@/lib/clubs/rumble-kit'

/**
 * The shirts a career's own men wear on their cards and on the team sheet: the club's documented HOME kits, each drawn as the
 * FAN LIFE garment (`KitCloth`) with its maker and sponsor lettered as the archive records them — and nothing the archive does
 * not say (no crest, no collar is invented). A kit the garment cannot draw faithfully is left out. ALL FOOTBALL is a hub
 * surface: every club wears its own colours (rule 95), so nothing is dropped for a rival's palette.
 */
export type CareerShirt={year:number;season:string;cloth:ClothSpec}
const g=globalThis as typeof globalThis&{legendsShirts?:Map<string,{key:string;shirts:CareerShirt[]}>}
const cache=g.legendsShirts??=new Map()
export async function careerShirts(club:string):Promise<CareerShirt[]>{
 const r=await loadClub(club).catch(()=>null);if(!r)return []
 const hit=cache.get(club);if(hit&&hit.key===r.data.version)return hit.shirts
 const shirts=kitViews(r.data).filter(k=>variantOf(k.type)==='home').flatMap(k=>{const year=seasonYear(k.season),cloth=documentedCloth(k,()=>false);return year!==null&&cloth?[{year,season:k.season,cloth}]:[]})
  .sort((a,b)=>a.year-b.year||a.season.localeCompare(b.season))
 cache.set(club,{key:r.data.version,shirts});return shirts
}
