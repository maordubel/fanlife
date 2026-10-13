'use client'
import {useState} from 'react'
import type {CareerView,ResultView} from '@/lib/legends/view'
import type {Leader} from '@/lib/legends/stats'
import {ClubMark} from './Shirts'

/**
 * The league centre (owner, 13.10.2026: "a real league experience"). Four rooms behind one fixed bar that never slides:
 * the table · the results · the season in numbers · the honours of past seasons. Every number is counted from this career's
 * own match logs on the server (`lib/legends/stats.ts`); nothing here is a hidden rating.
 */
const ordinal=(n:number)=>`${n}${n%10===1&&n!==11?'st':n%10===2&&n!==12?'nd':n%10===3&&n!==13?'rd':'th'}`
type Room='table'|'results'|'stats'|'history'

export function Table({v,rows,openClub}:{v:CareerView;rows:CareerView['table'];openClub?:(c:string)=>void}){
 return <div className="lgm-table-wrap"><table className="lgm-table tl-table"><thead><tr><th scope="col">#</th><th scope="col">Club</th><th scope="col">P</th><th scope="col">W</th><th scope="col">D</th><th scope="col">L</th><th scope="col">GD</th><th scope="col">Pts</th><th scope="col" className="lgm-form-h">Form</th></tr></thead>
  <tbody>{rows.map(r=><tr key={r.club} data-mine={r.mine||undefined}><td>{v.table.findIndex(x=>x.club===r.club)+1}</td><th scope="row"><span className="tl-clubcell"><ClubMark club={r.club} name={r.name} size={24}/>{openClub&&!r.mine?<button type="button" className="lgm-rowbtn min-h-tap" onClick={()=>openClub(r.club)}>{r.name}</button>:<span>{r.name}</span>}</span></th><td>{r.p}</td><td>{r.w}</td><td>{r.d}</td><td>{r.l}</td><td>{r.gd>0?`+${r.gd}`:r.gd}</td><td><b>{r.pts}</b></td><td className="lgm-form">{r.form.map((x,j)=><span key={j} data-r={x}>{x}</span>)}</td></tr>)}</tbody></table></div>
}
export function ResultRow({r,onClick,expanded}:{r:ResultView;onClick?:()=>void;expanded?:boolean}){
 return <button type="button" className="tl-res min-h-tap" aria-expanded={expanded} onClick={onClick}>
  <span className="tl-res-side"><ClubMark club={r.homeClub} size={22}/><span>{r.home}</span></span>
  <b>{r.goals[0]}–{r.goals[1]}{r.pens?<small> ({r.pens[0]}–{r.pens[1]} p)</small>:null}</b>
  <span className="tl-res-side" data-end><span>{r.away}</span><ClubMark club={r.awayClub} size={22}/></span>
 </button>
}
function Log({r}:{r:ResultView}){
 const lines=r.log.filter(l=>l.kind!=='kickoff')
 return lines.length?<ol className="lgm-log">{lines.map((l,i)=><li key={i} data-side={l.side??undefined} data-kind={l.kind} data-mine={l.mine||undefined}><b>{l.minute}′</b> {l.text}</li>)}</ol>:<p className="lgm-fine">No goals.</p>
}

