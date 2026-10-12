import type {Fixture} from './types'

/** a double round-robin (circle method): every pair meets twice, once at each ground; 2·(N−1) rounds, N/2 matches a round */
export function doubleRoundRobin(teams:readonly string[]):Omit<Fixture,'result'>[]{
 if(teams.length<2||teams.length%2)throw new Error('An even number of teams, at least two.')
 const n=teams.length,rot=[...teams.slice(1)],first:Omit<Fixture,'result'>[][]=[]
 for(let r=0;r<n-1;r++){
  const line=[teams[0]!,...rot],round:Omit<Fixture,'result'>[]=[]
  for(let i=0;i<n/2;i++){const a=line[i]!,b=line[n-1-i]!,flip=(r+i)%2===1;round.push({id:'',round:r+1,home:flip?b:a,away:flip?a:b})}
  first.push(round);rot.unshift(rot.pop()!)
 }
 const all=[...first.flat(),...first.flat().map(f=>({...f,round:f.round+n-1,home:f.away,away:f.home}))]
 return all.map(f=>({...f,id:`r${f.round}-${f.home}-${f.away}`}))
}

export type Row={club:string;name:string;p:number;w:number;d:number;l:number;gf:number;ga:number;gd:number;pts:number}
/** the table, from results only: 3 for a win, 1 for a draw; ties by goal difference, goals for, then name (fixed in advance) */
export function table(teams:readonly {club:string;name:string}[],fixtures:readonly Fixture[]):Row[]{
 const rows=new Map(teams.map(t=>[t.club,{club:t.club,name:t.name,p:0,w:0,d:0,l:0,gf:0,ga:0,gd:0,pts:0}]))
 for(const f of fixtures){if(!f.result)continue
  const [h,a]=f.result.goals,H=rows.get(f.home),A=rows.get(f.away);if(!H||!A)continue
  H.p++;A.p++;H.gf+=h;H.ga+=a;A.gf+=a;A.ga+=h
  if(h>a){H.w++;A.l++;H.pts+=3}else if(h<a){A.w++;H.l++;A.pts+=3}else{H.d++;A.d++;H.pts++;A.pts++}
 }
 return [...rows.values()].map(r=>({...r,gd:r.gf-r.ga})).sort((x,y)=>y.pts-x.pts||y.gd-x.gd||y.gf-x.gf||x.name.localeCompare(y.name))
}
