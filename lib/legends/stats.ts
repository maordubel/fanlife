import type {Career,Fixture} from './types'

/**
 * A season in numbers — read from the career's own match logs and nothing else (owner, 13.10.2026: "a real league
 * experience"). Every count is an event the engine wrote: a goal row with its scorer and assist, a card row, a change row; an
 * appearance is a starter kept with the result or a man the change log sent on. A clean sheet is the starting keeper's when the
 * other side scored nothing in open play and extra time. Pure; no hidden rating is read, so none can leave the server.
 */
export type Leader={id:string;name:string;club:string;clubName:string;value:number;mine:boolean}
export type CardLeader=Leader&{yellow:number;red:number}
export type TeamStat={club:string;name:string;p:number;w:number;d:number;l:number;gf:number;ga:number;cleanSheets:number;failedToScore:number;yellows:number;reds:number;home:[number,number,number];away:[number,number,number];biggestWin:{gf:number;ga:number;against:string;round:number}|null;mine:boolean}
export type SeasonStats={played:number;goals:number;perMatch:number;scorers:Leader[];assists:Leader[];apps:Leader[];cards:CardLeader[];cleanSheets:Leader[];teams:TeamStat[]}

const TOP=10
export function seasonStats(c:Career,names:(club:string,id:string)=>string):SeasonStats{
 const teams=new Map(c.teams.map(t=>[t.club,t.name]))
 const fx:Fixture[]=[...c.season.fixtures,...(c.season.playoff?[c.season.playoff]:[])].filter(f=>f.result)
 type Acc={id:string;club:string;name:string;goals:number;assists:number;apps:number;yellow:number;red:number;clean:number}
 const men=new Map<string,Acc>()
 const man=(club:string,id:string,name?:string)=>{const k=`${club}\u0000${id}`;let m=men.get(k);if(!m){m={id,club,name:name??names(club,id),goals:0,assists:0,apps:0,yellow:0,red:0,clean:0};men.set(k,m)}return m}
 const zero=(club:string):TeamStat=>({club,name:teams.get(club)??club,p:0,w:0,d:0,l:0,gf:0,ga:0,cleanSheets:0,failedToScore:0,yellows:0,reds:0,home:[0,0,0],away:[0,0,0],biggestWin:null,mine:club===c.clubId})
 const tm=new Map<string,TeamStat>(c.teams.map(t=>[t.club,zero(t.club)]))
 let goals=0
 for(const f of fx){
  const r=f.result!,clubs=[f.home,f.away] as const,[h,a]=r.goals;goals+=h+a
  for(const side of [0,1] as const){
   const club=clubs[side],t=tm.get(club)??zero(club),gf=r.goals[side],ga=r.goals[1-side]!,res=gf>ga?0:gf===ga?1:2
   t.p++;t.gf+=gf;t.ga+=ga;if(res===0)t.w++;else if(res===1)t.d++;else t.l++
   if(f.round<=c.season.rounds)(side===0?t.home:t.away)[res]++
   if(ga===0)t.cleanSheets++;if(gf===0)t.failedToScore++
   const b=t.biggestWin;if(gf>ga&&(!b||gf-ga>b.gf-b.ga||(gf-ga===b.gf-b.ga&&gf>b.gf)))t.biggestWin={gf,ga,against:teams.get(clubs[1-side]!)??clubs[1-side]!,round:f.round}
   tm.set(club,t)
   const xi=r.sides?.[side]?.xi
   if(xi){for(const p of xi)man(club,p.id,p.name).apps++
    if(ga===0&&xi[0])man(club,xi[0].id,xi[0].name).clean++}
  }
  for(const e of r.events){
   if(e.side===null||!e.player)continue
   const club=clubs[e.side]
   if(e.kind==='goal'){man(club,e.player).goals++;if(e.other)man(club,e.other).assists++}
   else if(e.kind==='yellow'){man(club,e.player).yellow++;tm.get(club)!.yellows++}
   else if(e.kind==='red'){man(club,e.player).red++;tm.get(club)!.reds++}
   else if(e.kind==='sub'&&r.sides)man(club,e.player).apps++
  }
 }
 const all=[...men.values()]
 const lead=(v:(m:Acc)=>number):Leader[]=>all.filter(m=>v(m)>0).sort((x,y)=>v(y)-v(x)||x.name.localeCompare(y.name)).slice(0,TOP).map(m=>({id:m.id,name:m.name,club:m.club,clubName:teams.get(m.club)??m.club,value:v(m),mine:m.club===c.clubId}))
 const cards=all.filter(m=>m.yellow+m.red>0).sort((x,y)=>(y.red*3+y.yellow)-(x.red*3+x.yellow)||y.red-x.red||x.name.localeCompare(y.name)).slice(0,TOP)
  .map(m=>({id:m.id,name:m.name,club:m.club,clubName:teams.get(m.club)??m.club,value:m.yellow+m.red,yellow:m.yellow,red:m.red,mine:m.club===c.clubId}))
 return {played:fx.length,goals,perMatch:fx.length?Math.round(goals/fx.length*100)/100:0,scorers:lead(m=>m.goals),assists:lead(m=>m.assists),apps:lead(m=>m.apps),cards,cleanSheets:lead(m=>m.clean),
  teams:[...tm.values()].sort((x,y)=>y.gf-x.gf||x.ga-y.ga||x.name.localeCompare(y.name))}
}
