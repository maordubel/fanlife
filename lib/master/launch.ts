import 'server-only'
import {SHARED_GATES} from '@/lib/clubs/gates'
import {GATE_METHOD} from '@/lib/club-research/plan'
import {loadClub,hasStaticPack} from '@/lib/clubs/resolver'
import {readDeskPack,usable} from './deskPack'
import {isPending} from './researchMerge'
import type {ClubSummary} from './summary'
import type {Club} from './types'

/**
 * The LAUNCH read model (8.10.2026): one screen that answers, in order, what the owner asked —
 * what did research bring back, what can I approve, what does that open, what is still missing, and the button.
 * Built from the same summary the rest of the desk reads; nothing here decides on the owner's behalf.
 */
export type LaunchPerson={id:string;name:string;sourceTitle:string;sourceUrl:string|null;years:string|null}
export type LaunchGate={number:number;name:string;state:string;eligible:number;target:number;playable:boolean;openNow:boolean;missing:string|null;how:string}
export type LaunchView={
 clubId:string;name:string;version:number;status:Club['status']
 research:{lastRun:{state:string;at:string;requests:number}|null;documents:number;needsParser:number;sources:number;report:string[]}
 players:{pending:LaunchPerson[];approved:number;rejected:number;inPack:number}
 sourcesToReview:{id:string;title:string;url:string}[]
 pack:{kind:'repository'|'desk'|'none';builtAt:string|null;players:number;stale:boolean}
 gates:LaunchGate[];canOpen:number[]
 life:{available:boolean;text:string}
 steps:{research:'done'|'todo';approve:'done'|'todo'|'none';build:'done'|'todo'|'none';open:'done'|'todo'|'none'}
}
export async function launchView(c:Club,s:ClubSummary):Promise<LaunchView>{
 const src=(id:string)=>c.sources.find(x=>x.id===id)
 const players=c.findings.filter(f=>f.record?.kind==='player')
 const pending=players.filter(isPending).map(f=>{const s0=src(f.sources[0]!),r=f.record!;return {id:f.id!,name:r.name,sourceTitle:s0?.title||f.sources[0]!,sourceUrl:r.sourceUrl||s0?.url||null,years:r.fromYear?`${r.fromYear}${r.toYear&&r.toYear!==r.fromYear?`–${r.toYear}`:''}`:null}})
 const cited=new Set(players.filter(isPending).flatMap(f=>f.sources))
 const sourcesToReview=c.sources.filter(x=>cited.has(x.id)&&(!x.reviewed||x.incoming)).map(x=>({id:x.id,title:x.title,url:x.url}))
 const desk=hasStaticPack(c.id)?null:await readDeskPack(c.id).catch(()=>null)
 const ready=c.findings.filter(f=>usable(c,f)).map(f=>f.id!)
 const pack:LaunchView['pack']=hasStaticPack(c.id)?{kind:'repository',builtAt:null,players:0,stale:false}:desk?{kind:'desk',builtAt:desk.builtAt,players:desk.players.length,stale:ready.some(id=>!desk.findingIds.includes(id))||desk.findingIds.some(id=>!ready.includes(id))}:{kind:'none',builtAt:null,players:0,stale:ready.length>0}
 const gates:LaunchGate[]=SHARED_GATES.map(g=>{const d=s.data?.gates.find(x=>x.number===g.number);return {number:g.number,name:g.name,state:d?.state||'LOCKED',eligible:d?.eligible||0,target:d?.target||0,playable:!!d?.dataPlayable,openNow:c.status==='live'&&c.gates.includes(g.number)&&!!d?.dataPlayable,missing:d?(d.full?null:d.reason):g.requirement,how:GATE_METHOD[g.key].what}})
 const canOpen=gates.filter(g=>g.playable&&!g.openNow).map(g=>g.number)
 const loaded=await loadClub(c.id).catch(()=>null),lifeOn=loaded?.data.life.state==='legacy'
 const report=c.gaps.filter(g=>g.startsWith('REPORT')).map(g=>g.replace(/^REPORT · /,''))
 return {clubId:c.id,name:c.name,version:c.version,status:c.status,
  research:{lastRun:s.archive.lastRun,documents:s.archive.documents,needsParser:s.archive.needsParser,sources:s.archive.sources,report},
  players:{pending,approved:players.filter(f=>f.decision==='approved').length,rejected:players.filter(f=>f.decision==='rejected').length,inPack:pack.players},
  sourcesToReview,pack,gates,canOpen,
  life:lifeOn?{available:true,text:'LIFE is written for this club and opens with the club.'}:{available:false,text:'LIFE for this club is a story that has to be written (chapters, places, people). Data alone cannot open it, so it stays closed — the club’s games open without it.'},
  steps:{research:s.archive.documents>0||players.length>0?'done':'todo',approve:players.length?(pending.length?'todo':'done'):'none',build:pack.kind==='repository'?'done':ready.length?(pack.stale?'todo':'done'):'none',open:canOpen.length?'todo':gates.some(g=>g.openNow)?'done':'none'}}
}
