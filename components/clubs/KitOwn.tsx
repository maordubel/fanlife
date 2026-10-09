'use client'
import {createContext,useContext,useEffect,useState} from 'react'
import {SignInPrompt} from '@/components/fanlife/collector/SignInPrompt'
import {have,shirtSignals,wantSet} from '@/lib/collector/api'
import {rememberIntent} from '@/lib/collector/pending'
import {errorLabel} from '@/lib/fanlife/collector/labels'
import type {CollectorError,ShirtSignal} from '@/lib/collector/types'

/**
 * "I have it" / "Looking for it" on a club's shirt — the closet's own two taps (lib/collector/api: worker_collector_have, worker_collector_want),
 * one line under the card. The counts the database holds for every shirt on the screen come in one batch (`KitOwnProvider`); with no database,
 * no counts are printed (rule 11) and the buttons still work as a remembered intent that signs the visitor in.
 */
export type OwnCopy={have:string;haveOn:string;want:string;wantOn:string;closet:string;market:string;saved:string;label:string}
type Ctx={signals:Record<string,ShirtSignal>;set:(slug:string,s:ShirtSignal)=>void}
const Own=createContext<Ctx>({signals:{},set:()=>{}})
export function KitOwnProvider({slugs,children}:{slugs:string[];children:React.ReactNode}){
 const [signals,setSignals]=useState<Record<string,ShirtSignal>>({})
 useEffect(()=>{
  let alive=true
  void (async()=>{for(let i=0;i<slugs.length;i+=200){const rows=await shirtSignals(slugs.slice(i,i+200));if(alive)setSignals(p=>({...p,...rows}))}})()
  return ()=>{alive=false}
 },[slugs])
 return <Own.Provider value={{signals,set:(slug,s)=>setSignals(p=>({...p,[slug]:s}))}}>{children}</Own.Provider>
}
export function KitOwnBar({slug,kitId=null,copy,compact=false}:{slug:string;kitId?:string|null;copy:OwnCopy;compact?:boolean}){
 const {signals,set}=useContext(Own),sig=signals[slug],[busy,setBusy]=useState(false),[err,setErr]=useState<CollectorError|null>(null),[ask,setAsk]=useState(false),[saved,setSaved]=useState(false)
 const youHave=sig?.youHave??false,youWant=sig?.youWant??false
 const base=():ShirtSignal=>sig??{have:0,want:0,forTrade:0,forSale:0,live:0,youHave:false,youWant:false}
 const refused=(e:CollectorError,action:'have'|'want')=>{if(e==='auth_required'||e==='off'){if(e==='auth_required')rememberIntent({slug,kitId,action});setAsk(true)}else setErr(e)}
 async function tapHave(){if(busy||youHave)return;setBusy(true);setErr(null);const r=await have(slug,kitId);setBusy(false);if(!r.ok)return refused(r.error,'have');setSaved(true);const b=base();set(slug,{...b,youHave:true,youWant:false,have:b.have+(b.youHave?0:1),want:Math.max(0,b.want-(b.youWant?1:0))})}
 async function tapWant(){if(busy||youHave)return;const on=!youWant;setBusy(true);setErr(null);const r=await wantSet(slug,on,{kitId});setBusy(false);if(!r.ok)return refused(r.error,'want');const b=base();set(slug,{...b,youWant:on,want:Math.max(0,b.want+(on?1:-1))})}
 const market=(sig?.forSale??0)+(sig?.forTrade??0)
 return <div className={`kit-own${compact?' kit-own-compact':''}`} data-testid="kit-own" role="group" aria-label={copy.label}>
  <div className="kit-own-row">
   {youHave?<a className="mag-cta red kit-own-btn min-h-tap" href={`/closet?shirt=${encodeURIComponent(slug)}`}>{copy.haveOn}</a>:<button type="button" className="mag-cta kit-own-btn min-h-tap" onClick={()=>void tapHave()} disabled={busy} aria-busy={busy}>{copy.have}</button>}
   <button type="button" className="mag-cta ghost kit-own-btn min-h-tap" onClick={()=>void tapWant()} disabled={busy||youHave} aria-pressed={youWant}>{youWant?copy.wantOn:copy.want}</button>
  </div>
  {saved&&youHave&&<p role="status" className="kit-own-note">{copy.saved} <a href={`/closet?shirt=${encodeURIComponent(slug)}`}>{copy.closet}</a></p>}
  {market>0&&<p className="kit-own-note"><a href={`/market?slug=${encodeURIComponent(slug)}`}>{copy.market.replace('{n}',String(market))}</a></p>}
  {err&&<p role="alert" className="kit-own-note kit-own-err">{errorLabel(err)}</p>}
  {ask&&<SignInPrompt next={typeof window==='undefined'?'/closet':`${window.location.pathname}${window.location.search}`} onClose={()=>setAsk(false)}/>}
 </div>
}
