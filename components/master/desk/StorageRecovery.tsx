'use client'
import {useState} from 'react'
import {useRouter} from 'next/navigation'

/**
 * Reliability plan P0 (owner, 12.10.2026): while control data is still only in Vercel Blob and Blob is not answering, saves are
 * refused rather than built on a seed. Two honest ways out, both the owner's: ask Blob again now, or retire Blob on purpose.
 */
export function StorageRecovery({pending,blobRetired}:{pending:string|null;blobRetired:boolean}){
 const router=useRouter()
 const [busy,setBusy]=useState(false),[msg,setMsg]=useState<string|null>(null),[confirm,setConfirm]=useState('')
 if(blobRetired&&!pending)return <section className="desk-sub" id="migration" aria-labelledby="mig-h"><h2 id="mig-h">Move to Supabase</h2><p className="desk-fine" role="status">Done: Vercel Blob is retired. Supabase is the only store.</p></section>
 async function run(action:'retry-blob'|'retire-blob'){
  setBusy(true);setMsg(null)
  try{const r=await fetch(`/api/master/storage/${action}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(action==='retire-blob'?{confirm}:{})});const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||'Could not save');setMsg(action==='retry-blob'?'Blob will be asked on the next read.':'Saved on server: Blob is retired.');router.refresh()}
  catch(e){setMsg(e instanceof Error?e.message:'Could not save')}finally{setBusy(false)}
 }
 return <section className="desk-sub" id="migration" aria-labelledby="mig-h">
  <h2 id="mig-h">Move to Supabase</h2>
  {pending
   ?<p role="alert" className="desk-state" data-state="error"><b>Not copied yet: {pending}.</b> It is still only in Vercel Blob, which is not answering (its monthly limit). Pages run on the published lineup; saves that need it are refused — nothing is overwritten.</p>
   :<p className="desk-fine">Files Supabase does not hold yet are copied from Vercel Blob the first time Blob answers.</p>}
  <p className="desk-actions">
   <button type="button" className="desk-btn ghost min-h-tap" disabled={busy} onClick={()=>run('retry-blob')}>Ask Blob again</button>
  </p>
  <details>
   <summary>Retire Blob (only if its data is no longer needed)</summary>
   <p className="desk-fine">After this, a file missing in Supabase is treated as missing and the control room starts from the published lineup. Edits that exist only in Blob will not be copied. Type RETIRE to confirm.</p>
   <p className="desk-actions"><input aria-label="Type RETIRE to confirm" value={confirm} onChange={e=>setConfirm(e.target.value)}/><button type="button" className="desk-btn min-h-tap" disabled={busy||confirm!=='RETIRE'} onClick={()=>run('retire-blob')}>Retire Blob</button></p>
  </details>
  {msg&&<p role="status" className="desk-fine">{msg}</p>}
 </section>
}
