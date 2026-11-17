'use client'
import {useMemo,useState} from 'react'
import type {Reel} from '@/lib/highlights/types'
import {teamMark} from '@/lib/highlights/board'
import {reelRatings} from '@/lib/legends/match-ratings'
import {RatingChip} from './Rating'

/**
 * Under the match picture (owner, 14.10.2026): a board that flips between the two line-ups and the match statistics. Every
 * figure is counted from the moments the reel already holds — in a live match only the part the server has played — so the
 * board never knows more than the picture.
 */
const SHOT=['goal','save','miss','post','block']
/**
 * xG (17.11.2026, the owner's "make it our own Football Manager"): a chance's worth by how it was made — the shape the reel
 * already gives every shot. Penalties ~0.76, a cut-back or a through ball a real chance, a long shot a hope. Game values, the
 * same for every club; the score never changes because of them.
 */
const XG:Record<string,number>={penalty:0.76,cutback:0.34,through:0.32,rebound:0.38,counter:0.28,dribble:0.2,combo:0.22,lob:0.18,volley:0.14,cross:0.12,corner:0.08,'free-kick':0.07,long:0.05}
export const xgOf=(m:{shape?:string;header?:boolean})=>Math.max(0.03,(XG[m.shape??'']??0.12)*(m.header?0.8:1))
/** momentum: who had the game, five minutes at a time — goals weigh most, then shots on target, the post, the rest */
export function momentum(reel:Reel,upTo=Infinity):{at:number;v:number}[]{
 const W:Record<string,number>={goal:3,save:1.4,post:1.2,miss:0.7,block:0.6}
 const last=Math.min(upTo,Math.max(90,...reel.moments.map(m=>m.minute))),out:{at:number;v:number}[]=[]
 for(let a=0;a<last;a+=5){let v=0;for(const m of reel.moments)if(m.minute>a&&m.minute<=a+5&&m.minute<=upTo&&W[m.kind])v+=(m.side===0?1:-1)*W[m.kind]!;out.push({at:a+5,v})}
 return out
}
export function boardStats(reel:Reel,upTo=Infinity){
 const seen=reel.moments.filter(m=>m.minute<=upTo)
 const n=(k:string,s:0|1)=>seen.filter(m=>m.side===s&&m.kind===k).length
 const row=(label:string,f:(s:0|1)=>number)=>({label,a:f(0),b:f(1)})
 const xg=(s:0|1)=>Math.round(seen.filter(m=>m.side===s&&SHOT.includes(m.kind)).reduce((t,m)=>t+xgOf(m),0)*10)/10
 const big=(s:0|1)=>seen.filter(m=>m.side===s&&SHOT.includes(m.kind)&&xgOf(m)>=0.3).length
 return [
  row('Goals',s=>n('goal',s)),
  row('Expected goals (xG)',xg),
  row('Big chances',big),
  row('Shots',s=>['goal','save','miss','post','block'].reduce((t,k)=>t+n(k,s),0)),
  row('On target',s=>n('goal',s)+n('save',s)),
  row('Woodwork',s=>n('post',s)),
  row('Offsides',s=>n('offside',s)),
  row('Yellow cards',s=>n('yellow',s)),
  row('Red cards',s=>n('red',s)),
 ]
}
/**
 * `upTo` is the last minute the viewer has actually been shown (F03, 15.10.2026): the server plays a whole spell ahead, so the
 * board may not count a moment the picture has not reached yet. Omitted = everything the reel holds (full time).
 * Look (owner, 15.10.2026): the World Cup '94 caption again — blue board, halftone dots, white type with an ink shadow, bars for
 * the figures. The text colours are set HERE, never inherited: the live screen is ivory-on-night and the old board was paper.
 */
