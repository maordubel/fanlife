import type {Meeting,Tally} from '@/lib/fixtures/meetings'
import type {UiLocale} from '@/lib/clubs/locale'
type Copy={sub:string;rival:string;meetings:string;none:string;won:string;drawn:string;lost:string;goals:string;biggest:string;decade:string;more:string}
/**
 * Gate 11 — the rivalry wall. A scoreboard read from the archive's own rows: the record, the biggest win,
 * every decade as a printed bar, then the meetings. Only rows that state the club's side are counted.
 */
export function DerbyWall({rival,meetings,tally,copy,locale,contentLocale}:{rival:string;meetings:Meeting[];tally:Tally;copy:Copy;locale:UiLocale;contentLocale:string}){
 const mine=(m:Meeting)=>m.us==='home'?[m.homeGoals,m.awayGoals]:[m.awayGoals,m.homeGoals]
 const best=meetings.filter(m=>m.us).map(m=>({m,d:mine(m)[0]!-mine(m)[1]!})).filter(x=>x.d>0).sort((a,b)=>b.d-a.d||mine(b.m)[0]!-mine(a.m)[0]!)[0]?.m
 const decades=new Map<number,{w:number;d:number;l:number}>()
 for(const m of meetings){if(!m.us)continue;const y=m.on?Number(m.on.slice(0,4)):m.year;if(!y)continue;const k=Math.floor(y/10)*10,[f,a]=mine(m),row=decades.get(k)||{w:0,d:0,l:0};if(f!>a!)row.w++;else if(f===a)row.d++;else row.l++;decades.set(k,row)}
 const rows=[...decades.entries()].sort((a,b)=>a[0]-b[0]),peak=Math.max(1,...rows.map(([,r])=>r.w+r.d+r.l))
  // a scoreline is three isolated runs in one fixed LTR row, so a Hebrew name can never flip the score
 const score=(m:Meeting)=><span className="derby-score" dir="ltr"><bdi lang={contentLocale} dir="auto">{m.home}</bdi> <b>{m.homeGoals}–{m.awayGoals}</b> <bdi lang={contentLocale} dir="auto">{m.away}</bdi></span>
 const line=(m:Meeting)=><div className="mag-row" key={`${m.on??m.year}|${m.home}|${m.homeGoals}-${m.awayGoals}`}><span>{score(m)}<small><bdi>{m.on??m.year}</bdi>{m.competition?<> · <bdi lang={contentLocale} dir="auto">{m.competition}</bdi></>:null}</small></span></div>
 return <section className="derby-wall" data-testid="derby-wall" lang={locale}>
  <p>{copy.sub}</p>
  <p className="mag-kicker">{copy.rival}</p>
  <h2 className="mag-h2"><bdi>{rival}</bdi></h2>
  {meetings.length===0?<p>{copy.none}</p>:<>
   {tally.played>0&&<div className="derby-board" role="group" aria-label={`${copy.won} ${tally.won}, ${copy.drawn} ${tally.drawn}, ${copy.lost} ${tally.lost}`}>
    <div className="derby-cell won"><b>{tally.won}</b><span>{copy.won}</span></div>
    <div className="derby-cell drawn"><b>{tally.drawn}</b><span>{copy.drawn}</span></div>
    <div className="derby-cell lost"><b>{tally.lost}</b><span>{copy.lost}</span></div>
    <p className="derby-goals mag-mono">{copy.goals} <bdi>{tally.for}–{tally.against}</bdi> · {copy.meetings} {tally.played}</p>
   </div>}
   {best&&<div className="game-panel derby-best"><p className="mag-kicker">{copy.biggest}</p><p className="mag-bowl derby-best-line">{score(best)}</p><small><bdi>{best.on??best.year}</bdi> · <bdi lang={contentLocale} dir="auto">{best.competition}</bdi></small></div>}
   {rows.length>1&&<><p className="mag-kicker">{copy.decade}</p><ol className="derby-decades">{rows.map(([dec,r])=>{const n=r.w+r.d+r.l;return <li key={dec}><span className="mag-mono">{dec}s</span><span className="derby-bar" style={{inlineSize:`${Math.max(8,(n/peak)*100)}%`}} aria-label={`${dec}s: ${r.w} ${copy.won}, ${r.d} ${copy.drawn}, ${r.l} ${copy.lost}`}>{r.w>0&&<i className="won" style={{flexGrow:r.w}}>{r.w}</i>}{r.d>0&&<i className="drawn" style={{flexGrow:r.d}}>{r.d}</i>}{r.l>0&&<i className="lost" style={{flexGrow:r.l}}>{r.l}</i>}</span></li>})}</ol></>}
   <p className="mag-kicker">{copy.meetings} · {meetings.length}</p>
   <div className="mag-contents">{meetings.slice(0,12).map(line)}</div>
   {meetings.length>12&&<details className="derby-more"><summary className="mag-chip min-h-tap">{copy.more} · {meetings.length}</summary><div className="mag-contents">{meetings.slice(12).map(line)}</div></details>}
  </>}
 </section>
}
