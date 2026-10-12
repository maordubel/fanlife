import {hash} from '@/lib/clubs/rumble-rng'
import type {LegendsSettings} from './config'
import type {Fixture} from './types'

/**
 * The league (rulebook §1.6.33–34, §2.9). Pure.
 *  · every pair meets twice, once at each ground (circle method). An odd number of clubs plays with a BYE — no club is invented —
 *    so N clubs play 2·(N−1) rounds when N is even and 2·N when it is odd, each club sitting out two
 *  · points from the settings (3/1/0 by default)
 *  · ties: points → goal difference → goals for → head-to-head (a mini-table of the tied clubs) → drawn lots fixed at kick-off
 *  · an ABSOLUTE tie for the title (everything but the lots level) is settled in a play-off
 */
export function fixturesFor(clubs:readonly string[]):Omit<Fixture,'result'>[]{
 if(clubs.length<2)throw new Error('Two clubs at least.')
 const teams:(string|null)[]=[...clubs];if(teams.length%2)teams.push(null)
 const n=teams.length,rot=teams.slice(1),first:Omit<Fixture,'result'>[][]=[]
 for(let r=0;r<n-1;r++){
  const line=[teams[0]!,...rot],round:Omit<Fixture,'result'>[]=[]
  for(let i=0;i<n/2;i++){const a=line[i],b=line[n-1-i];if(!a||!b)continue;const flip=(r+i)%2===1;round.push({id:'',round:r+1,home:flip?b:a,away:flip?a:b})}
  first.push(round);rot.unshift(rot.pop()!)
 }
 const all=[...first.flat(),...first.flat().map(f=>({...f,round:f.round+n-1,home:f.away,away:f.home}))]
 return all.map(f=>({...f,id:`r${f.round}-${f.home}-${f.away}`}))
}
export const roundsFor=(n:number)=>n%2?2*n:2*(n-1)
export type Row={club:string;name:string;p:number;w:number;d:number;l:number;gf:number;ga:number;gd:number;pts:number;form:('W'|'D'|'L')[];lot:number;h2hUsed:boolean}
function base(teams:readonly {club:string;name:string}[],fx:readonly Fixture[],pts:LegendsSettings['points'],lotSalt:string){
 const rows=new Map(teams.map(t=>[t.club,{club:t.club,name:t.name,p:0,w:0,d:0,l:0,gf:0,ga:0,gd:0,pts:0,form:[] as Row['form'],lot:hash(`${lotSalt}:${t.club}`),h2hUsed:false}]))
 for(const f of [...fx].sort((a,b)=>a.round-b.round)){if(!f.result)continue
  const [h,a]=f.result.goals,H=rows.get(f.home),A=rows.get(f.away);if(!H||!A)continue
  H.p++;A.p++;H.gf+=h;H.ga+=a;A.gf+=a;A.ga+=h
  if(h>a){H.w++;A.l++;H.pts+=pts.win;A.pts+=pts.loss;H.form.push('W');A.form.push('L')}
  else if(h<a){A.w++;H.l++;A.pts+=pts.win;H.pts+=pts.loss;A.form.push('W');H.form.push('L')}
  else{H.d++;A.d++;H.pts+=pts.draw;A.pts+=pts.draw;H.form.push('D');A.form.push('D')}
 }
 for(const r of rows.values())r.gd=r.gf-r.ga
 return rows
}
export function standings(teams:readonly {club:string;name:string}[],fx:readonly Fixture[],pts:LegendsSettings['points'],lotSalt:string):Row[]{
 const rows=[...base(teams,fx,pts,lotSalt).values()]
 const key=(r:Row)=>`${r.pts}|${r.gd}|${r.gf}`
 const groups=new Map<string,Row[]>();for(const r of rows)groups.set(key(r),[...(groups.get(key(r))??[]),r])
 const h2h=new Map<string,{pts:number;gd:number;gf:number}>()
 for(const g of groups.values()){if(g.length<2)continue
  const ids=new Set(g.map(r=>r.club)),mini=base(g,fx.filter(f=>ids.has(f.home)&&ids.has(f.away)),pts,lotSalt)
  for(const r of g){const m=mini.get(r.club)!;h2h.set(r.club,{pts:m.pts,gd:m.gd,gf:m.gf});r.h2hUsed=true}
 }
 const hv=(r:Row)=>h2h.get(r.club)??{pts:0,gd:0,gf:0}
 return rows.sort((x,y)=>y.pts-x.pts||y.gd-x.gd||y.gf-x.gf||hv(y).pts-hv(x).pts||hv(y).gd-hv(x).gd||hv(y).gf-hv(x).gf||x.lot-y.lot)
}
/** the clubs level on EVERYTHING but the lots at the top — two or more means a title play-off */
export function titleTie(rows:readonly Row[],fx:readonly Fixture[],pts:LegendsSettings['points'],lotSalt:string):string[]{
 if(rows.length<2)return []
 const t=rows[0]!,same=rows.filter(r=>r.pts===t.pts&&r.gd===t.gd&&r.gf===t.gf)
 if(same.length<2)return []
 const ids=new Set(same.map(r=>r.club)),mini=base(same,fx.filter(f=>ids.has(f.home)&&ids.has(f.away)),pts,lotSalt),m0=mini.get(t.club)!
 const level=same.filter(r=>{const m=mini.get(r.club)!;return m.pts===m0.pts&&m.gd===m0.gd&&m.gf===m0.gf})
 // the play-off is one match: the two the lots put first among the level clubs
 return level.length>=2?level.sort((a,b)=>a.lot-b.lot).slice(0,2).map(r=>r.club):[]
}
