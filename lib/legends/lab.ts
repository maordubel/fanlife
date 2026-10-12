import {hash} from '@/lib/clubs/rumble-rng'
import {DEFAULT_SETTINGS,roundTenths,type LegendsSettings} from './config'
import {applyAction,createCareer,isBye,type Action,type Intent} from './career'
import {botDraft} from './draft'
import {run} from './engine'
import {bestLineup} from './squad'
import type {Card,Career,Catalog,MatchSnapshot,SideSnapshot} from './types'

/**
 * The Legends Lab (rulebook §8): read-only measurements, nothing stored.
 *  · drafts — many generated draft paths per club through the real solver: a dead end is a failure
 *  · matches — many seeded matches between drafted sides: goals, draws, home wins, cards, injuries (target ≈ 5% a team-match,
 *    70/25/5 by severity)
 *  · seasons — whole careers on autopilot, several seasons each: titles, cash, the board's grants
 */
export type DraftLab={club:string;runs:number;deadEnds:number;avgSpent:number;examples:string[]}
export function draftLab(cat:Catalog,runs=200):DraftLab{
 let dead=0,spent=0;const ex:string[]=[]
 for(let i=0;i<runs;i++){const r=botDraft(cat.cards,hash(`${cat.club}:lab:${i}`),(['random','value','premium','budget'] as const)[i%4]);if(r.error){dead++;if(ex.length<3)ex.push(r.error)}else spent+=r.draft.spent}
 return {club:cat.club,runs,deadEnds:dead,avgSpent:runs-dead?roundTenths(spent/(runs-dead)):0,examples:ex}
}
const side=(club:string,name:string,cards:Card[],home:boolean|null):SideSnapshot|null=>{
 const lu=bestLineup(cards);if(!lu)return null
 const by=new Map(cards.map(c=>[c.id,c])),m=(id:string)=>{const x=by.get(id)!;return {id:x.id,name:x.name,pos:x.pos,stars:x.stars,attrs:x.attrs}}
 return {club,name,formation:lu.formation,tactics:lu.tactics,xi:lu.xi.map(m),bench:lu.bench.map(m),morale:1,home}
}
export type MatchLab={matches:number;goalsPerMatch:number;draws:number;homeWins:number;awayWins:number;yellowsPerMatch:number;redsPerMatch:number;injuryRate:number;severity:{minor:number;moderate:number;severe:number};strongerWins:number}
export function matchLab(cats:readonly Catalog[],matches=2000):MatchLab{
 const squads=cats.flatMap(c=>[0,1,2].map(k=>{const r=botDraft(c.cards,hash(`${c.club}:mlab:${k}`),'random');if(r.error)return null;const by=new Map(c.cards.map(x=>[x.id,x]));return {club:c.club,name:c.clubName,cards:r.draft.picks.map(p=>by.get(p.id)!)}})).filter((x):x is NonNullable<typeof x>=>!!x)
 const out={matches:0,goals:0,draws:0,home:0,away:0,y:0,r:0,inj:0,sev:{minor:0,moderate:0,severe:0},stronger:0,decided:0}
 if(squads.length<2)return {matches:0,goalsPerMatch:0,draws:0,homeWins:0,awayWins:0,yellowsPerMatch:0,redsPerMatch:0,injuryRate:0,severity:{minor:0,moderate:0,severe:0},strongerWins:0}
 for(let i=0;i<matches;i++){
  const a=squads[hash(`a:${i}`)%squads.length]!,b=squads[hash(`b:${i}`)%squads.length]!;if(a===b)continue
  const h=side(a.club,a.name,a.cards,true),w=side(b.club,b.name,b.cards,false);if(!h||!w)continue
  const snap:MatchSnapshot={id:`lab-${i}`,seed:hash(`match:${i}`),engine:'legends-engine-1',rules:'legends-1.0.0',sides:[h,w],knockout:false}
  const r=run(snap,[],false);if(!r.done)continue
  const o=r.outcome,[g0,g1]=o.goals;out.matches++;out.goals+=g0+g1;if(g0===g1)out.draws++;else if(g0>g1)out.home++;else out.away++
  for(const s of [0,1] as const){out.y+=Object.values(o.yellows[s]).reduce((x,y)=>x+y,0);out.r+=Object.keys(o.reds[s]).length;const inj=Object.values(o.injuries[s]);if(inj.length)out.inj++;for(const v of inj)out.sev[v.kind]++}
  const sa=h.xi.reduce((x,m)=>x+m.stars,0),sb=w.xi.reduce((x,m)=>x+m.stars,0)
  if(g0!==g1&&Math.abs(sa-sb)>=3){out.decided++;if((g0>g1)===(sa>sb))out.stronger++}
 }
 const n=Math.max(1,out.matches),sv=Math.max(1,out.sev.minor+out.sev.moderate+out.sev.severe)
 return {matches:out.matches,goalsPerMatch:roundTenths(out.goals/n*10)/10,draws:roundTenths(out.draws/n*1000)/10,homeWins:roundTenths(out.home/n*1000)/10,awayWins:roundTenths(out.away/n*1000)/10,yellowsPerMatch:roundTenths(out.y/n),redsPerMatch:roundTenths(out.r/n*100)/100,injuryRate:roundTenths(out.inj/(2*n)*1000)/10,
  severity:{minor:Math.round(out.sev.minor/sv*100),moderate:Math.round(out.sev.moderate/sv*100),severe:Math.round(out.sev.severe/sv*100)},strongerWins:out.decided?Math.round(out.stronger/out.decided*100):0}
}
/** one career on autopilot: the bot drafts, the windows close, every match plays on the quick sim */
export function autopilot(own:Catalog,rivals:readonly Catalog[],seasons:number,seed:string,settings:LegendsSettings=DEFAULT_SETTINGS):{career:Career|null;error:string|null}{
 const made=createCareer({id:`lab-${seed}`,owner:'lab',now:'2026-01-01T00:00:00Z',own,rivals:[...rivals],settings});if(!made.ok)return {career:null,error:made.error}
 let c=made.career,n=0
 const catalogs=new Map(rivals.map(r=>[r.club,r.cards]))
 const go=(a:Intent)=>{const r=applyAction(c,{...a,key:`lab${seed}k${n++}`,rev:c.revision} as Action,{now:'2026-01-01T00:00:00Z',catalogs});if(!r.ok)throw new Error(`${a.kind}: ${r.error}`);c=r.career}
 try{
  const d=botDraft(own.cards,hash(`${c.id}:draft`),'value');if(d.error)return {career:c,error:d.error}
  for(const p of d.draft.picks){go({kind:'draft',move:{kind:'pick',id:p.id}})}
  go({kind:'draft-confirm'});go({kind:'ack'})
  for(let s=0;s<seasons;s++){
   for(let guard=0;guard<200;guard++){
    if(c.phase==='window'){go({kind:'auto'});go({kind:'close-window'});continue}
    if(c.phase==='season'){if(isBye(c))go({kind:'play-round'});else{go({kind:'auto'});go({kind:'match-start',mode:'fast'})}continue}
    if(c.phase==='playoff'){go({kind:'match-start',mode:'fast'});continue}
    if(c.phase==='season-end')break
   }
   if(s<seasons-1)go({kind:'next-season'})
  }
 }catch(e){return {career:c,error:(e as Error).message}}
 return {career:c,error:null}
}
export type SeasonLab={careers:number;seasons:number;titles:Record<string,number>;myTitles:number;avgPlace:number;cashBySeason:number[];grants:number[];failures:string[]}
export function seasonLab(cats:readonly Catalog[],careers=12,seasons=4):SeasonLab{
 const out:SeasonLab={careers:0,seasons:0,titles:{},myTitles:0,avgPlace:0,cashBySeason:new Array(seasons).fill(0),grants:new Array(seasons).fill(0),failures:[]}
 let places=0
 for(let k=0;k<careers&&cats.length;k++){
  const own=cats[k%cats.length]!,r=autopilot(own,cats.filter(c=>c.club!==own.club),seasons,`s${k}`)
  if(r.error||!r.career){if(out.failures.length<8)out.failures.push(`${own.club}: ${r.error}`);continue}
  out.careers++
  for(const h of r.career.history){out.seasons++;places+=h.place;if(h.champion)out.myTitles++;out.cashBySeason[h.ordinal-1]!+=h.cash;out.grants[h.ordinal-1]!+=h.grant}
  for(const h of r.career.history){const champ=h.champion?own.club:'other';out.titles[champ]=(out.titles[champ]??0)+1}
 }
 out.avgPlace=out.seasons?roundTenths(places/out.seasons):0
 out.cashBySeason=out.cashBySeason.map(v=>roundTenths(v/Math.max(1,out.careers)));out.grants=out.grants.map(v=>roundTenths(v/Math.max(1,out.careers)))
 return out
}
