import {slotsOf} from '@/lib/clubs/rumble-xi/formations'
import {available,YELLOWS_PER_BAN} from './discipline'
import {captainOf,fieldable,lineupError} from './squad'
import type {Card,Career,Team} from './types'

/**
 * The assistant manager (U01): up to three plain notes before a match, each from a state that can be pointed at in the career —
 * nothing invented to fill a space, nothing about a match not yet watched. Ordered: what stops a match, then what puts it at
 * risk, then what is merely useful. Fit uses the engine's own rule (`fitFactor`: a man plays below himself off his recorded
 * line), so "out of his line" is never a historical claim about the man. Pure; reads no hidden rating.
 */
export type AdviceNote={id:string;severity:'blocker'|'risk'|'info';text:string;/** where the button goes */to:'squad'|'market'|'league';cta:string;men:string[]}
const SEV={blocker:0,risk:1,info:2} as const
const LINE={GK:'goalkeeper',DF:'defender',MF:'midfielder',FW:'forward'} as const
export function adviceFor(c:Career,card:(t:Team,id:string)=>Card|undefined,win:{open:boolean;/** the round it opens after */after:number|null}):AdviceNote[]{
 if(c.phase==='draft'||c.phase==='season-end'||c.phase==='playoff')return []
 const t=c.teams[0]!,out:AdviceNote[]=[],name=(id:string)=>card(t,id)?.name??'a squad man'
 const men=fieldable(t,id=>card(t,id)),lu=t.lineup
 const err=lineupError(lu,men)
 if(err)out.push({id:'lineup-error',severity:'blocker',text:`Your team sheet cannot play yet: ${err}`,to:'squad',cta:'Open team sheet',men:[]})
 const down=lu.xi.filter(id=>!available(t.status[id]))
 if(down.length&&!err)out.push({id:'xi-unavailable',severity:'blocker',text:`${down.map(name).join(' and ')} cannot play${down.length>1?'':' today'} but ${down.length>1?'are':'is'} in the eleven.`,to:'squad',cta:'Fix the eleven',men:down})
 // the armband
 if(lu.captain&&!lu.xi.includes(lu.captain)){
  const wearer=captainOf(lu,id=>card(t,id)),viceIn=lu.vice&&lu.xi.includes(lu.vice)
  out.push(viceIn?{id:'captain-out',severity:'info',text:`${name(lu.captain)} is not in the eleven. ${name(lu.vice!)}, the vice-captain, will wear the armband.`,to:'squad',cta:'Open team sheet',men:[lu.captain,lu.vice!]}
   :{id:'captain-out-no-vice',severity:'risk',text:`${name(lu.captain)} is not in the eleven and no vice-captain is in it either — ${wearer?name(wearer):'the most experienced man'} will wear the armband.`,to:'squad',cta:'Name a vice-captain',men:[lu.captain]})
 }
 // out of his line, by the engine's own definition
 if(!err){
  const slots=slotsOf(lu.formation),by=new Map<string,string[]>()
  lu.xi.forEach((id,i)=>{const k=card(t,id),s=slots[i];if(k&&s&&k.pos!==s.family){by.set(s.family,[...(by.get(s.family)??[]),id])}})
  const gk=by.get('GK')??[],first=[...by.entries()].find(([f])=>f!=='GK')
  if(gk.length||lu.xi.some((id,i)=>card(t,id)?.pos==='GK'&&slots[i]?.family!=='GK'))out.push({id:'keeper-out',severity:'risk',text:'A goalkeeper is not between the posts, or an outfield man is.',to:'squad',cta:'Review the keeper',men:gk})
  else if(first){const [fam,ids]=first;out.push({id:`out-of-line-${fam}`,severity:'risk',text:`${ids.length===1?'One':ids.length} ${LINE[fam as keyof typeof LINE]}${ids.length>1?'s are':' is'} out of ${ids.length>1?'their':'his'} line.`,to:'squad',cta:`Review ${LINE[fam as keyof typeof LINE]}s`,men:ids})}
  const benchGK=lu.bench.some(id=>card(t,id)?.pos==='GK'),spareGK=men.some(k=>k.pos==='GK'&&!lu.xi.includes(k.id)&&!lu.bench.includes(k.id))
  if(!benchGK&&spareGK)out.push({id:'bench-gk',severity:'risk',text:'No goalkeeper on the bench, though a fit one is in the squad.',to:'squad',cta:'Open team sheet',men:[]})
 }
 // useful
 const near=t.squad.filter(s=>{const st=t.status[s.id];return st&&available(st)&&st.yellows%YELLOWS_PER_BAN===YELLOWS_PER_BAN-1&&t.lineup.xi.includes(s.id)}).map(s=>s.id)
 if(near.length)out.push({id:'yellow-edge',severity:'info',text:`${near.slice(0,2).map(name).join(' and ')} ${near.length>1?'are':'is'} one booking from a ban.`,to:'squad',cta:'Open team sheet',men:near})
 if(win.open)out.push({id:'window-open',severity:'info',text:'The transfer window is open now.',to:'market',cta:'View market plan',men:[]})
 else if(win.after!==null)out.push({id:'window-soon',severity:'info',text:`The next window opens after round ${win.after}.`,to:'market',cta:'View market plan',men:[]})
 const seen=new Set<string>()
 return out.filter(n=>!seen.has(n.id)&&seen.add(n.id)).sort((a,b)=>SEV[a.severity]-SEV[b.severity]).slice(0,3)
}