export function MatchBoard({reel,upTo,final=false}:{reel:Reel;upTo?:number;final?:boolean}){
 const [tab,setTab]=useState<'xi'|'stats'>('xi'),[a,b]=reel.teams
 const rows=boardStats(reel,upTo)
 // 17.11.2026: every man's rating, live — it moves with the picture and never with a moment the picture has not reached
 const rt=useMemo(()=>reelRatings(reel,{upTo,final}),[reel,upTo,final]),rOf=(id:string)=>rt.men.find(m=>m.id===id)
 const cameOn=(t:Reel['teams'][number])=>t.lineup.filter(p=>p.bench&&rOf(p.id))
 const mark=(t:Reel['teams'][number])=>{const m=teamMark(t);return m.kind==='crest'
  ?<span className="lgm-bd-crest">{/* eslint-disable-next-line @next/next/no-img-element -- the club's own crest file, shown as it is */}<img src={m.src} alt="" width={139} height={181} decoding="async"/></span>
  :<span className="lgm-bd-flag" style={{background:m.background}} aria-hidden="true"/>}
 return <section className="lgm-board lgm-bd" aria-label="Line-ups and statistics" data-testid="legends-board">
  <div className="lgm-bd-tabs" role="tablist" aria-label="Board">
   <button type="button" role="tab" aria-selected={tab==='xi'} className="min-h-tap" onClick={()=>setTab('xi')}>Line-ups</button>
   <button type="button" role="tab" aria-selected={tab==='stats'} className="min-h-tap" onClick={()=>setTab('stats')}>Statistics</button>
  </div>
  {tab==='xi'?<div className="lgm-bd-xi">{[a,b].map((t,i)=><div key={i} className="lgm-bd-card" data-side={i}>
   <h3>{mark(t)}<span className="lgm-bd-name">{t.name}</span><i>{i===0?'Home':'Away'}</i></h3>
   {t.formation?<p className="lgm-bd-form">{t.formation}</p>:null}
   <ol>{t.lineup.filter(p=>!p.bench).sort((x,y)=>x.no-y.no).map(p=>{const r=rOf(p.id);return <li key={p.id} data-off={r&&r.line.red||undefined}><b>{p.no}</b><span>{p.name}{r?.line.goals?<i className="lgm-bd-ev" aria-label={`${r.line.goals} goal${r.line.goals>1?'s':''}`}>{'⚽'.repeat(Math.min(3,r.line.goals))}</i>:null}{r?.line.red?<i className="lgm-bd-card-red" aria-label="sent off"/>:r?.line.yellow?<i className="lgm-bd-card-yel" aria-label="booked"/>:null}</span><em>{p.pos}</em><RatingChip r={r?.rating} size="sm" potm={rt.potm===p.id}/></li>})}</ol>
   {cameOn(t).length?<><p className="lgm-bd-sub">Came on</p><ol className="lgm-bd-subs">{cameOn(t).map(p=>{const r=rOf(p.id)!;return <li key={p.id}><b>↑</b><span>{p.name}{r.line.goals?<i className="lgm-bd-ev">{'⚽'.repeat(Math.min(3,r.line.goals))}</i>:null}</span><em>{p.pos}</em><RatingChip r={r.rating} size="sm" potm={rt.potm===p.id}/></li>})}</ol></>:null}</div>)}</div>
  :<div className="lgm-bd-card lgm-bd-statcard">
   <p className="lgm-bd-teams"><span>{mark(a)}{a.name}</span><span>{b.name}{mark(b)}</span></p>
   <Momentum reel={reel} upTo={upTo}/>
   <table className="lgm-board-stats lgm-bd-stats"><caption className="sr-only">Match statistics</caption><tbody>{rows.map(r=>{const t=r.a+r.b||1;return <tr key={r.label} style={{'--a':`${Math.round(r.a/t*100)}%`,'--b':`${Math.round(r.b/t*100)}%`} as React.CSSProperties}>
    <td className="lgm-bd-n">{r.a}</td><th scope="row"><span>{r.label}</span><i className="lgm-bd-bar" aria-hidden="true"><u/><s/></i></th><td className="lgm-bd-n">{r.b}</td></tr>})}</tbody></table>
  </div>}
 </section>
}

/** the momentum strip: bars above the line are the home side's spells, below the away side's — the story of the match in one look */
function Momentum({reel,upTo}:{reel:Reel;upTo?:number}){
 const m=momentum(reel,upTo),max=Math.max(3,...m.map(x=>Math.abs(x.v)))
 return <figure className="lgm-mo" aria-label="Momentum, five minutes at a time"><svg viewBox={`0 0 ${18*6} 40`} preserveAspectRatio="none" aria-hidden="true">
  <line x1="0" y1="20" x2={18*6} y2="20"/>
  <line className="lgm-mo-ht" x1={9*6} y1="2" x2={9*6} y2="38"/>
  {m.map((x,i)=>x.v?<rect key={i} data-side={x.v>0?0:1} x={i*6+0.8} width="4.4" y={x.v>0?20-18*x.v/max:20} height={18*Math.abs(x.v)/max}/>:null)}
 </svg><figcaption><span>{reel.teams[0].code}</span><span>Momentum</span><span>{reel.teams[1].code}</span></figcaption></figure>
}
