import 'server-only'
import {createHash} from 'node:crypto'
import kitMaster from '@/content/generated/kit-master.json'
import {allMatches} from '@/lib/archive/match-master'
import {playerById} from '@/lib/archive/player-master'
import {playableLineups} from '@/lib/game/lineup'
import {eligibleGoalRecords} from '@/lib/game/goal'
import {actorKindOf} from '@/lib/game/replay/actors'
import type {Entity,Fact,Source} from '../contract'

/**
 * Hapoel Tel Aviv's wave-C sections (gates 3, 4, 5, 8, 11) read from the SAME masters The Worker plays
 * from — Line-up Master, Kit Master, Match Master, the goal replay archive — so the hub's shared engines
 * open on exactly the material the native gates already use. Nothing here is re-researched or re-approved:
 * every fact keeps its own source and is labelled as a legacy carry-forward.
 */
type Add=(title:string,url:string|null|undefined)=>string
const NOTE='Existing The Worker master carried forward with its own source. No new research or approval is claimed.'
const fact=(id:string,value:Record<string,unknown>,sources:string[]):Fact<Entity>=>({id:`hapoel-tel-aviv:${id}`,value:{...value,id:`hapoel-tel-aviv:${id}`} as Entity,sources,confidence:2,status:'approved',researchedAt:null,approvedAt:null,approvedBy:'legacy-curation',notes:NOTE})
export function sourceAdder(sources:Map<string,Source>):Add{
 return (title,url)=>{const id=createHash('sha256').update(`${title}:${url||''}`).digest('hex').slice(0,16);if(!sources.has(id))sources.set(id,{id,title,url:url||null,publisher:title,access:'unknown',checkedAt:null});return id}
}
const club=(slug:string|null|undefined)=>(slug||'').replace(/-/g,' ')
const nameOf=(id:string)=>playerById(id)?.displayName??null

/** Every dated football match with a scoreline, plus the documented eleven where the Line-up Master holds one. */
export function hapoelMatches(add:Add):Fact<Entity>[]{
 const lineups=new Map(playableLineups().map(r=>[r.matchRef!,r]))
 const archive=add('ויקיפועל · טבלת המשחקים (Games)','https://wiki.red-fans.com/')
 return allMatches().filter(m=>m.sport==='football'&&m.playedOn?.precision==='day'&&m.confidence>=2&&m.score&&Number.isInteger(m.score.home)&&Number.isInteger(m.score.away)).map(m=>{
  const l=lineups.get(m.matchId)
  const starters=l?Object.values(l.xiIds??{}).map(nameOf).filter((n):n is string=>!!n):[]
  const decoys=l?(l.decoys??[]).map(d=>nameOf(d.id)).filter((n):n is string=>!!n):[]
  const refs=l?[add(l.sourceTitle||'ויקיפועל',l.sourceUrl)]:[archive]
  return fact(`match-${m.matchId}`,{name:l?.titleHe||`${club(m.home)} ${m.score!.home}–${m.score!.away} ${club(m.away)}`,on:m.playedOn!.value,competition:club(m.competition),score:`${m.score!.home}–${m.score!.away}`,home:club(m.home),away:club(m.away),homeGoals:m.score!.home,awayGoals:m.score!.away,us:m.hapoelSide??null,...(starters.length===11?{lineup:starters,decoys}:{})},refs)
 })
}

const PATTERN:Record<string,string>={'solid':'Plain','shoulder-panel':'Shoulder panels','hoop-tonal':'Tonal hoops','stripe-wide':'Wide stripes','twin-stripe':'Twin stripes','sash':'Sash','side-panel':'Side panels','chest-band':'Chest band','quarters':'Quarters','pinstripe':'Pinstripes','diagonal':'Diagonal'}
const COLOUR:Record<string,string>={red:'red',deep:'red',cream:'cream',paper:'cream',ink:'black',concrete:'grey'}
type KitRow={id:string;seasonLabel:string;variant:string;fields:Record<string,{value:unknown;confidence?:number}|null>;sourceTitle?:string;sourceUrl?:string|null;confidence?:number}
/** The Kit Master's sourced fields only: season, variant, maker, sponsor, the body pattern and its two colours. */
export function hapoelKits(add:Add):Fact<Entity>[]{
 return (kitMaster as unknown as {kits:KitRow[]}).kits.filter(k=>(k.confidence??2)>=2).map(k=>{
  const f=k.fields,val=(n:string)=>{const x=f[n];return x&&(x.confidence??2)>=2?x.value:null}
  const maker=(val('maker') as {name?:string}|null)?.name??null,sponsor=(val('sponsor') as {name?:string}|null)?.name??null
  const pattern=val('pattern') as string|null,base=val('base') as string|null,second=val('secondary') as string|null
  const colors=[base,second].map(c=>c?COLOUR[c]:null).filter((c):c is string=>!!c)
  return fact(`kit-${k.id}`,{name:`${k.seasonLabel} ${k.variant}`,season:k.seasonLabel,type:k.variant,manufacturer:maker,sponsor,construction:{design:pattern?PATTERN[pattern]??pattern:null,colors:[...new Set(colors)].join('/')}},[add(k.sourceTitle||'Kit Master',k.sourceUrl)])
 })
}

/** Goals the native replay deals: eligible, unheld, truth-clean — each touch as the reporter placed it. */
export function hapoelGoals(add:Add):Fact<Entity>[]{
 return eligibleGoalRecords().map(r=>fact(`goal-${r.goalId}`,{name:r.titleHe,subtitle:r.subtitleHe,on:r.playedOn,competition:r.competitionHe,opponent:r.opponentHe,score:r.scoreHe,narrative:r.narrativeHe,sequence:r.sequence.map(s=>{const kind=actorKindOf(r.goalId,s);return {actor:kind==='unnamed'?null:s.actorHe,side:kind==='player'?'club':kind,action:s.action,zone:s.zone,position:s.positionHe,note:s.noteHe}})},[add(r.sourceTitle,r.sourceUrl)]))
}

/** Rule 13 of The Worker: a derby means Maccabi Tel Aviv, nothing else. The owner's standing ruling is the source. */
export function hapoelRivals(add:Add):Fact<Entity>[]{
 return [fact('rival-maccabi-tel-aviv',{name:'Maccabi Tel Aviv',aliases:['מכבי תל אביב','מכבי-תל-אביב','מכבי ת"א']},[add('ידע אישי — צוות The Worker · כלל 13: דרבי פירושו מכבי תל אביב',null)])]
}
