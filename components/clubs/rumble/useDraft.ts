'use client'
import {useCallback,useEffect,useRef,useState} from 'react'
import {rumbleDraft,rumbleLock} from '@/app/clubs/[slug]/[gate]/gate-actions'
import type {DraftView} from '@/lib/clubs/rumble-draft'
import type {DraftAction,Group} from '@/lib/draft-core/types'

export type DraftParams={slug:string;version:string;mode:'five'|'xi';seed:number;formation?:string;rival?:string;vs?:string;duel?:string}
/** the places in the order the shape lists them; the machine always has the next free one on the table */
export type SlotOrder=readonly {id:string;group:Group}[]
/** the group of the first place still empty that can be opened, else any group that can */
export function autoGroup(view:DraftView,order:SlotOrder):Group|null{
 const open=new Set(view.groups.filter(g=>g.open).map(g=>g.group)),filled=new Set(view.picks.map(p=>p.slotId))
 return order.find(sl=>!filled.has(sl.id)&&open.has(sl.group))?.group??view.groups.find(g=>g.open)?.group??null
}
/**
 * The browser's half of Draft Core: it keeps only the LOG of what the fan did and the view the server answered. Every action is sent with
 * the whole log, the server replays it and refuses what is illegal, so a stale tab or a forged log cannot buy a card it was not shown.
 */
export function useDraft(params:DraftParams,order?:SlotOrder){
 const [log,setLog]=useState<DraftAction[]>([]),[view,setView]=useState<DraftView|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState<string|null>(null)
 const gate=useRef(false),started=useRef(false)
 const act=useCallback(async(a:DraftAction):Promise<DraftView|null>=>{
  if(gate.current)return null
  gate.current=true;setBusy(true);setError(null)
  // an open straight after an open is the same state as the second alone, so the log stays short
  const next=a.t==='open'&&log[log.length-1]?.t==='open'?[...log.slice(0,-1),a]:[...log,a]
  try{
   const r=await rumbleDraft({...params,log:next})
   if(!r.ok){setError(r.error);return null}
   // a slot is never left empty: after a pick (and at the start) the next free place is opened by itself; the fan may still tap another group
   let done=next,shown=r.view
   const g=order&&!shown.active&&!shown.complete&&a.t==='pick'?autoGroup(shown,order):null
   if(g){const more=[...next,{t:'open',g} as DraftAction],r2=await rumbleDraft({...params,log:more});if(r2.ok){done=more;shown=r2.view}}
   setLog(done);setView(shown);return shown
  }catch{setError('Something went wrong — try again.');return null}
  finally{gate.current=false;setBusy(false)}
 },[log,params])
 useEffect(()=>{if(!order||started.current)return;started.current=true;void act({t:'open',g:order[0]?.group??'GK'})},[])
 const lock=useCallback(async()=>rumbleLock({...params,log}).catch(()=>null),[log,params])
 return {log,view,busy,error,setError,act,lock}
}
