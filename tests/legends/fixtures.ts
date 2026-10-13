import {hash,rng} from '@/lib/clubs/rumble-rng'
import {buildCatalog,eligible,type PoolRow} from '@/lib/legends/catalog'
import type {Catalog,MatchSnapshot} from '@/lib/legends/types'
import type {EngineVersion} from '@/lib/legends/config'
import {botDraft} from '@/lib/legends/draft'
import {bestLineup} from '@/lib/legends/squad'

/** invented clubs and invented men — never real people (house rule for fixtures) */
export function poolOf(club:string,n:number,opts:{gk?:number;priceless?:number}={}):PoolRow[]{
 const r=rng(hash(club)),rows:PoolRow[]=[]
 const gk=opts.gk??Math.max(4,Math.round(n*0.1))
 for(let i=0;i<n;i++){
  const pos=i<gk?'GK':(['DF','MF','FW'] as const)[i%3]!
  const rating=60+Math.floor(r()*35),q=r()
  const price=q<0.05?5:q<0.17?4:q<0.4?3:q<0.7?2:1
  const from=1950+Math.floor(r()*70)
  rows.push({id:`${club}-p${i}`,name:`${club.toUpperCase()} Player ${i}`,position:pos,price,rating,fromYear:from,toYear:from+1+Math.floor(r()*8)})
 }
 return rows
}
export function catalogOf(club:string,n=220,opts:{gk?:number;priceless?:number}={}):Catalog{
 const pool=poolOf(club,n,opts),approved=new Set(pool.map(p=>p.id)),noPrice=new Set(pool.slice(0,opts.priceless??0).map(p=>p.id))
 const e=eligible(club,pool,approved,id=>!noPrice.has(id),new Map(pool.map((p,i)=>[p.id,i%7])))
 return buildCatalog(club,`${club.toUpperCase()} FC`,e.cards,'test-prices')
}
export const LEAGUE=['alpha','bravo','charlie','delta','echo'].map((c,i)=>catalogOf(c,160+i*60))
/** seeded match snapshots between bot-drafted invented sides — the engine golden tests (an old engine must play as it did) */
export function snapshotsOf(engine:EngineVersion,n:number):MatchSnapshot[]{
 const sides=LEAGUE.map(c=>{const r=botDraft(c.cards,hash(`${c.club}:golden`),'value'),by=new Map(c.cards.map(x=>[x.id,x])),lu=bestLineup(r.draft.picks.map(p=>by.get(p.id)!))!
  const m=(id:string)=>{const x=by.get(id)!;return {id:x.id,name:x.name,pos:x.pos,stars:x.stars,attrs:x.attrs}}
  return {club:c.club,name:c.clubName,formation:lu.formation,tactics:lu.tactics,xi:lu.xi.map(m),bench:lu.bench.map(m),morale:1,captain:lu.xi[3]}})
 return Array.from({length:n},(_,i)=>{const a=sides[i%sides.length]!,b=sides[(i+1+(i>>2)%4)%sides.length]!,ko=i%9===0
  return {id:`g${i}`,seed:hash(`golden:${i}`),engine,rules:'legends-1.0.0' as const,knockout:ko,...(ko?{decider:'extra-time-penalties' as const}:{}),sides:[{...a,home:ko?null:true},{...b,home:ko?null:false}] as MatchSnapshot['sides']}})
}
