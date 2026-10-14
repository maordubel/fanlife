'use client'
import {useState} from 'react'
import type {Reel} from '@/lib/highlights/types'

/**
 * Under the match picture (owner, 14.10.2026): a board that flips between the two line-ups and the match statistics. Every
 * figure is counted from the moments the reel already holds — in a live match only the part the server has played — so the
 * board never knows more than the picture.
 */
export function boardStats(reel:Reel){
 const n=(k:string,s:0|1)=>reel.moments.filter(m=>m.side===s&&m.kind===k).length
 const row=(label:string,f:(s:0|1)=>number)=>({label,a:f(0),b:f(1)})
 return [
  row('Goals',s=>reel.moments.filter(m=>m.side===s&&m.kind==='goal').length),
  row('Shots',s=>['goal','save','miss','post','block'].reduce((t,k)=>t+n(k,s),0)),
  row('On target',s=>n('goal',s)+n('save',s)),
  row('Woodwork',s=>n('post',s)),
  row('Offsides',s=>n('offside',s)),
  row('Yellow cards',s=>n('yellow',s)),
  row('Red cards',s=>n('red',s)),
 ]
}
export function MatchBoard({reel}:{reel:Reel}){
 const [tab,setTab]=useState<'xi'|'stats'>('xi'),[a,b]=reel.teams
 return <section className="lgm-board" aria-label="Line-ups and statistics" data-testid="legends-board">
  <div className="lgm-seg lgm-seg-wide" role="tablist" aria-label="Board">
   <button type="button" role="tab" aria-selected={tab==='xi'} className="min-h-tap" onClick={()=>setTab('xi')}>Line-ups</button>
   <button type="button" role="tab" aria-selected={tab==='stats'} className="min-h-tap" onClick={()=>setTab('stats')}>Statistics</button>
  </div>
  {tab==='xi'?<div className="lgm-board-xi">{[a,b].map((t,i)=><div key={i}><h3>{t.name}{t.formation?<small> · {t.formation}</small>:null}</h3>
   <ol>{t.lineup.filter(p=>!p.bench).map(p=><li key={p.id}><i>{p.no}</i><span>{p.name}</span><em>{p.pos}</em></li>)}</ol></div>)}</div>
  :<table className="lgm-board-stats"><caption className="sr-only">Match statistics</caption><tbody>{boardStats(reel).map(r=><tr key={r.label}><td>{r.a}</td><th scope="row">{r.label}</th><td>{r.b}</td></tr>)}</tbody></table>}
 </section>
}
