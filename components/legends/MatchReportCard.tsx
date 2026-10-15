'use client'
import type {MatchReport} from '@/lib/legends/report'

/** U02: the manager's match, told from its stored log — up to three notes, a short timeline, and who the log names. */
export function MatchReportCard({report}:{report?:MatchReport|null}){
 if(!report)return null
 const {score,insights,timeline,standouts:s}=report
 return <div className="lgm-report" data-testid="legends-report">
  <p className="lgm-fine">{score.extraTime?`${score.regular[0]}–${score.regular[1]} after 90 minutes · ${score.final[0]}–${score.final[1]} after extra time`:`${score.final[0]}–${score.final[1]} at full time`}{score.pens?` · penalties ${score.pens[0]}–${score.pens[1]}`:''}</p>
  <ul className="lgm-report-notes">{insights.map(t=><li key={t}>{t}</li>)}</ul>
  {timeline.length?<details><summary className="min-h-tap">Key moments · {timeline.length}</summary><ol className="lgm-log">{timeline.map((e,i)=><li key={i} data-kind={e.kind} data-mine={e.mine||undefined}><b>{e.kind==='pens'?'Pens':`${e.minute}′${e.extra?' ET':''}`}</b> {e.text}</li>)}</ol></details>:null}
  {s.scorers.length||s.assists.length||s.sentOff.length||s.injured.length?<dl className="lgm-report-names">
   {s.scorers.length?<div><dt>Scored</dt><dd>{s.scorers.map(x=>`${x.name}${x.goals>1?` ×${x.goals}`:''}`).join(', ')}</dd></div>:null}
   {s.assists.length?<div><dt>Set up</dt><dd>{s.assists.map(x=>`${x.name}${x.n>1?` ×${x.n}`:''}`).join(', ')}</dd></div>:null}
   {s.sentOff.length?<div><dt>Sent off</dt><dd>{s.sentOff.map(x=>x.name).join(', ')}</dd></div>:null}
   {s.injured.length?<div><dt>Injured</dt><dd>{s.injured.map(x=>x.name).join(', ')}</dd></div>:null}
  </dl>:null}
 </div>
}
