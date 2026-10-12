import 'server-only'
import {randomBytes} from 'node:crypto'
import {engineClubIds,loadClub} from '@/lib/clubs/resolver'
import {goalsByPlayer,ratedPool} from '@/lib/clubs/rumble'
import {hasPrice,PRICE_VERSION} from '@/lib/clubs/rumble-xi/prices'
import {overrideOf} from '@/lib/players/effective'
import {serverFeatures} from '@/lib/features-server'
import {buildCatalog,eligible,type Eligibility} from './catalog'
import {me,catalogMap,createCareer} from './career'
import {readiness,type ClubReadiness} from './readiness'
import {insertCareer,readLegendsSettings,readRatingControl} from './store'
import {cardView,type CardView} from './view'
import type {Career,Catalog} from './types'
import type {RatingControl} from './ratings'

/**
 * The server side of LEGENDS MANAGER: each club's catalog (the same rated pool the Royal Rumble deals from, approved and PRICED
 * men only, with the owner's star controls applied), its readiness, and new careers. Cached per club data version + control.
 */
type Cached={key:string;catalog:Catalog;elig:Eligibility}
const g=globalThis as typeof globalThis&{legendsCatalogs?:Map<string,Cached>}
const cache=g.legendsCatalogs??=new Map()
const controlKey=(c:RatingControl,club:string)=>JSON.stringify([c.clubs[club]??null,Object.entries(c.players).filter(([k])=>k.startsWith(`${club}:`))])
export async function catalogFor(club:string,control?:RatingControl):Promise<{catalog:Catalog;elig:Eligibility}|null>{
 const r=await loadClub(club).catch(()=>null);if(!r)return null
 const ctl=control??await readRatingControl(),key=`${r.data.version}|${PRICE_VERSION}|${controlKey(ctl,club)}`
 const hit=cache.get(club);if(hit&&hit.key===key)return hit
 const approved=new Set((r.data.players||[]).filter(f=>f.status==='approved').map(f=>f.value.id))
 // a price the owner set in the Player Control Center counts as a price the list knows
 const priced=(id:string)=>hasPrice(club,id)||typeof overrideOf(club,id)?.price==='number'
 const elig=eligible(club,ratedPool(r.data),approved,priced,goalsByPlayer(r.data),ctl)
 const out={key,catalog:buildCatalog(club,r.data.identity.name,elig.cards,PRICE_VERSION),elig}
 cache.set(club,out);return out
}
export async function allCatalogs(control?:RatingControl):Promise<{catalog:Catalog;elig:Eligibility}[]>{
 const ctl=control??await readRatingControl()
 return (await Promise.all((await engineClubIds()).map(id=>catalogFor(id,ctl)))).filter((x):x is NonNullable<typeof x>=>!!x)
}
export type ClubChoice=ClubReadiness&{held:boolean}
const ready=new Map<string,{key:string;r:ClubReadiness}>()
export async function legendsClubs():Promise<ClubChoice[]>{
 const [cats,f]=await Promise.all([allCatalogs(),serverFeatures()])
 return cats.map(({catalog,elig})=>{const k=catalog.digest;let r=ready.get(catalog.club);if(!r||r.key!==k){r={key:k,r:readiness(catalog.club,catalog.clubName,elig)};ready.set(catalog.club,r)}return {...r.r,held:f.fanLeagueOff.includes(catalog.club)}}).sort((a,b)=>a.name.localeCompare(b.name))
}
/** one club's verdict, for the banner on its home — its own catalog only (not the whole roll), sharing the readiness cache */
export async function legendsReadyFor(club:string):Promise<ClubChoice|null>{
 const [hit,f]=await Promise.all([catalogFor(club),serverFeatures()]);if(!hit)return null
 const k=hit.catalog.digest;let r=ready.get(club);if(!r||r.key!==k){r={key:k,r:readiness(club,hit.catalog.clubName,hit.elig)};ready.set(club,r)}
 return {...r.r,held:f.fanLeagueOff.includes(club)}
}
export async function startCareer(owner:string,club:string):Promise<{ok:true;id:string}|{ok:false;error:string}>{
 const [clubs,settings]=await Promise.all([legendsClubs(),readLegendsSettings()]),pick=clubs.find(c=>c.club===club)
 if(!pick||pick.held||pick.verdict!=='READY')return {ok:false,error:'That club is not open for a new career.'}
 const cats=await allCatalogs(),own=cats.find(c=>c.catalog.club===club)!.catalog,id=randomBytes(8).toString('hex')
 const rivals=cats.filter(c=>c.catalog.club!==club&&clubs.some(x=>x.club===c.catalog.club&&x.verdict==='READY'&&!x.held)).map(c=>c.catalog)
 const made=createCareer({id,owner,now:new Date().toISOString(),own,rivals,settings})
 if(!made.ok)return made
 const ins=await insertCareer(made.career);if(!ins.ok)return ins
 return {ok:true,id}
}
/** the AI clubs' current catalogs, for a window closing or an emergency */
export async function ctxFor(c:Career):Promise<{now:string;catalogs:Map<string,Catalog['cards']>}>{
 const cats=await allCatalogs(),need=new Set(c.teams.filter(t=>t.ai).map(t=>t.club))
 return {now:new Date().toISOString(),catalogs:new Map(cats.filter(x=>need.has(x.catalog.club)).map(x=>[x.catalog.club,x.catalog.cards]))}
}
/** the market (§1.3.13): men of THIS club only, not in the squad — by position, decade, price and name */
export function marketPage(c:Career,f:{pos?:string|null;decade?:number|null;price?:number|null;q?:string|null},limit=60):{cards:CardView[];total:number}{
 const own=new Set(me(c).squad.map(s=>s.id)),needle=f.q?.trim().toLowerCase()||null
 const all=c.catalog.cards.filter(x=>!own.has(x.id)&&!c.soldThisWindow.includes(x.id)&&(!f.pos||x.pos===f.pos)&&(!f.decade||x.decades.includes(f.decade))&&(!f.price||x.price===f.price)&&(!needle||x.name.toLowerCase().includes(needle)))
  .sort((a,b)=>b.stars-a.stars||a.price-b.price||a.name.localeCompare(b.name))
 return {cards:all.slice(0,limit).map(cardView),total:all.length}
}
export const decadesOf=(c:Career)=>[...new Set(c.catalog.cards.flatMap(x=>x.decades))].sort((a,b)=>a-b)
export {catalogMap}
