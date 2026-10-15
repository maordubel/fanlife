'use client'
import {useEffect,useState} from 'react'
import {legendsRecords} from '@/app/all-football/legends/actions'
import type {Records,ManRecord} from '@/lib/legends/records'

/** U04: the career's records, loaded on the Club tab only — a sold man stays on the board, a season without detail says so. */
export default function HallOfFame({careerId,seasons,team}:{careerId:string;seasons:number;team:(club:string)=>string}){
 const [r,setR]=useState<Records|null|'error'>(null)
 useEffect(()=>{let live=true;setR(null);legendsRecords(careerId).then(x=>{if(live)setR(x.ok?x.records:'error')}).catch(()=>{if(live)setR('error')});return()=>{live=false}},[careerId,seasons])
 return <section className="lgm-panel lgm-fame" data-testid="legends-records"><p className="lgm-kicker">The hall of fame</p>
  {r===null?<p className="lgm-fine" role="status">Counting the career…</p>:r==='error'?<p className="lgm-fine" role="alert">The records could not be loaded. Open this tab again to retry.</p>:<Body r={r} team={team}/>}
 </section>
}
const Men=({title,rows,unit}:{title:string;rows:ManRecord[];unit:(m:ManRecord)=>number}) =>rows.length?<div className="fame-list"><h4>{title}</h4><ol>{rows.map(m=><li key={m.id}><span>{m.name}</span><b>{unit(m)}</b></li>)}</ol></div>:null
function Body({r,team}:{r:Records;team:(club:string)=>string}){
 return <>
  <dl className="fame-tiles">
   <div><dt>Titles</dt><dd>{r.titles}</dd></div>
   <div><dt>Seasons</dt><dd>{r.seasons}</dd></div>
   <div><dt>Best finish</dt><dd>{r.bestPlace?`${r.bestPlace.place} of ${r.bestPlace.of}`:'—'}</dd></div>
   <div><dt>Win run</dt><dd>{r.winStreak.length||'—'}</dd></div>
  </dl>
  {r.biggestWin?<p className="fame-line">Biggest win · <b>{r.biggestWin.gf}–{r.biggestWin.ga}</b> against {team(r.biggestWin.against)} · season {r.biggestWin.season}, round {r.biggestWin.round}</p>:null}
  {r.winStreak.length>1&&r.winStreak.from&&r.winStreak.to?<p className="fame-line">Longest winning run · <b>{r.winStreak.length}</b> · season {r.winStreak.from.season} round {r.winStreak.from.round} to season {r.winStreak.to.season} round {r.winStreak.to.round}</p>:null}
  {r.mostGoalsInSeason?<p className="fame-line">Most goals in a season · <b>{r.mostGoalsInSeason.goals}</b> · season {r.mostGoalsInSeason.season}</p>:null}
  <div className="fame-cols">
   <Men title="Career scorers" rows={r.scorers} unit={m=>m.goals}/>
   <Men title="Appearances" rows={r.appearances} unit={m=>m.apps}/>
   <Men title="Winning goals" rows={r.decisive} unit={m=>m.winners}/>
  </div>
  {r.detail.note?<p className="fame-note" data-testid="legends-records-partial">{r.detail.note} Seasons {r.detail.summaryOnly.join(', ')} keep their titles and places only, so the lists above count from the detailed seasons.</p>:null}
  {!r.scorers.length&&!r.appearances.length?<p className="lgm-fine">The lists fill in as seasons are played. Men who leave stay on them.</p>:null}
 </>
}
