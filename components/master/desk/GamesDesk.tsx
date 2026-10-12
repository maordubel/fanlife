import Link from 'next/link'
import type {ReactNode} from 'react'
import {SHARED_GATES} from '@/lib/clubs/gates'
import {deskHref} from '@/lib/master/attention'
import type {ClubSummary} from '@/lib/master/summary'

/**
 * Games (CRM 1 §5.4): every gate × every club, read from the same summaries the club workspace uses. Two facts per cell,
 * never merged: what the compiled data can play, and whether the gate is open to fans now. A cell links to the club's
 * readiness screen — the one place a gate is switched on, through the activation check. Nothing here switches anything.
 */
import {cellOf,type CellState} from '@/lib/master/crm/games'
const GLYPH:Record<CellState,string>={open:'●','ready-off':'○',partial:'◐',locked:'·','no-pack':'–'}
const LEGEND:[CellState,string][]=[['open','Open to fans'],['ready-off','Playable, not switched on'],['partial','Short rounds only'],['locked','Not enough data'],['no-pack','No compiled pack']]

export function GamesDesk({summaries,scope,gate,experiences}:{summaries:ClubSummary[];scope:string|null;gate:string|null;experiences?:ReactNode}){
 const rows=summaries.filter(s=>!scope||s.id===scope).sort((a,b)=>a.name.localeCompare(b.name))
 const focus=gate?SHARED_GATES.find(g=>g.key===gate)??null:null
 const totals=SHARED_GATES.map(g=>({g,open:rows.filter(s=>s.data?.gates.find(x=>x.key===g.key)?.openNow).length,play:rows.filter(s=>s.data?.gates.find(x=>x.key===g.key)?.dataPlayable).length}))
 return <div className="desk-content crm-games">
  <header className="desk-head"><p className="desk-kicker">Games</p><h1 className="desk-h1">Every gate, every club</h1>
   <p className="desk-fine">Each square is one gate at one club: the compiled data on one side, the switch on the other. Open a club to change what fans can enter.</p></header>
  {experiences}
  <ul className="crm-legend" aria-label="Legend">{LEGEND.map(([k,l])=><li key={k} data-cell={k}><span aria-hidden="true">{GLYPH[k]}</span>{l}</li>)}</ul>
  {focus?<section className="desk-sub" aria-labelledby="gate-focus-h"><h2 id="gate-focus-h">Gate {focus.number} · {focus.name}</h2><p className="desk-fine">{focus.requirement}</p>
   <ol className="crm-gate-list">{rows.map(s=>{const c=cellOf(s.data?.gates.find(x=>x.key===focus.key));return <li key={s.id} data-cell={c.state}><span className="crm-cell" aria-hidden="true">{GLYPH[c.state]}</span><span><b><bdi>{s.name}</bdi></b><small>{c.label}</small></span><Link className="desk-btn ghost" href={deskHref('clubs',{club:s.id,view:'readiness'})}>Readiness →</Link></li>})}</ol>
   <p className="desk-actions"><Link className="desk-btn ghost" href={deskHref('games',{club:scope||undefined})}>All gates</Link></p></section>:<>
  <div className="crm-matrix-wrap" role="region" aria-label="Gate matrix — scroll sideways for all thirteen gates" tabIndex={0}>
   <table className="crm-matrix">
    <thead><tr><th scope="col">Club</th>{SHARED_GATES.map(g=><th key={g.key} scope="col"><Link href={deskHref('games',{gate:g.key,club:scope||undefined})} title={`Gate ${g.number} · ${g.name}`}><span>{g.number}</span><small>{g.name}</small></Link></th>)}</tr></thead>
    <tbody>{rows.map(s=><tr key={s.id}><th scope="row"><Link href={deskHref('clubs',{club:s.id})} style={{['--club-primary' as string]:s.primary}}><bdi>{s.name}</bdi><small>{s.publication.label}</small></Link></th>
     {SHARED_GATES.map(g=>{const c=cellOf(s.data?.gates.find(x=>x.key===g.key));return <td key={g.key} data-cell={c.state}><Link href={deskHref('clubs',{club:s.id,view:'readiness'})} aria-label={`${s.name}, gate ${g.number} ${g.name}: ${c.label}`} title={c.label}>{GLYPH[c.state]}</Link></td>})}</tr>)}</tbody>
    <tfoot><tr><th scope="row">Open · playable</th>{totals.map(t=><td key={t.g.key}><span>{t.open}</span><small>{t.play}</small></td>)}</tr></tfoot>
   </table>
  </div>
  <ol className="crm-game-cards" aria-label="Clubs">{rows.map(s=><li key={s.id}><Link href={deskHref('clubs',{club:s.id,view:'readiness'})}><b><bdi>{s.name}</bdi></b><small>{s.publication.label} · {s.publication.openNow} open · {s.data?.dataPlayable??0}/13 playable</small>
   <span className="crm-chips" aria-hidden="true">{SHARED_GATES.map(g=>{const c=cellOf(s.data?.gates.find(x=>x.key===g.key));return <i key={g.key} data-cell={c.state}>{g.number}</i>})}</span></Link></li>)}</ol>
  </>}
 </div>
}
