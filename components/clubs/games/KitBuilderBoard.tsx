'use client'
import {useRef,useState} from 'react'
import Link from 'next/link'
import {completeRun} from '@/lib/clubs/completion'
import {gradeKit} from '@/app/clubs/[slug]/[gate]/gate-actions'
import {gameCopy} from '@/lib/clubs/game-copy'
import {tr} from '@/components/clubs/rumble/shared'
import {KitPlate} from './KitPlate'
import {ShareComposer} from '@/components/share/v3/ShareComposer'
import {kitShare} from '@/lib/share/v3/adapters'
import type {UiLocale} from '@/lib/clubs/locale'
import css from '../gates/kit-builder/kit-builder.module.css'

type Item={id:string;design:string|null;colours:string[];seasons:string[];makers:string[];designs:string[]}
type Field='season'|'maker'|'design'
const EMPTY={season:'',maker:'',design:''}

export function KitBuilderBoard({items,nextHref,club,version,locale}:{items:Item[];nextHref:string;club:string;version:string;locale:UiLocale}) {
 const copy=gameCopy(locale),say=(key:string,args?:Record<string,string|number>)=>tr(copy,key,args)
 const [n,setN]=useState(0),[sel,setSel]=useState(EMPTY)
 const [res,setRes]=useState<Awaited<ReturnType<typeof gradeKit>>>(null)
 const [pending,setPending]=useState(false),[error,setError]=useState(false),[score,setScore]=useState(0)
 const inFlight=useRef(false),k=items[n]
 const right=res?[res.season,res.maker,res.design].filter(Boolean).length:0
 async function check(){
  if(!k||inFlight.current||res||!sel.season||!sel.maker||!sel.design)return
  inFlight.current=true
  setPending(true)
  setError(false)
  try{
   const result=await gradeKit(club,version,k.id,sel.season,sel.maker,sel.design)
   if(!result){setError(true);return}
   setRes(result)
   const points=[result.season,result.maker,result.design].filter(Boolean).length
   setScore(total=>total+points)
   void completeRun(club,'kit-builder',`kit-builder:${version}:${n}:${k.id}`,points)
  }catch{
   setError(true)
  }finally{
   inFlight.current=false
   setPending(false)
  }
 }

 if(!k)return <section className="game-panel mag-card" data-testid="kit-builder">
  <h2>{say('kb.rec.done')}</h2>
  <p className="mag-bowl">{say('kb.rec.score',{score,max:items.length*3})}</p>
  <Link className="mag-cta min-h-tap" href={nextHref} onClick={()=>{setN(0);setScore(0)}}>{say('kb.rec.again')}</Link>
 </section>

 const row=(field:Field,label:string,options:string[])=><fieldset className="mag-chips" key={field} disabled={pending||res!==null}>
  <legend className="mag-kicker">{label}</legend>
  {options.map(option=><button key={option} type="button" className="mag-chip min-h-tap" aria-pressed={sel[field]===option} data-answer={res?res.truth[field]===option:undefined} style={sel[field]===option?{background:'var(--mag-ink)',color:'var(--mag-paper)'}:undefined} onClick={()=>{setSel(value=>({...value,[field]:option}));setError(false)}}>
   <bdi>{option}</bdi>{res&&res.truth[field]===option&&' ✓'}
  </button>)}
 </fieldset>

 return <section className="game-panel mag-card" data-testid="kit-builder" aria-busy={pending}>
  <header className={css.recognitionHeader}>
   <p className="mag-kicker">{copy.kitSub}</p>
   <p className="mag-kicker">{say('kb.shirtN',{i:n+1,n:items.length})}</p>
  </header>
  <progress className={css.buildProgress} max={items.length} value={n+(res?1:0)} aria-label={say('kb.rec.progress')}/>
  <div className={css.recognitionShirt} role="img" aria-label={say('kb.rec.shirt')}>
   <KitPlate kit={{id:k.id,design:k.design,colours:k.colours,season:'?'}} label={false} decorative detail/>
  </div>
  {row('season',copy.kitSeason,k.seasons)}{row('maker',copy.kitMaker,k.makers)}{row('design',copy.kitDesign,k.designs)}
  {error&&<p role="alert">{say('kb.err.invalid')}</p>}
  {!res?<button className="mag-cta min-h-tap" type="button" disabled={!sel.season||!sel.maker||!sel.design||pending} onClick={()=>void check()}>{pending?say('kb.checking'):copy.kitCheck}</button>
   :<div aria-live="polite">
    <p className="mag-bowl">{right}/3 · {right===3?copy.kitRight:copy.kitWrong}</p>
    <p><bdi>{res.truth.season} · {res.truth.maker} · {res.truth.design}</bdi></p>
    <ShareComposer draft={kitShare(club,{right,forbidden:[res.truth.season,res.truth.maker,res.truth.design].filter((value):value is string=>!!value)})}/>
    <button className="mag-cta red min-h-tap" type="button" onClick={()=>{setN(n+1);setSel(EMPTY);setRes(null)}}>{n+1===items.length?say('kb.cert.see'):copy.kitNext}</button>
   </div>}
 </section>
}
