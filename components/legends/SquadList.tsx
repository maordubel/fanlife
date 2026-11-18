'use client'
import {useMemo,useState} from 'react'
import type {CareerView,SquadView} from '@/lib/legends/view'
import {ROLE_SHORT} from './LegendCard'

/**
 * The squad as Championship Manager 01/02 showed it: one row a man, the columns a manager scans, a tap on a header sorts, a tap on
 * a row opens his profile. Phone: position, name, ability, average rating, status. Wider: stars, apps, goals and what he cost too.
 * Ability is his manager-ratings key average (1–20), only ever on his own men (lib/legends/fm.ts).
 */
type Col='pos'|'name'|'stars'|'key'|'rt'|'apps'|'gls'|'paid'
const ORDER:Record<string,number>={GK:0,DF:1,MF:2,FW:3}
const HEAD:[Col,string,string,boolean][]=[['pos','Pos','Position',false],['name','Name','Name',false],['stars','★','Stars',true],['key','Abl','Ability (key average, 1–20)',false],['rt','Rt','Average match rating',false],['apps','Apps','Appearances this season',true],['gls','Gls','Goals this season',true],['paid','Cost','What he cost',true]]
export function SquadList({v,open}:{v:CareerView;open:(m:SquadView)=>void}){
 const [sort,setSort]=useState<{c:Col;down:boolean}>({c:'pos',down:false})
 const xi=new Set(v.lineup.xi),bench=new Set(v.lineup.bench)
 const rows=useMemo(()=>{
  const val=(m:SquadView):number|string=>sort.c==='pos'?ORDER[m.pos]!*10+(m.role?Object.keys(ROLE_SHORT).indexOf(m.role):5):sort.c==='name'?m.name:sort.c==='stars'?m.stars:sort.c==='key'?m.fm?.ability??0:sort.c==='rt'?m.form?.avg??0:sort.c==='apps'?m.apps:sort.c==='gls'?m.goals:m.paid
  return [...v.squad].sort((a,b)=>{const x=val(a),y=val(b),d=typeof x==='string'?x.localeCompare(y as string):(x as number)-(y as number);return (sort.down?-d:d)||b.stars-a.stars})
 },[v.squad,sort])
 const tap=(c:Col)=>setSort(s=>s.c===c?{c,down:!s.down}:{c,down:c!=='pos'&&c!=='name'})
 return <div className="lgm-sql" data-testid="legends-squad-list">
  <table>
   <thead><tr>{HEAD.map(([c,l,full,wide])=><th key={c} scope="col" data-wide={wide||undefined} aria-sort={sort.c===c?(sort.down?'descending':'ascending'):'none'}><button type="button" onClick={()=>tap(c)} title={full} aria-label={`Sort by ${full}`}>{l}{sort.c===c?<i aria-hidden="true">{sort.down?'▾':'▴'}</i>:null}</button></th>)}<th scope="col"><span className="lgm-sql-vh">Status</span></th></tr></thead>
   <tbody>{rows.map(m=>{const st=m.injury?'inj':m.suspension?'ban':xi.has(m.id)?'xi':bench.has(m.id)?'sub':'out'
    return <tr key={m.id} data-st={st} data-pos={m.pos}>
     <td><span className="lgm-sql-pos">{m.role?ROLE_SHORT[m.role]:m.pos}</span></td>
     <th scope="row"><button type="button" className="lgm-sql-name" onClick={()=>open(m)} aria-label={`${m.name} — his profile`}>{m.name}</button></th>
     <td data-wide>{m.stars.toFixed(2).replace(/\.?0+$/,'')}</td>
     <td><b className="lgm-sql-key" data-band={band(m.fm?.ability)}>{m.fm?m.fm.ability.toFixed(1):'—'}</b></td>
     <td>{m.form?.avg!=null&&m.form.games?m.form.avg.toFixed(2):"—"}</td>
     <td data-wide>{m.apps}</td><td data-wide>{m.goals}</td><td data-wide>€{m.paid}M</td>
     <td><span className="lgm-sql-st" data-st={st} title={STATUS[st]}>{SHORT[st]}</span></td>
    </tr>})}</tbody>
  </table>
  <p className="lgm-fine">Abl = his manager ratings, key attributes, 1–20 · Rt = average match rating · tap a header to sort, a name for his profile.</p>
 </div>
}
const band=(x?:number)=>x==null?undefined:x>=16?'elite':x>=13?'good':x>=9?'fair':'weak'
const SHORT:Record<string,string>={xi:'XI',sub:'SUB',out:'—',inj:'INJ',ban:'BAN'}
const STATUS:Record<string,string>={xi:'In the eleven',sub:'On the bench',out:'Not in the matchday squad',inj:'Injured',ban:'Suspended'}
