import type {Fixture,MatchEventRow} from './types'

/**
 * The match report (U02): the story of one finished match, written only from what its stored log says — goals, cards, injuries,
 * the manager's own changes and tactical calls — with names kept on the result itself, so a man sold later still reads as himself
 * and an old report is never recomputed by a newer engine. Order in time is stated; cause never is ("a goal came at 74′", not "the
 * change won it"). No score and no expected-goals figure is invented: a standout is a man the log names, nothing more.
 */
export type ReportEvent={minute:number;text:string;kind:'goal'|'red'|'injury'|'change'|'tactic'|'pens';mine:boolean;extra:boolean}
export type MatchReport={
 score:{regular:[number,number];final:[number,number];extraTime:boolean;pens:[number,number]|null}
 insights:string[];timeline:ReportEvent[];standouts:{scorers:{name:string;goals:number;mine:boolean}[];assists:{name:string;n:number;mine:boolean}[];sentOff:{name:string;mine:boolean}[];injured:{name:string;mine:boolean}[]}
}
type Result=NonNullable<Fixture['result']>
export function matchReport(f:Fixture,mineClub:string,teamName:(club:string)=>string,nameOf:(side:0|1,id?:string)=>string):MatchReport|null {
 const r=f.result;if(!r)return null
 const mine:0|1|-1=f.home===mineClub?0:f.away===mineClub?1:-1
 const etAt=r.events.find(e=>e.kind==='extra-time')?.minute??null
 const inExtra=(e:MatchEventRow)=>etAt!==null&&e.minute>etAt
 const goals=r.events.filter(e=>e.kind==='goal'&&e.side!==null)
 const regular:[number,number]=[0,0]
 for(const g of goals)if(!inExtra(g))regular[g.side as 0|1]++
 const timeline:ReportEvent[]=[]
 const own=(s:0|1|null)=>s!==null&&s===mine
 for(const e of r.events){
  const s=e.side,n=(id?:string)=>s===null?'':nameOf(s,id),ex=inExtra(e)
  if(e.kind==='goal'&&s!==null)timeline.push({minute:e.minute,kind:'goal',mine:own(s),extra:ex,text:`Goal — ${n(e.player)}${e.other?` (assist ${n(e.other)})`:''}${e.detail==='penalty'?' from the spot':e.detail==='free-kick'?' from a free kick':e.detail==='corner'?' from a corner':''}`})
  else if(e.kind==='red'&&s!==null)timeline.push({minute:e.minute,kind:'red',mine:own(s),extra:ex,text:`Red card — ${n(e.player)}${e.detail==='second-yellow'?' (second yellow)':''}`})
  else if(e.kind==='injury'&&s!==null)timeline.push({minute:e.minute,kind:'injury',mine:own(s),extra:ex,text:`Injury — ${n(e.player)}`})
  else if(e.kind==='sub'&&own(s))timeline.push({minute:e.minute,kind:'change',mine:true,extra:ex,text:`Your change — ${n(e.player)} on for ${n(e.other)}`})
  else if(e.kind==='tactic'&&own(s))timeline.push({minute:e.minute,kind:'tactic',mine:true,extra:ex,text:`Your tactical call — ${(e.detail??'').replace(/·/g,'/').trim()||'changed'}`})
 }
 if(r.pens)timeline.push({minute:121,kind:'pens',mine:false,extra:true,text:`Penalty shoot-out ${r.pens[0]}–${r.pens[1]}`})
 // insights: time and score only, in the order of what matters most
 const ins:string[]=[]
 const team=(s:0|1)=>teamName(s===0?f.home:f.away)
 const reds=goals.length||true?r.events.filter(e=>e.kind==='red'&&e.side!==null):[]
 for(const e of reds.slice(0,1))ins.push(`${team(e.side as 0|1)} played with ten from ${e.minute}′ after ${nameOf(e.side as 0|1,e.player)} was sent off.`)
 if(goals.length){
  const first=goals[0]!;ins.push(`${team(first.side as 0|1)} scored first, at ${first.minute}′.`)
  const run:[number,number]=[0,0];let level:number|null=null
  for(const g of goals){const before=run[0]===run[1];run[g.side as 0|1]++;if(!before&&run[0]===run[1])level=g.minute}
  if(level!==null)ins.push(`A goal at ${level}′ levelled the score.`)
  const last=goals[goals.length-1]!,decided=r.goals[0]!==r.goals[1]&&!r.pens
  if(decided&&last.minute>=80&&!inExtra(last)&&((r.goals[0]!>r.goals[1]!)===(last.side===0)))ins.push(`The last goal, at ${last.minute}′, settled it.`)
 }else ins.push('No goals in the match.')
 if(r.goals[0]===0||r.goals[1]===0){const cs=r.goals[0]===0&&r.goals[1]===0?null:r.goals[0]===0?1:0;if(cs!==null)ins.push(`${team(cs as 0|1)} kept a clean sheet.`)}
 const mineChanges=timeline.filter(t=>t.kind==='change'||t.kind==='tactic').map(t=>t.minute)
 if(mineChanges.length)ins.push(`You made ${timeline.filter(t=>t.kind==='change').length} change(s) and ${timeline.filter(t=>t.kind==='tactic').length} tactical call(s), at ${[...new Set(mineChanges)].join('′, ')}′.`)
 // standouts
 const count=(rows:MatchEventRow[],key:'player'|'other')=>{const m=new Map<string,{name:string;n:number;mine:boolean}>();for(const e of rows){const id=e[key];if(!id||e.side===null)continue;const k=`${e.side}:${id}`,x=m.get(k)??{name:nameOf(e.side,id),n:0,mine:own(e.side)};x.n++;m.set(k,x)}return [...m.values()].sort((a,b)=>b.n-a.n||a.name.localeCompare(b.name))}
 const standouts={scorers:count(goals,'player').map(x=>({name:x.name,goals:x.n,mine:x.mine})),assists:count(goals.filter(g=>g.other),'other').map(x=>({name:x.name,n:x.n,mine:x.mine})),
  sentOff:count(r.events.filter(e=>e.kind==='red'),'player').map(x=>({name:x.name,mine:x.mine})),injured:count(r.events.filter(e=>e.kind==='injury'),'player').map(x=>({name:x.name,mine:x.mine}))}
 return {score:{regular,final:r.goals,extraTime:etAt!==null,pens:r.pens},insights:ins.slice(0,3),timeline:timeline.sort((a,b)=>a.minute-b.minute),standouts}
}
