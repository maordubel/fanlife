'use client'
import {useMemo,useState} from 'react'
import type {CareerView,ResultView} from '@/lib/legends/view'
import {BOARDS,boards} from '@/lib/legends/stats'
import {ClubMark} from './Kit'

/**
 * The league page (owner, 13.10.2026): the table, then the season's leader boards — golden boot, assists, clean sheets,
 * appearances, yellow and red cards — for the whole league or the manager's own club, this season and every one before it.
 * Every figure is a count of the match logs (`lib/legends/stats.ts`); nothing hidden is shown.
 */
const ordinal=(n:number)=>`${n}${n%10===1&&n!==11?'st':n%10===2&&n!==12?'nd':n%10===3&&n!==13?'rd':'th'}`
const surname=(n:string)=>{const p=n.trim().split(/\s+/);return p.length>1?p[p.length-1]!:n}

export function Table({v,rows,openClub}:{v:CareerView;rows:CareerView['table'];openClub?:(c:string)=>void}){
 return <div className="lgt-table-wrap"><table className="lgt-table"><thead><tr><th scope="col">#</th><th scope="col">Club</th><th scope="col">P</th><th scope="col" className="lgt-wide">W</th><th scope="col" className="lgt-wide">D</th><th scope="col" className="lgt-wide">L</th><th scope="col">GD</th><th scope="col">Pts</th><th scope="col" className="lgt-form-h">Form</th></tr></thead>
  <tbody>{rows.map(r=>{const i=v.table.indexOf(r);return <tr key={r.club} data-mine={r.mine||undefined}><td>{i+1}</td><th scope="row">{openClub&&!r.mine?<button type="button" className="lgt-rowbtn min-h-tap" onClick={()=>openClub(r.club)}><ClubMark club={r.club} v={v} size={22}/><span>{r.name}</span></button>:<span className="lgt-rowbtn"><ClubMark club={r.club} v={v} size={22}/><span>{r.name}</span></span>}</th><td>{r.p}</td><td className="lgt-wide">{r.w}</td><td className="lgt-wide">{r.d}</td><td className="lgt-wide">{r.l}</td><td>{r.gd>0?`+${r.gd}`:r.gd}</td><td><b>{r.pts}</b></td><td className="lgt-form">{r.form.map((x,j)=><span key={j} data-r={x}>{x}</span>)}</td></tr>})}</tbody></table></div>
}

export function Fixture({v,r,onOpen,open}:{v:CareerView;r:ResultView;onOpen?:()=>void;open?:boolean}){
 return <button type="button" className="lgt-fix min-h-tap" data-mine={r.mine||undefined} aria-expanded={onOpen?open:undefined} onClick={onOpen}>
  <span className="lgt-fix-side"><ClubMark club={r.homeClub} v={v} size={20}/><span>{r.home}</span></span>
  <b>{r.goals[0]}–{r.goals[1]}{r.pens?<small> ({r.pens[0]}–{r.pens[1]} p)</small>:null}</b>
  <span className="lgt-fix-side" data-end><span>{r.away}</span><ClubMark club={r.awayClub} v={v} size={20}/></span>
 </button>
}
function Log({r}:{r:ResultView}){
 const lines=r.log.filter(l=>l.kind!=='kickoff'&&l.kind!=='chance')
 return lines.length?<ol className="lgt-log">{lines.map((l,i)=><li key={i} data-kind={l.kind} data-mine={l.mine||undefined}><b>{l.minute}′</b> {l.text}</li>)}</ol>:<p className="lgm-fine">No goals.</p>
}