export function LeagueCentre({v,openClub}:{v:CareerView;openClub:(c:string)=>void}){
 const [room,setRoom]=useState<Room>('table')
 const rooms:{id:Room;label:string}[]=[{id:'table',label:'Table'},{id:'results',label:'Results'},{id:'stats',label:'Stats'},{id:'history',label:'History'}]
 return <div className="tl-league">
  <div className="tl-rooms" role="tablist" aria-label="The league">{rooms.map(r=><button key={r.id} type="button" role="tab" className="min-h-tap" aria-selected={room===r.id} onClick={()=>setRoom(r.id)} data-testid={`legends-league-${r.id}`}>{r.label}</button>)}</div>
  {room==='table'?<section className="lgm-panel"><p className="lgm-kicker">Season {v.season} · the table</p><Table v={v} rows={v.table} openClub={openClub}/><p className="lgm-fine">Tap a club to see its squad. {v.tieNote} Points: win {v.settings.points.win}, draw {v.settings.points.draw}, loss {v.settings.points.loss}.</p></section>:null}
  {room==='results'?<Results v={v}/>:null}
  {room==='stats'?<Numbers v={v}/>:null}
  {room==='history'?<History v={v}/>:null}
 </div>
}
function Results({v}:{v:CareerView}){
 const rounds=[...new Set(v.results.map(r=>r.round))].sort((a,b)=>b-a),[open,setOpen]=useState<string|null>(null)
 return <section className="lgm-panel"><p className="lgm-kicker">Season {v.season} · results</p>
  {rounds.length?rounds.map(rd=><div key={rd} className="tl-round"><h3>{rd>v.rounds?'Play-off':`Round ${rd}`}</h3><ul>{v.results.filter(r=>r.round===rd).map(r=><li key={r.id} data-mine={r.mine||undefined}><ResultRow r={r} expanded={open===r.id} onClick={()=>setOpen(open===r.id?null:r.id)}/>{open===r.id?<Log r={r}/>:null}</li>)}</ul></div>):<p className="lgm-fine">No round has been played yet.</p>}
 </section>
}
function Board({title,rows,unit,empty,testid}:{title:string;rows:Leader[];unit:(n:number)=>string;empty:string;testid?:string}){
 return <section className="tl-board" data-testid={testid}><h3>{title}</h3>
  {rows.length?<ol>{rows.map((r,i)=><li key={`${r.club}:${r.id}`} data-mine={r.mine||undefined}><span className="tl-board-n">{i+1}</span><ClubMark club={r.club} name={r.clubName} size={22}/><span className="tl-board-who"><b>{r.name}</b><small>{r.clubName}</small></span><span className="tl-board-v">{unit(r.value)}</span></li>)}</ol>:<p className="lgm-fine">{empty}</p>}
 </section>
}
const pl=(w:string)=>(n:number)=>`${n}`+(w?` ${w}${n===1?'':'s'}`:'')
function Numbers({v}:{v:CareerView}){
 const st=v.stats
 if(!st.played)return <section className="lgm-panel"><p className="lgm-kicker">Season {v.season} · in numbers</p><p className="lgm-fine">The numbers start with the first round.</p></section>
 const mine=st.teams.find(t=>t.mine)
 return <div className="tl-numbers">
  <section className="tl-headline lgm-panel"><p className="lgm-kicker">Season {v.season} · in numbers</p>
   <dl><div><dt>Matches</dt><dd>{st.played}</dd></div><div><dt>Goals</dt><dd>{st.goals}</dd></div><div><dt>Per match</dt><dd>{st.perMatch.toFixed(2)}</dd></div>{mine?<div data-mine><dt>{v.clubName}</dt><dd>{mine.gf}<small>–{mine.ga}</small></dd></div>:null}</dl>
  </section>
  <div className="tl-boards">
   <Board title="Top scorers" rows={st.scorers} unit={pl('goal')} empty="Nobody has scored yet." testid="legends-stats-scorers"/>
   <Board title="Assists" rows={st.assists} unit={pl('assist')} empty="No assist recorded yet."/>
   <Board title="Appearances" rows={st.apps} unit={pl('game')} empty="No appearance recorded yet."/>
   <Board title="Clean sheets" rows={st.cleanSheets} unit={pl('')} empty="No keeper has kept one yet."/>
   <section className="tl-board"><h3>Cards</h3>{st.cards.length?<ol>{st.cards.map((r,i)=><li key={`${r.club}:${r.id}`} data-mine={r.mine||undefined}><span className="tl-board-n">{i+1}</span><ClubMark club={r.club} name={r.clubName} size={22}/><span className="tl-board-who"><b>{r.name}</b><small>{r.clubName}</small></span><span className="tl-board-v tl-cards">{r.yellow?<i data-card="y" aria-label={`${r.yellow} booked`}>{r.yellow}</i>:null}{r.red?<i data-card="r" aria-label={`${r.red} sent off`}>{r.red}</i>:null}</span></li>)}</ol>:<p className="lgm-fine">A clean season so far.</p>}</section>
  </div>
  <section className="lgm-panel"><p className="lgm-kicker">The clubs</p>
   <div className="lgm-table-wrap"><table className="lgm-table tl-table tl-teamstats"><thead><tr><th scope="col">Club</th><th scope="col">GF</th><th scope="col">GA</th><th scope="col" title="Clean sheets">CS</th><th scope="col" title="Bookings">Bk</th><th scope="col" title="Sent off">Off</th><th scope="col" className="tl-wide">Home</th><th scope="col" className="tl-wide">Away</th><th scope="col" className="tl-wide">Biggest win</th></tr></thead>
    <tbody>{st.teams.map(t=><tr key={t.club} data-mine={t.mine||undefined}><th scope="row"><span className="tl-clubcell"><ClubMark club={t.club} name={t.name} size={22}/><span>{t.name}</span></span></th><td>{t.gf}</td><td>{t.ga}</td><td>{t.cleanSheets}</td><td>{t.yellows}</td><td>{t.reds}</td><td className="tl-wide">{t.home.join('-')}</td><td className="tl-wide">{t.away.join('-')}</td><td className="tl-wide">{t.biggestWin?`${t.biggestWin.gf}–${t.biggestWin.ga} v ${t.biggestWin.against}`:'—'}</td></tr>)}</tbody></table></div>
   <p className="lgm-fine">GF/GA goals for and against · CS clean sheets · Bk bookings · Off sent off · home and away as won-drawn-lost.</p>
  </section>
 </div>
}
function History({v}:{v:CareerView}){
 if(!v.history.length)return <section className="lgm-panel"><p className="lgm-kicker">Past seasons</p><p className="lgm-fine">The first season is still being written.</p></section>
 return <section className="lgm-panel"><p className="lgm-kicker">Past seasons · {v.clubName}</p>
  <ol className="tl-history">{[...v.history].reverse().map((h,i)=>{const champ=h.champion?v.clubName:i===0&&v.lastChampion?v.lastChampion:null
   return <li key={h.ordinal} data-champion={h.champion||undefined}>
    <p className="tl-history-season">Season {h.ordinal}</p>
    <p className="tl-history-place"><b>{h.champion?'Champions':ordinal(h.place)}</b><small>of {h.of}{h.playoff?' · after a play-off':''}</small></p>
    <dl><div><dt>Champions</dt><dd>{champ??'Not kept in this career’s record'}</dd></div><div><dt>Record</dt><dd>{h.w}-{h.d}-{h.l} · {h.points} pts · {h.gf}–{h.ga}</dd></div><div><dt>Top scorer</dt><dd>{h.topScorer?`${h.topScorer.name} · ${h.topScorer.goals}`:'—'}</dd></div><div><dt>Board grant</dt><dd>€{h.grant}M</dd></div></dl>
   </li>})}</ol>
 </section>
}
