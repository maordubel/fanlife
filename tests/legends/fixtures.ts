import {hash,rng} from '@/lib/clubs/rumble-rng'
import {buildCatalog,eligible,type PoolRow} from '@/lib/legends/catalog'
import type {Catalog} from '@/lib/legends/types'

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
