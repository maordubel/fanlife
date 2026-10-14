'use client'
import {useState,type ReactNode} from 'react'

export type SuggestCopy={kicker:string;title:string;note:string;label:string;placeholder:string;send:string;sending:string;thanks:string;again:string;tooShort:string;limit:string;failed:string;writeIn:string}
type Phase='idle'|'sending'|'done'
/**
 * "Suggest the next club" — free text to the control room. No account, nothing but the text is kept.
 * THE WEEKLY (rule 124, boards Hub-M / Hub-D): one ballot paper with a dashed tear edge — the clubs in the workshop to mark
 * (`children`, the WorkshopGrid) and, under the fold line, a club written in.
 */
export function SuggestClub({copy,children}:{copy:SuggestCopy;children?:ReactNode}){
 const [text,setText]=useState(''),[phase,setPhase]=useState<Phase>('idle'),[err,setErr]=useState<string|null>(null)
 const submit=async(e:React.FormEvent<HTMLFormElement>)=>{
  e.preventDefault()
  const t=text.trim()
  if(t.length<2){setErr(copy.tooShort);return}
  setErr(null);setPhase('sending')
  const site=(new FormData(e.currentTarget).get('site') as string)||''
  try{
   const res=await fetch('/api/suggest-club',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({text:t,site})})
   if(res.ok){setPhase('done');setText('');return}
   setErr(res.status===429?copy.limit:res.status===400?copy.tooShort:copy.failed);setPhase('idle')
  }catch{setErr(copy.failed);setPhase('idle')}
 }
 const ballot=!!children
 return <section className="wkh-say" id="suggest" aria-labelledby="suggest-h">
  <div className="wkh-sechead"><p className="wk-banner">{copy.kicker}</p><h2 className="wk-logo red wkh-title" id="suggest-h">{copy.title}</h2></div>
  <div className="wk-coupon wkh-coupon wkh-ballot-paper">
   <span className="wk-scissors" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="6" cy="7" r="3"/><circle cx="6" cy="17" r="3"/><path d="M8.5 8.5L20 18M8.5 15.5L20 6"/></svg></span>
   {children}
   <div className={`wkh-writein${ballot?' wkh-writein-fold':''}`}>
    {phase==='done'
     ?<p role="status" className="wkh-thanks"><b className="wk-head">{copy.thanks}</b> <button type="button" className="wk-btn paper min-h-tap" onClick={()=>setPhase('idle')}>{copy.again}</button></p>
     :<form className="wkh-writein-form" onSubmit={submit} noValidate>
      <div className="wkh-writein-head">{ballot&&<b className="wk-head">{copy.writeIn}</b>}<label className="wk-k wk-muted" htmlFor="suggest-in">{copy.label}</label></div>
      <input id="suggest-in" name="club" type="text" className="wkh-field min-h-tap" maxLength={80} autoComplete="off" value={text} onChange={e=>setText(e.target.value)} placeholder={copy.placeholder} aria-describedby={err?'suggest-err':'suggest-note'}/>
      <input name="site" type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{position:'absolute',insetInlineStart:'-9999px',width:1,height:1,opacity:0}}/>
      <button type="submit" className="wk-btn red block min-h-tap" disabled={phase==='sending'}>{phase==='sending'?copy.sending:copy.send}</button>
      {err&&<p id="suggest-err" role="alert" className="wkh-err">{err}</p>}
      <p id="suggest-note" className="wk-small wk-muted wkh-fine">{copy.note}</p>
     </form>}
   </div>
  </div>
 </section>
}
