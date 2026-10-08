'use client'
import {useState,useTransition} from 'react'
import {completeRun} from '@/lib/clubs/completion'
import {gradeKit} from '@/app/clubs/[slug]/[gate]/gate-actions'
import {gameCopy} from '@/lib/clubs/game-copy'
import {KitPlate} from './KitPlate'
import {ShareComposer} from '@/components/share/v3/ShareComposer'
import {kitShare} from '@/lib/share/v3/adapters'
import type {UiLocale} from '@/lib/clubs/locale'
type Item={id:string;design:string|null;colours:string[];seasonLabel:string;seasons:string[];makers:string[];designs:string[]}
export function KitBuilderBoard({items,club,version,locale}:{items:Item[];club:string;version:string;locale:UiLocale}) {
 const copy=gameCopy(locale),[n,setN]=useState(0),[sel,setSel]=useState({season:'',maker:'',design:''}),[res,setRes]=useState<Awaited<ReturnType<typeof gradeKit>>>(null),[pending,start]=useTransition()
 const k=items[n%items.length]!
 const set=(f:'season'|'maker'|'design',v:string)=>!res&&setSel(s=>({...s,[f]:v}))
 const row=(f:'season'|'maker'|'design',label:string,opts:string[])=><fieldset className="mag-chips" key={f}><legend className="mag-kicker">{label}</legend>{opts.map(o=><button key={o} type="button" className="mag-chip min-h-tap" aria-pressed={sel[f]===o} style={sel[f]===o?{background:'var(--mag-ink)',color:'var(--mag-paper)'}:undefined} onClick={()=>set(f,o)}><bdi>{o}</bdi>{res&&res.truth[f]===o&&' ✓'}</button>)}</fieldset>
 return <section className="game-panel mag-card" data-testid="kit-builder">
  <p className="mag-kicker">{copy.kitSub}</p>
  <div style={{maxWidth:280,marginInline:'auto'}}><KitPlate kit={{id:k.id,design:k.design,colours:k.colours,season:'?'}} label={false}/></div>
  {row('season',copy.kitSeason,k.seasons)}{row('maker',copy.kitMaker,k.makers)}{row('design',copy.kitDesign,k.designs)}
  {!res?<button className="mag-cta min-h-tap" type="button" disabled={!sel.season||!sel.maker||!sel.design||pending} onClick={()=>start(async()=>{const r=await gradeKit(club,version,k.id,sel.season,sel.maker,sel.design);setRes(r);if(r)completeRun(club,'kit-builder',`kit-builder:${version}:${n}:${k.id}`,[r.season,r.maker,r.design].filter(Boolean).length)})}>{copy.kitCheck}<span>→</span></button>
   :<div aria-live="polite"><p className="mag-bowl" style={{fontSize:26}}>{[res.season,res.maker,res.design].filter(Boolean).length}/3 · {res.season&&res.maker&&res.design?copy.kitRight:copy.kitWrong}</p><p><bdi>{res.truth.season} · {res.truth.maker} · {res.truth.design}</bdi></p><ShareComposer draft={kitShare(club,{right:[res.season,res.maker,res.design].filter(Boolean).length,forbidden:[res.truth.season,res.truth.maker,res.truth.design].filter((x):x is string=>!!x)})}/><button className="mag-cta red min-h-tap" type="button" onClick={()=>{setN(n+1);setSel({season:'',maker:'',design:''});setRes(null)}}>{copy.kitNext}<span>→</span></button></div>}
 </section>
}
