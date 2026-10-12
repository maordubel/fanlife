import {hash} from '@/lib/clubs/rumble-rng'
import {applyAction,createCareer} from './career'
import {readinessOf} from './readiness'
import {table} from './league'
import type {Catalog} from './types'

/**
 * The Season Lab (appendix B §10): whole seasons from fixed seeds, every side on its best eleven, to see whether the league is a
 * contest — goals a match, draws, goalless draws, the home edge, and how the titles spread. Read-only; nothing is stored.
 */
export type LabReport={seasons:number;matches:number;goalsPerMatch:number;draws:number;nilNil:number;homeWins:number;awayWins:number;titles:Record<string,number>;clubs:{club:string;name:string;avgPoints:number;avgPlace:number}[];failures:string[]}
export function seasonLab(catalogs:readonly Catalog[],seasons=100,seed0=1):LabReport{
 const ready=catalogs.filter(c=>readinessOf(c).verdict!=='BLOCK')
 const out:LabReport={seasons:0,matches:0,goalsPerMatch:0,draws:0,nilNil:0,homeWins:0,awayWins:0,titles:{},clubs:[],failures:[]}
 const pts=new Map<string,number[]>(),place=new Map<string,number[]>()
 let goals=0
 for(let s=0;s<seasons;s++){
  const seed=seed0+s,own=ready[s%ready.length]
  if(!own){out.failures.push('No club is ready.');break}
  const pick=(c:Catalog)=>{const d=readinessOf(c).homeDecades;return d[hash(`${seed}:${c.club}`)%d.length]!}
  const made=createCareer({id:`lab-${seed}`,owner:'lab',now:'2026-01-01T00:00:00Z',own,homeDecade:pick(own),rivals:ready.filter(c=>c.club!==own.club).map(c=>({catalog:c,decade:pick(c)}))})
  if(!made.ok){if(out.failures.length<10)out.failures.push(`season ${seed}: ${made.error}`);continue}
  let c=made.career
  for(let r=0;r<c.rounds;r++){const n=applyAction(c,{kind:'play',key:`lab${seed}r${r}xx`,rev:c.revision},'2026-01-01T00:00:00Z');if(!n.ok){out.failures.push(`season ${seed}: ${n.error}`);break}c=n.career}
  out.seasons++
  for(const f of c.fixtures){if(!f.result)continue;const [h,a]=f.result.goals;out.matches++;goals+=h+a;if(h===a)out.draws++;if(!h&&!a)out.nilNil++;if(h>a)out.homeWins++;if(a>h)out.awayWins++}
  const rows=table(c.teams.map(t=>({club:t.club,name:t.name})),c.fixtures)
  rows.forEach((r,i)=>{pts.set(r.club,[...(pts.get(r.club)??[]),r.pts]);place.set(r.club,[...(place.get(r.club)??[]),i+1])})
  out.titles[rows[0]!.club]=(out.titles[rows[0]!.club]??0)+1
 }
 const avg=(xs:number[])=>xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:0
 out.goalsPerMatch=out.matches?goals/out.matches:0
 out.clubs=ready.map(c=>({club:c.club,name:c.clubName,avgPoints:avg(pts.get(c.club)??[]),avgPlace:avg(place.get(c.club)??[])})).sort((a,b)=>a.avgPlace-b.avgPlace)
 return out
}
