import type {Catalog,CatalogMatch,CatalogOpponent} from './catalog'
import {namesOf,sameClub} from '@/lib/fixtures/names'
import type {Fixture} from '@/lib/fixtures/types'

/**
 * Production ideas from the fixtures that are coming (owner, 10.11.2026: "if there is, say, AEK v PAOK, the system should
 * suggest a smart, unique, interesting film to produce, at the press of a button"). Pure: the next fixture of a club the
 * studio reads, the opponent found in that club's own catalog by exact name (rule 7, never by similarity), and every
 * number on the card counted from the catalog's own rows — nothing invented. The angle is the most distinctive fact the
 * record holds about the pairing; the film is made from the archive, with the coming match named in its topic.
 */
export type UpcomingAngle={key:'drought'|'unbeaten'|'final'|'biggest'|'first'|'record';text:string}
export type UpcomingIdea={
 id:string;club_id:string
 fixture:{kickoff:string;dateOnly:boolean;home:string;away:string;competition:string|null;venue:string|null}
 opponent:string;record:{played:number;won:number;drawn:number;lost:number;first:string;last:string;derby:boolean}
 angle:UpcomingAngle;angles:UpcomingAngle[]
 /** the meeting the studio holds the most about — the night a documentary or an animated Short would tell */
 best:CatalogMatch|null
 /** suggested topic for the preview film; the fixture's day is the provider's, the rest is the catalog's */
 topic:string
 /** when to publish the preview: two days before kick-off, never in the past */
 publishBy:string
}

const DAY=86_400_000
const goals=(m:CatalogMatch)=>{const x=m.score.match(/(\d+)\s*[–-]\s*(\d+)/);return x?{h:+x[1]!,a:+x[2]!}:null}
const margin=(m:CatalogMatch)=>{const g=goals(m);if(!g)return 0;return m.side==='home'?g.h-g.a:g.a-g.h}
const weight=(m:CatalogMatch)=>(m.evidence?.score??0)+(m.tags.includes('final')?30:0)+(m.tags.includes('europe')?12:0)+(m.tags.includes('derby')?8:0)+(m.tags.includes('big-score')?6:0)+(m.tags.includes('penalties')||m.tags.includes('extra-time')?6:0)
const year=(d:string)=>d.slice(0,4)
const longDay=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Athens',day:'numeric',month:'long',year:'numeric'})

/** The catalog's opponent for a provider name: the same club by exact normalised name, Hebrew spellings included. */
export function opponentIn(c:Catalog,name:string):CatalogOpponent|null{
 const names=namesOf(name)
 return c.opponents.find(o=>names.some(n=>sameClub(o.name,n)))??null
}

/** What the record says about the pairing, most distinctive first. Every figure is counted from `rows`. */
export function anglesOf(club:string,o:CatalogOpponent,rows:CatalogMatch[]):UpcomingAngle[]{
 const out:UpcomingAngle[]=[]
 const recent=[...rows].sort((a,b)=>b.date.localeCompare(a.date))
 let noWin=0;for(const m of recent){if(m.outcome==='win')break;noWin++}
 let unbeaten=0;for(const m of recent){if(m.outcome==='loss')break;unbeaten++}
 if(noWin>=4&&noWin<recent.length)out.push({key:'drought',text:`${club} have not beaten ${o.name} in their last ${noWin} meetings — the last win was in ${year(recent[noWin]!.date)}.`})
 else if(noWin>=4)out.push({key:'drought',text:`In ${noWin} recorded meetings, ${club} have never beaten ${o.name}.`})
 if(unbeaten>=5)out.push({key:'unbeaten',text:`${club} are unbeaten in their last ${unbeaten} meetings with ${o.name}.`})
 const finals=rows.filter(m=>m.tags.includes('final'))
 if(finals.length)out.push({key:'final',text:finals.length===1?`They have met in a final: ${finals[0]!.home} ${finals[0]!.score} ${finals[0]!.away}, ${year(finals[0]!.date)}.`:`They have met in ${finals.length} finals, the first in ${year([...finals].sort((a,b)=>a.date.localeCompare(b.date))[0]!.date)}.`})
 const big=[...rows].filter(m=>m.outcome==='win').sort((a,b)=>margin(b)-margin(a)||a.date.localeCompare(b.date))[0]
 if(big&&margin(big)>=3)out.push({key:'biggest',text:`The biggest win over them: ${big.home} ${big.score} ${big.away}, ${year(big.date)}.`})
 if(o.played>=10)out.push({key:'first',text:`${o.played} meetings since ${year(o.first)}: ${o.won} wins, ${o.drawn} draws, ${o.lost} defeats.`})
 else out.push({key:'record',text:`${o.played} meetings in the record: ${o.won} wins, ${o.drawn} draws, ${o.lost} defeats.`})
 return out
}

/** The ideas for the fixtures of the next `days` days, nearest first; a club whose opponent the catalog does not know has none. */
export function upcomingIdeas(fixtures:readonly Fixture[],catalogs:ReadonlyMap<string,Catalog>,clubNames:ReadonlyMap<string,string>,now=new Date(),days=21):UpcomingIdea[]{
 const t=now.getTime(),out:UpcomingIdea[]=[]
 for(const f of fixtures){
  const k=Date.parse(f.kickoff)
  if(f.status!=='scheduled'||!Number.isFinite(k)||k<t||k>t+days*DAY)continue
  const c=catalogs.get(f.clubId),club=clubNames.get(f.clubId)
  if(!c||!club)continue
  const o=opponentIn(c,f.opponent)
  if(!o||o.played<2)continue
  const rows=c.matches.filter(m=>m.opponent===o.name)
  if(rows.length<2)continue
  const angles=anglesOf(club,o,rows)
  const best=[...rows].sort((a,b)=>weight(b)-weight(a)||b.date.localeCompare(a.date))[0]??null
  const day=longDay.format(new Date(k))
  const angle=angles[0]!
  const topic=`Before ${f.home} v ${f.away}, ${day}${f.competition?` (${f.competition})`:''}. ${angle.text}`.slice(0,240)
  const publishBy=new Date(Math.max(t+3*3600_000,k-2*DAY)).toISOString()
  out.push({id:`${f.clubId}:${f.providerEventId}`,club_id:f.clubId,fixture:{kickoff:f.kickoff,dateOnly:f.dateOnly,home:f.home,away:f.away,competition:f.competition,venue:f.venue},
   opponent:o.name,record:{played:o.played,won:o.won,drawn:o.drawn,lost:o.lost,first:o.first,last:o.last,derby:o.derby},angle,angles,best,topic,publishBy})
 }
 return out.sort((a,b)=>a.fixture.kickoff.localeCompare(b.fixture.kickoff))
}