export function Leaders({v}:{v:CareerView}){
 const [season,setSeason]=useState(v.stats[0]?.season??v.season),[scope,setScope]=useState<'league'|'club'>('league')
 const s=v.stats.find(x=>x.season===season)??v.stats[0]
 const list=useMemo(()=>s?boards(s.rows,v.clubId,scope==='club'?{club:v.clubId}:{}):[],[s,scope,v.clubId])
 if(!s)return null
 return <section className="lgt-panel lgt-leaders" aria-labelledby="lgt-lead-h">
  <p className="lgm-kicker" id="lgt-lead-h">Season {s.season}{s.current?' · so far':' · final'} · the leaders</p>
  <div className="lgt-pills" role="radiogroup" aria-label="Whose numbers">
   <button type="button" role="radio" aria-checked={scope==='league'} className="min-h-tap" onClick={()=>setScope('league')}>The league</button>
   <button type="button" role="radio" aria-checked={scope==='club'} className="min-h-tap" onClick={()=>setScope('club')}><ClubMark club={v.clubId} v={v} size={18}/> {v.clubName}</button>
  </div>
  {v.stats.length>1?<div className="lgt-pills lgt-pills-seasons" role="radiogroup" aria-label="Season">{v.stats.map(x=><button key={x.season} type="button" role="radio" aria-checked={x.season===s.season} className="min-h-tap" onClick={()=>setSeason(x.season)}>Season {x.season}</button>)}</div>:null}
  <div className="lgt-boards">{list.map(b=>{const meta=BOARDS.find(x=>x.key===b.key)!
   return <article key={b.key} className="lgt-board" data-board={b.key}><h3>{b.label}</h3>
    {b.rows.length?<ol>{b.rows.map((r,i)=><li key={`${r.club}|${r.id}`} data-mine={r.mine||undefined} data-first={i===0||undefined}>
     <span className="lgt-board-rank">{i+1}</span><ClubMark club={r.club} v={v} size={18}/><span className="lgt-board-name" title={r.name}><b>{i===0?r.name:surname(r.name)}</b><small>{r.pos}</small></span><span className="lgt-board-val">{r.value}<small> {r.value===1?meta.unitOne:meta.unit}</small></span>
    </li>)}</ol>:<p className="lgm-fine">{s.rows.length?'None yet.':'Nothing played yet.'}</p>}
   </article>})}</div>
 </section>
}

export function LeaguePage({v,openClub}:{v:CareerView;openClub:(c:string)=>void}){
 const rounds=[...new Set(v.results.map(r=>r.round))].sort((a,b)=>b-a),[open,setOpen]=useState<string|null>(null),[all,setAll]=useState(false)
 const shown=all?rounds:rounds.slice(0,2)
 return <div className="lgt-league">
  <section className="lgt-panel"><p className="lgm-kicker">Season {v.season} · the table</p><Table v={v} rows={v.table} openClub={openClub}/>
   <p className="lgm-fine">Tap a club to see its squad. Points: win {v.settings.points.win}, draw {v.settings.points.draw}, loss {v.settings.points.loss}. {v.tieNote}</p></section>
  <Leaders v={v}/>
  <section className="lgt-panel"><p className="lgm-kicker">Results</p>
   {shown.length?shown.map(rd=><div key={rd} className="lgt-round"><h3>{rd>v.rounds?'Play-off':`Round ${rd}`}</h3><ul>{v.results.filter(r=>r.round===rd).map(r=><li key={r.id}><Fixture v={v} r={r} open={open===r.id} onOpen={()=>setOpen(open===r.id?null:r.id)}/>{open===r.id?<Log r={r}/>:null}</li>)}</ul></div>):<p className="lgm-fine">No round has been played yet.</p>}
   {rounds.length>2?<p className="lgm-actions"><button type="button" className="lgm-link min-h-tap" onClick={()=>setAll(!all)}>{all?'Show the last two rounds':`All ${rounds.length} rounds`}</button></p>:null}
  </section>
  {v.history.length?<section className="lgt-panel"><p className="lgm-kicker">Past seasons</p><ol className="lgt-past">{[...v.history].reverse().map(h=><li key={h.ordinal} data-champion={h.champion||undefined}><b>Season {h.ordinal}</b><span>{h.champion?'Champions':`${ordinal(h.place)} of ${h.of}`} · {h.points} pts · {h.w}-{h.d}-{h.l}</span></li>)}</ol><p className="lgm-fine">Pick a season above to read its leader boards.</p></section>:null}
 </div>
}
