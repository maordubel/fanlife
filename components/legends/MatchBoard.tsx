'use client'
import {useState} from 'react'
import type {Reel} from '@/lib/highlights/types'
import {teamMark} from '@/lib/highlights/board'

/**
 * Under the match picture (owner, 14.10.2026): a board that flips between the two line-ups and the match statistics. Every
 * figure is counted from the moments the reel already holds — in a live match only the part the server has played — so the
 * board never knows more than the picture.
 */
export function boardStats(reel:Reel,upTo=Infinity){
 const seen=reel.moments.filter(m=>m.minute<=upTo)
 const n=(k:string,s:0|1)=>seen.filter(m=>m.side===s&&m.kind===k).length
 const row=(label:string,f:(s:0|1)=>number)=>({label,a:f(0),b:f(1)})
 return [
  row('Goals',s=>n('goal',s)),
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
export function MatchBoard({reel,upTo}:{reel:Reel;upTo?:number}){
 const [tab,setTab]=useState<'xi'|'stats'>('xi'),[a,b]=reel.teams
 const rows=boardStats(reel,upTo)
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
   <ol>{t.lineup.filter(p=>!p.bench).sort((x,y)=>x.no-y.no).map(p=><li key={p.id}><b>{p.no}</b><span>{p.name}</span><em>{p.pos}</em></li>)}</ol></div>)}</div>
  :<div className="lgm-bd-card lgm-bd-statcard">
   <p className="lgm-bd-teams"><span>{mark(a)}{a.name}</span><span>{b.name}{mark(b)}</span></p>
   <table className="lgm-board-stats lgm-bd-stats"><caption className="sr-only">Match statistics</caption><tbody>{rows.map(r=>{const t=r.a+r.b||1;return <tr key={r.label} style={{'--a':`${Math.round(r.a/t*100)}%`,'--b':`${Math.round(r.b/t*100)}%`} as React.CSSProperties}>
    <td className="lgm-bd-n">{r.a}</td><th scope="row"><span>{r.label}</span><i className="lgm-bd-bar" aria-hidden="true"><u/><s/></i></th><td className="lgm-bd-n">{r.b}</td></tr>})}</tbody></table>
  </div>}
 </section>
}
