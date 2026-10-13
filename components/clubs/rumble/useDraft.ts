'use client'
import {useCallback,useRef,useState} from 'react'
import {rumbleDraft,rumbleLock} from '@/app/clubs/[slug]/[gate]/gate-actions'
import type {DraftView} from '@/lib/clubs/rumble-draft'
import type {DraftAction} from '@/lib/draft-core/types'

export type DraftParams={slug:string;version:string;mode:'five'|'xi';seed:number;formation?:string;rival?:string;vs?:string;duel?:string}
/**
 * The browser's half of Draft Core: it keeps only the LOG of what the fan did and the view the server answered. Every action is sent with
 * the whole log, the server replays it and refuses what is illegal, so a stale tab or a forged log cannot buy a card it was not shown.
 */
export function useDraft(params:DraftParams){
 const [log,setLog]=useState<DraftAction[]>([]),[view,setView]=useState<DraftView|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState<string|null>(null)
 const gate=useRef(false)
 const act=useCallback(async(a:DraftAction):Promise<DraftView|null>=>{
  if(gate.current)return null
  gate.current=true;setBusy(true);setError(null)
  // an open straight after an open is the same state as the second alone, so the log stays short
  const next=a.t==='open'&&log[log.length-1]?.t==='open'?[...log.slice(0,-1),a]:[...log,a]
  try{
   const r=await rumbleDraft({...params,log:next})
   if(!r.ok){setError(r.error);return null}
   setLog(next);setView(r.view);return r.view
  }catch{setError('Something went wrong — try again.');return null}
  finally{gate.current=false;setBusy(false)}
 },[log,params])
 const lock=useCallback(async()=>rumbleLock({...params,log}).catch(()=>null),[log,params])
 return {log,view,busy,error,setError,act,lock}
}
