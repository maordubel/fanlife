import {slotsOf} from '@/lib/clubs/rumble-xi/formations'
import {isFormation} from '@/lib/clubs/rumble-xi/formations'
import {QUOTA_POS,type QuotaPos} from './config'
import type {Card,Career,Fixture,StatRow,Team} from './types'

/**
 * Season numbers, counted from the stored match logs (owner, 13.10.2026: golden boot, assists, cards, clean sheets,
 * appearances — for the manager's club and the whole league, every season kept). Pure, and it never reads a rating: every
 * figure is a count of events the engine already wrote. Appearances are the starting eleven plus every man brought on; a clean
 * sheet goes to the man who started in goal when his side conceded nothing (extra time counts, a shoot-out does not).
 */
export type Board={key:BoardKey;label:string;unit:string;rows:{id:string;name:string;club:string;pos:QuotaPos;value:number;mine:boolean}[]}
export type BoardKey='goals'|'assists'|'yellows'|'reds'|'cleanSheets'|'apps'
export const BOARDS:readonly {key:BoardKey;label:string;unit:string;unitOne:string}[]=[
 {key:'goals',label:'Golden boot',unit:'goals',unitOne:'goal'},{key:'assists',label:'Top assists',unit:'assists',unitOne:'assist'},
 {key:'cleanSheets',label:'Clean sheets',unit:'clean sheets',unitOne:'clean sheet'},{key:'apps',label:'Appearances',unit:'apps',unitOne:'app'},
 {key:'yellows',label:'Yellow cards',unit:'yellows',unitOne:'yellow'},{key:'reds',label:'Red cards',unit:'reds',unitOne:'red'},
]

function cardIn(c:Career,t:Team,id:string):Card|undefined{
 return (t.ai?t.cards[id]:c.catalog.cards.find(x=>x.id===id))??t.emergency.find(e=>e.id===id)?.card
}
/** every man's numbers for the season's played fixtures (league and play-off), keyed by club and id */
export function seasonRows(c:Career):StatRow[]{
 const teams=new Map(c.teams.map(t=>[t.club,t])),rows=new Map<string,StatRow>()
 const fixtures:Fixture[]=[...c.season.fixtures,...(c.season.playoff?[c.season.playoff]:[])].filter(f=>f.result)
 const row=(club:string,id:string|undefined,fallback?:{name:string;pos:QuotaPos}):StatRow|null=>{
  if(!id)return null
  const k=`${club}|${id}`,hit=rows.get(k);if(hit)return hit
  const t=teams.get(club),card=t?cardIn(c,t,id):undefined,name=card?.name??fallback?.name,pos=card?.pos??fallback?.pos
  if(!name||!pos)return null
  const r:StatRow={id,name,club,pos,apps:0,goals:0,assists:0,yellows:0,reds:0,cleanSheets:0};rows.set(k,r);return r
 }
 for(const f of fixtures){
  const res=f.result!,clubs=[f.home,f.away] as const
  res.sides?.forEach((side,s)=>{
   const club=clubs[s]!,fam=isFormation(side.formation)?slotsOf(side.formation).map(x=>x.family):[]
   side.xi.forEach(m=>{const r=row(club,m.id,{name:m.name,pos:m.pos});if(r)r.apps++})
   // the keeper: the man in the formation's goal slot, else the first recorded keeper of the eleven
   const gi=fam.indexOf('GK'),gk=(gi>=0?side.xi[gi]:undefined)??side.xi.find(m=>m.pos==='GK')
   if(gk&&res.goals[s===0?1:0]===0){const r=row(club,gk.id,{name:gk.name,pos:gk.pos});if(r)r.cleanSheets++}
  })
  for(const e of res.events){
   if(e.side===null)continue
   const club=clubs[e.side]!
   if(e.kind==='goal'){const r=row(club,e.player);if(r)r.goals++;const a=row(club,e.other);if(a)a.assists++}
   else if(e.kind==='yellow'){const r=row(club,e.player);if(r)r.yellows++}
   else if(e.kind==='red'){const r=row(club,e.player);if(r)r.reds++}
   else if(e.kind==='sub'&&res.sides){const r=row(club,e.player);if(r)r.apps++}
  }
 }
 return [...rows.values()].sort((a,b)=>a.club.localeCompare(b.club)||QUOTA_POS.indexOf(a.pos)-QUOTA_POS.indexOf(b.pos)||a.name.localeCompare(b.name)||a.id.localeCompare(b.id))
}

/** the leader boards of one season: the top `n` of each count (ties by name, so a board never reshuffles), zeros left out */
export function boards(rows:readonly StatRow[],mine:string,opts:{club?:string;n?:number}={}):Board[]{
 const pool=opts.club?rows.filter(r=>r.club===opts.club):rows,n=opts.n??5
 return BOARDS.map(b=>({key:b.key,label:b.label,unit:b.unit,
  rows:pool.filter(r=>r[b.key]>0).sort((x,y)=>y[b.key]-x[b.key]||x.name.localeCompare(y.name)||x.id.localeCompare(y.id)).slice(0,n)
   .map(r=>({id:r.id,name:r.name,club:r.club,pos:r.pos,value:r[b.key],mine:r.club===mine}))}))
}
