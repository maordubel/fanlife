import 'server-only'
import {createHash} from 'node:crypto'
import type {ClubData,ClubTrivia,Readiness} from './contract'
import type {MemoryCandidate} from '@/lib/game/memory-engine'
import type {MasterQuestion} from '@/lib/game/questions/types'
import {FORMATIONS} from '@/lib/game/formations'
import {fitOf} from '@/lib/xi/roles'
import {GATE_THRESHOLDS as T} from './thresholds'
import {localizedDate} from './locale'
import {englishTitle} from './title-en'
const by=(k:keyof typeof T,count:number)=>gateReadiness(count,T[k].target,T[k].minimum,T[k].unit)
const key=(s:string)=>createHash('sha256').update(s).digest('hex').slice(0,16)
/** Already eligible dated facts only. No extra historical assertions or invented options. */
/** the false twin of a dated event: another recorded day of the SAME year, else the same day shifted by one to six weeks — never the true day */
function nearDate(on:string,salt:string,days:readonly string[]):string{
 const y=on.slice(0,4),same=days.filter(d=>d!==on&&d.startsWith(y)).sort((a,b)=>key(salt+a).localeCompare(key(salt+b)))
 if(same[0])return same[0]
 const shift=(7+parseInt(key(salt).slice(0,4),16)%36)*(parseInt(key(salt).slice(4,5),16)%2?1:-1),d=new Date(`${on}T00:00:00Z`);d.setUTCDate(d.getUTCDate()+shift)
 return d.toISOString().slice(0,10)
}
export function eventGames(events:ClubData['timeline'],sources:ClubData['sources']):{trivia:ClubTrivia;memory:MemoryCandidate[]} {
 const days=[...new Set(events.map(e=>e.value.on))]
 const questions:MasterQuestion[]=events.map((f,i)=>{
  const truth=i%2===0||events.length===1||/\b(found(?:ed|ing)|establish\w*|formed)\b/i.test(f.value.title),date=truth?f.value.on:nearDate(f.value.on,f.id,days)
  const source=sources.find(s=>s.id===f.sources[0])
  return {id:`q_${key(f.id+':date-check')}`,key:f.id+':date-check',template:'event-date-check',type:'tf',topic:'history',tags:['history'],sport:'football',decades:[Math.floor(Number(f.value.on.slice(0,4))/10)*10],difficulty:2,prompt:`${englishTitle(f.value.title)} — ${localizedDate(date,'en')}. Is that the day in the record?`,answer:truth?'true':'false',explanation:`${englishTitle(f.value.title)} — ${localizedDate(f.value.on,'en')}.`,hint:{kind:'context'},factIds:[f.id],source:{title:source?.title||'Source ledger',url:source?.url||null,confidence:f.confidence}}
 })
 return {trivia:{questions,pools:{}},memory:events.map(f=>({pair:f.id,type:'moment-date',a:englishTitle(f.value.title),b:f.value.on,kind:'Event / date',object:'clipping',answer:'season',year:Number(f.value.on.slice(0,4))}))}
}
export function gateReadiness(count:number,target:number,minimum:number,requirement:string):Readiness {
 return {state:count>=target?'READY':count>=minimum?'PARTIAL':'LOCKED',playable:count>=minimum,eligible:count,target,reasons:count>=target?[]:[`${Math.max(0,target-count)} more ${requirement} needed for full readiness.`]}
}
export function sharedReadiness(data:Pick<ClubData,'players'|'trivia'|'memory'|'timeline'>&{archiveCount?:number}) {
 const faces=new Set<string>();let pairs=0
 for(const c of data.memory)if(!faces.has(c.a)&&!faces.has(c.b)){faces.add(c.a);faces.add(c.b);pairs++}
 const players=(data.players||[]).map(f=>f.value),xi=by('xi',players.length)
 // Match distinct documented people to slots. Unknown positions remain usable in
 // free play, but cannot silently certify full position coverage.
 const coverage=Object.values(FORMATIONS).some(formation=>{
  const assigned=new Map<number,number>()
  function assign(slot:number,seen:Set<number>):boolean {
   for(let i=0;i<players.length;i++)if(!seen.has(i)&&fitOf(players[i]!.positions,formation.slots[slot]!.role)==='fit'){
    seen.add(i);const previous=assigned.get(i)
    if(previous===undefined||assign(previous,seen)){assigned.set(i,slot);return true}
   }
   return false
  }
  return formation.slots.every((_,i)=>assign(i,new Set()))
 })
 if(!coverage){if(xi.state==='READY')xi.state='PARTIAL';xi.reasons.push('Documented positions cannot yet fill a complete supported formation. Unknown positions are labelled in free play.')}
 return {trivia:by('trivia',data.trivia.questions.length),xi,archive:by('archive',data.archiveCount??data.timeline.length),memory:by('memory',pairs)}
}
