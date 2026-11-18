'use client'
import {useEffect,useMemo,useState} from 'react'
import {StickerFace} from './Sticker'
import type {Slot,WingInfo} from '@/lib/album/view'

/**
 * The swaps board (owner, 18.11.2026): one album of every club means everyone holds somebody else's stickers. Put up a
 * spare and name the one you miss; take somebody's offer when you have the spare they want. Collectors appear as an
 * anonymous number, never a name. The database checks both sides and moves both stickers at once; each collector gets
 * the new one as a small packet to open and stick in.
 */
type R<T>={ok:true;data:T}|{ok:false;error:string}
export type Swap={id:string;give:string;want:string;since:string;who?:string;fits?:boolean}
export type Board={mine:Swap[];board:Swap[];done:{give:string;want:string;at:string;mine:boolean}[]}
export type SwapActions={swaps:()=>Promise<R<Board>>;swapOffer:(give:string,want:string)=>Promise<R<unknown>>;swapCancel:(id:string)=>Promise<R<unknown>>;swapAccept:(id:string)=>Promise<R<unknown>>}

function Mini({s,w}:{s:Slot|undefined;w:WingInfo|undefined}){
 if(!s||!w)return <span className="sw-mini sw-mini-none"/>
 return <span className="sw-mini"><StickerFace s={s} w={w} variant="base"/></span>
}

export function Swaps({slots,wings,actions,onDone}:{slots:Map<string,Slot>;wings:Map<string,WingInfo>;actions:SwapActions;onDone:()=>void}){
 const [b,setB]=useState<Board|null>(null),[err,setErr]=useState<string|null>(null),[busy,setBusy]=useState(false),[give,setGive]=useState(''),[want,setWant]=useState(''),[only,setOnly]=useState(true)
 const load=async()=>{const r=await actions.swaps();if(r.ok)setB(r.data);else setErr(r.error)}
 useEffect(()=>{void load()},[]) // eslint-disable-line react-hooks/exhaustive-deps -- once, on open
 const all=[...slots.values()]
 const promised=useMemo(()=>new Map((b?.mine??[]).reduce((m,x)=>m.set(x.give,(m.get(x.give)??0)+1),new Map<string,number>())),[b])
 const spares=all.filter(s=>s.copies-1-(promised.get(s.id)??0)>0)
 const missing=all.filter(s=>!s.have)
 const w=(id:string)=>wings.get(id.split(':')[0]!)
 const label=(id:string)=>{const s=slots.get(id);return s?`${s.code} ${s.name}`:id}
 const run=async(f:()=>Promise<R<unknown>>)=>{setBusy(true);setErr(null);const r=await f();setBusy(false);if(!r.ok){setErr(r.error);return false}await load();onDone();return true}
 const list=(b?.board??[]).filter(x=>!only||x.fits)
 return <section className="sw" aria-label="Swaps">
  <header className="sw-head"><h2>Swaps</h2><p>Every club is in one album, so somebody has the one you miss. Put up a spare, or take an offer.</p></header>
  {err&&<p className="alb-err" role="alert">{err}</p>}
  <form className="sw-new" onSubmit={e=>{e.preventDefault();if(give&&want)void run(()=>actions.swapOffer(give,want)).then(ok=>{if(ok){setGive('');setWant('')}})}}>
   <label><span>I give (a spare)</span><select className="min-h-tap" value={give} onChange={e=>setGive(e.target.value)} disabled={!spares.length}>
    <option value="">{spares.length?'Choose a spare':'No spares yet'}</option>{spares.map(s=><option key={s.id} value={s.id}>{s.code} · {s.name} (×{s.copies-1})</option>)}</select></label>
   <span className="sw-arrow" aria-hidden="true">⇄</span>
   <label><span>I want</span><select className="min-h-tap" value={want} onChange={e=>setWant(e.target.value)}>
    <option value="">Choose one you miss</option>{missing.map(s=><option key={s.id} value={s.id}>{s.code} · {s.name}</option>)}</select></label>
   <button type="submit" className="alb-btn min-h-tap" disabled={busy||!give||!want}>Put it on the board</button>
  </form>
  {!!b?.mine.length&&<div className="sw-block"><h3>Your offers</h3><ul className="sw-list">{b.mine.map(x=><li key={x.id} className="sw-row">
   <Mini s={slots.get(x.give)} w={w(x.give)}/><span className="sw-what"><b>You give</b> {label(x.give)}<br/><b>for</b> {label(x.want)}</span><Mini s={slots.get(x.want)} w={w(x.want)}/>
   <button type="button" className="alb-btn ghost min-h-tap" disabled={busy} onClick={()=>void run(()=>actions.swapCancel(x.id))}>Take it down</button></li>)}</ul></div>}
  <div className="sw-block">
   <h3>On the board</h3>
   <label className="sw-only"><input type="checkbox" checked={only} onChange={e=>setOnly(e.target.checked)}/> Only swaps I can make now</label>
   {!b?<p className="rk-say">Loading the board…</p>:list.length?<ul className="sw-list">{list.map(x=><li key={x.id} className="sw-row" data-fits={x.fits||undefined}>
    <Mini s={slots.get(x.give)} w={w(x.give)}/><span className="sw-what"><b>{x.who}</b> gives {label(x.give)}<br/><b>for</b> {label(x.want)}</span><Mini s={slots.get(x.want)} w={w(x.want)}/>
    {x.fits?<button type="button" className="alb-btn min-h-tap" disabled={busy} onClick={()=>void run(()=>actions.swapAccept(x.id))}>Swap</button>:<span className="sw-no">You need a spare {slots.get(x.want)?.code}</span>}
   </li>)}</ul>:<p className="rk-say">{only?'No swap fits your spares yet — put one up yourself.':'The board is empty. Be the first.'}</p>}
  </div>
  {!!b?.done.length&&<div className="sw-block"><h3>Done</h3><ul className="sw-done">{b.done.map((x,i)=><li key={i}>{x.mine?`You gave ${label(x.give)} for ${label(x.want)}`:`You got ${label(x.give)} for ${label(x.want)}`}</li>)}</ul></div>}
 </section>
}
