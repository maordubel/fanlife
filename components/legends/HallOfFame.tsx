'use client'
import {useEffect,useState} from 'react'
import {legendsRecords} from '@/app/all-football/legends/actions'
import type {Records,ManRecord} from '@/lib/legends/records'

/** U04: the career's records, loaded on the Club tab only — a sold man stays on the board, a season without detail says so. */
export default function HallOfFame({careerId,seasons,team}:{careerId:string;seasons:number;team:(club:string)=>string}){
 const [r,setR]=useState<Records|null|'error'>(null)
 useEffect(()=>{let live=true;setR(null);legendsRecords(careerId).then(x=>{if(live)setR(x.ok?x.records:'error')}).catch(()=>{if(live)setR('error')});return()=>{live=false}},[careerId,seasons])
 return <section className="wk-panel wk-lift wkl-fame" data-testid="legends-records"><h3 className="wk-logo sm">The hall of fame</h3>
  {r===null?<p className="wk-k wk-muted" role="status">Counting the career…</p>:r==='error'?<p className="wk-k red" role="alert">The records could not be loaded. Open this tab again to retry.</p>:<Body r={r} team={team}/>}
 </section>
}
const Men=({title,rows,unit}:{title:string;rows:ManRecord[];unit:(m:ManRecord)=>number}) =>rows.length?<details className="wk-fold" open><summary>{title}</summary><ol className="wkl-fame-list">{rows.map(m=><li key={m.id}><span>{m.name}</span><b className="wk-num">{unit(m)}</b></li>)}</ol></details>:null
function Body({r,team}:{r:Records;team:(club:string)=>string}){
 return <>
  <dl className="wkl-fame-tiles">
   <div className="wk-redplate"><dt className="wk-k white">Titles</dt><dd className="wk-num">{r.titles}</dd></div>
   <div className="wk-navyplate"><dt className="wk-k white">Seasons</dt><dd className="wk-num">{r.seasons}</dd></div>
   <div><dt className="wk-k">Best finish</dt><dd className="wk-num">{r.bestPlace?`${r.bestPlace.place}/${r.bestPlace.of}`:'—'}</dd></div>
   <div><dt className="wk-k">Win run</dt><dd className="wk-num">{r.winStreak.length||'—'}</dd></div>
  </dl>
  {r.biggestWin?<p className="wkl-fame-line">Biggest win · <b>{r.biggestWin.gf}–{r.biggestWin.ga}</b> against {team(r.biggestWin.against)} · season {r.biggestWin.season}, round {r.biggestWin.round}</p>:null}
  {r.winStreak.length>1&&r.winStreak.from&&r.winStreak.to?<p className="wkl-fame-line">Longest winning run · <b>{r.winStreak.length}</b> · season {r.winStreak.from.season} round {r.winStreak.from.round} to season {r.winStreak.to.season} round {r.winStreak.to.round}</p>:null}
  {r.mostGoalsInSeason?<p className="wkl-fame-line">Most goals in a season · <b>{r.mostGoalsInSeason.goals}</b> · season {r.mostGoalsInSeason.season}</p>:null}
  <div className="wkl-fame-cols">
   <Men title="Career scorers" rows={r.scorers} unit={m=>m.goals}/>
   <Men title="Appearances" rows={r.appearances} unit={m=>m.apps}/>
   <Men title="Winning goals" rows={r.decisive} unit={m=>m.winners}/>
  </div>
  {r.detail.note?<p className="wk-cap yellow" data-testid="legends-records-partial">{r.detail.note} Seasons {r.detail.summaryOnly.join(', ')} keep their titles and places only, so the lists above count from the detailed seasons.</p>:null}
  {!r.scorers.length&&!r.appearances.length?<p className="wk-k wk-muted">The lists fill in as seasons are played. Men who leave stay on them.</p>:null}
 </>
}
