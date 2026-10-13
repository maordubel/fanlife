'use client'
import {useState} from 'react'

export type SuggestCopy={kicker:string;title:string;note:string;label:string;placeholder:string;send:string;sending:string;thanks:string;again:string;tooShort:string;limit:string;failed:string}
type Phase='idle'|'sending'|'done'
/** "Suggest the next club" — free text to the control room. No account, nothing but the text is kept. */
export function SuggestClub({copy}:{copy:SuggestCopy}){
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
 return <section className="mag-section mag-suggest" id="suggest" aria-labelledby="suggest-h">
  <p className="mag-kicker">{copy.kicker}</p>
  <h2 className="mag-h2" id="suggest-h">{copy.title}</h2>
  <p>{copy.note}</p>
  {phase==='done'
   ?<p role="status" className="mag-suggest-thanks"><b>{copy.thanks}</b> <button type="button" className="mag-cta min-h-tap" onClick={()=>setPhase('idle')}>{copy.again}</button></p>
   :<form className="mag-suggest-form" onSubmit={submit} noValidate>
    <label htmlFor="suggest-in">{copy.label}</label>
    <div className="mag-suggest-row">
     <input id="suggest-in" name="club" type="text" className="min-h-tap" maxLength={80} autoComplete="off" value={text} onChange={e=>setText(e.target.value)} placeholder={copy.placeholder} aria-describedby={err?'suggest-err':undefined}/>
     <input name="site" type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{position:'absolute',insetInlineStart:'-9999px',width:1,height:1,opacity:0}}/>
     <button type="submit" className="mag-cta red min-h-tap" disabled={phase==='sending'}>{phase==='sending'?copy.sending:copy.send}</button>
    </div>
    {err&&<p id="suggest-err" role="alert" className="mag-fine">{err}</p>}
   </form>}
 </section>
}
